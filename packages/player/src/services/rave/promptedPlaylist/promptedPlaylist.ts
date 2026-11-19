import type { Track } from '@nuclearplayer/model';

import type { TrackMood, TrackProfile } from '../../../stores/raveLibraryStore';
import { trackIdentity } from '../trackIdentity';

export type PromptedPlaylistRules = {
  mood?: TrackMood;
  offlineOnly: boolean;
  yearFrom?: number;
  yearTo?: number;
  targetDurationMinutes?: number;
  excludedArtists: string[];
};

const MOOD_TERMS: Record<TrackMood, string[]> = {
  focus: ['focus', 'work', 'фокус', 'работ'],
  calm: ['calm', 'relax', 'спокой', 'расслаб'],
  energy: ['energy', 'energetic', 'энерг'],
  sleep: ['sleep', 'сон', 'засып'],
  party: ['party', 'вечерин'],
};

const findMood = (text: string): TrackMood | undefined =>
  (Object.entries(MOOD_TERMS) as [TrackMood, string[]][]).find(([, terms]) =>
    terms.some((term) => text.includes(term)),
  )?.[0];

export const parsePromptedPlaylist = (
  prompt: string,
): PromptedPlaylistRules => {
  const text = prompt.trim().toLocaleLowerCase();
  const yearRange = text.match(
    /(?:с|from)\s+(19\d{2}|20\d{2})\s+(?:по|to|[-–])\s+(19\d{2}|20\d{2})/,
  );
  const minutes = text.match(/(?:на|for)\s+(\d{1,3})\s*(?:мин|minutes?)/);
  const excluded = text.match(/(?:без|without)\s+([^,;.]+)/)?.[1]?.trim();

  return {
    mood: findMood(text),
    offlineOnly: text.includes('offline') || text.includes('офлайн'),
    yearFrom: yearRange ? Number(yearRange[1]) : undefined,
    yearTo: yearRange ? Number(yearRange[2]) : undefined,
    targetDurationMinutes: /(?:на|for)\s+(?:час|an? hour)/.test(text)
      ? 60
      : minutes
        ? Number(minutes[1])
        : undefined,
    excludedArtists: excluded ? [excluded] : [],
  };
};

export const applyPromptedPlaylistRules = (
  tracks: Track[],
  profiles: Record<string, TrackProfile>,
  rules: PromptedPlaylistRules,
): Track[] => {
  const filtered = tracks.filter((track) => {
    if (rules.offlineOnly && !track.localFile) {
      return false;
    }
    const profile = profiles[trackIdentity(track)] ?? {};
    if (rules.mood && profile.mood !== rules.mood) {
      return false;
    }
    const year = track.album?.releaseDate
      ? new Date(track.album.releaseDate.dateIso).getUTCFullYear()
      : undefined;
    if (rules.yearFrom && (!year || year < rules.yearFrom)) {
      return false;
    }
    if (rules.yearTo && (!year || year > rules.yearTo)) {
      return false;
    }
    const artists = track.artists.map((artist) =>
      artist.name.toLocaleLowerCase(),
    );
    return !rules.excludedArtists.some((excluded) =>
      artists.some((artist) => artist.includes(excluded)),
    );
  });

  if (!rules.targetDurationMinutes) {
    return filtered;
  }
  const targetMs = rules.targetDurationMinutes * 60_000;
  let durationMs = 0;
  return filtered.filter((track) => {
    if (durationMs >= targetMs) {
      return false;
    }
    durationMs += track.durationMs ?? 0;
    return true;
  });
};
