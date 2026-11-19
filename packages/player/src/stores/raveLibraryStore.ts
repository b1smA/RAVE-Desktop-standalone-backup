import { LazyStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';

import type { Track } from '@nuclearplayer/model';
import { stripResolutionState } from '@nuclearplayer/model';

import { trackIdentity } from '../services/rave/trackIdentity';

const store = new LazyStore('rave-library.json');

export type TrackMood = 'focus' | 'calm' | 'energy' | 'sleep' | 'party';

export type TrackProfile = {
  mood?: TrackMood;
  tags?: string[];
  note?: string;
  blocked?: boolean;
  snoozedUntilIso?: string;
  excludedFromTaste?: boolean;
};

type TasteProfile = {
  artists: Record<string, number>;
  moods: Partial<Record<TrackMood, number>>;
};

type RaveLibraryState = {
  listenLater: Track[];
  trackProfiles: Record<string, TrackProfile>;
  taste: TasteProfile;
  loaded: boolean;
  loadFromDisk: () => Promise<void>;
  addToListenLater: (track: Track) => Promise<void>;
  clearListenLater: () => Promise<void>;
  updateTrackProfile: (
    track: Track,
    profile: Partial<TrackProfile>,
  ) => Promise<void>;
  getTrackProfile: (track: Track) => TrackProfile;
  recordTaste: (track: Track) => Promise<void>;
};

const persistValue = async (key: string, value: unknown): Promise<void> => {
  await store.set(key, value);
  await store.save();
};

export const useRaveLibraryStore = create<RaveLibraryState>((set, get) => ({
  listenLater: [],
  trackProfiles: {},
  taste: { artists: {}, moods: {} },
  loaded: false,

  loadFromDisk: async () => {
    set({
      listenLater: (await store.get<Track[]>('listenLater')) ?? [],
      trackProfiles:
        (await store.get<Record<string, TrackProfile>>('trackProfiles')) ?? {},
      taste: (await store.get<TasteProfile>('taste')) ?? {
        artists: {},
        moods: {},
      },
      loaded: true,
    });
  },

  addToListenLater: async (track) => {
    const key = trackIdentity(track);
    if (get().listenLater.some((entry) => trackIdentity(entry) === key)) {
      return;
    }
    set({ listenLater: [...get().listenLater, stripResolutionState(track)] });
    await persistValue('listenLater', get().listenLater);
  },

  clearListenLater: async () => {
    set({ listenLater: [] });
    await persistValue('listenLater', get().listenLater);
  },

  updateTrackProfile: async (track, updates) => {
    const key = trackIdentity(track);
    set({
      trackProfiles: {
        ...get().trackProfiles,
        [key]: { ...get().trackProfiles[key], ...updates },
      },
    });
    await persistValue('trackProfiles', get().trackProfiles);
  },

  getTrackProfile: (track) => get().trackProfiles[trackIdentity(track)] ?? {},

  recordTaste: async (track) => {
    if (get().getTrackProfile(track).excludedFromTaste === true) {
      return;
    }
    const artists = { ...get().taste.artists };
    track.artists.forEach((artist) => {
      const key = artist.name.trim().toLocaleLowerCase();
      artists[key] = (artists[key] ?? 0) + 1;
    });
    const moods = { ...get().taste.moods };
    const mood = get().getTrackProfile(track).mood;
    if (mood) {
      moods[mood] = (moods[mood] ?? 0) + 1;
    }
    set({ taste: { artists, moods } });
    await persistValue('taste', get().taste);
  },
}));

export const initializeRaveLibraryStore = (): Promise<void> =>
  useRaveLibraryStore.getState().loadFromDisk();
