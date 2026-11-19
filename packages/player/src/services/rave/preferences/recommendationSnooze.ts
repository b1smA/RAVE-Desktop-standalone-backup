import type { Track } from '@nuclearplayer/model';

import { useRaveLibraryStore } from '../../../stores/raveLibraryStore';

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecommendationSnoozeDays = 7 | 30 | 90;

export const isRecommendationSnoozed = (
  track: Track,
  now = new Date(),
): boolean => {
  const snoozedUntilIso = useRaveLibraryStore
    .getState()
    .getTrackProfile(track).snoozedUntilIso;
  if (!snoozedUntilIso) {
    return false;
  }
  const snoozedUntil = new Date(snoozedUntilIso).getTime();
  return Number.isFinite(snoozedUntil) && snoozedUntil > now.getTime();
};

export const snoozeRecommendations = (
  track: Track,
  days: RecommendationSnoozeDays,
  now = new Date(),
): Promise<void> =>
  useRaveLibraryStore.getState().updateTrackProfile(track, {
    snoozedUntilIso: new Date(now.getTime() + days * DAY_MS).toISOString(),
  });

export const clearRecommendationSnooze = (track: Track): Promise<void> =>
  useRaveLibraryStore.getState().updateTrackProfile(track, {
    snoozedUntilIso: undefined,
  });
