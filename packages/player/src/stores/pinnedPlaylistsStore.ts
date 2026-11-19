import { LazyStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';

import { Logger } from '../services/logger';
import { errorMessage } from '../utils/errorMessage';

const store = new LazyStore('rave-pinned-playlists.json');
const PINNED_IDS_KEY = 'pinnedIds';

type PinnedPlaylistsStore = {
  pinnedIds: string[];
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (playlistId: string) => Promise<void>;
};

export const usePinnedPlaylistsStore = create<PinnedPlaylistsStore>(
  (set, get) => ({
    pinnedIds: [],
    loaded: false,
    load: async () => {
      try {
        const pinnedIds = (await store.get<string[]>(PINNED_IDS_KEY)) ?? [];
        set({ pinnedIds: Array.from(new Set(pinnedIds)), loaded: true });
      } catch (error) {
        set({ loaded: true });
        Logger.playlists.error(
          `Failed to load pinned playlists: ${errorMessage(error)}`,
        );
      }
    },
    toggle: async (playlistId) => {
      const current = get().pinnedIds;
      const pinnedIds = current.includes(playlistId)
        ? current.filter((id) => id !== playlistId)
        : [...current, playlistId];
      set({ pinnedIds });
      try {
        await store.set(PINNED_IDS_KEY, pinnedIds);
        await store.save();
      } catch (error) {
        set({ pinnedIds: current });
        Logger.playlists.error(
          `Failed to save pinned playlists: ${errorMessage(error)}`,
        );
      }
    },
  }),
);

export const initializePinnedPlaylistsStore = (): Promise<void> =>
  usePinnedPlaylistsStore.getState().load();
