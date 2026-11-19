import type { Track } from '@nuclearplayer/model';
import type { FavoriteEntry } from '@nuclearplayer/plugin-sdk';

import type { HistoryEntry } from '../../tauri/bindings';

const FORGOTTEN_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const NEW_FAVORITE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

const keyForTrack = (track: Track): string =>
  `${track.source.provider}:${track.source.id}`;

const keyForEntry = (entry: HistoryEntry): string =>
  `${entry.provider ?? ''}:${entry.providerId ?? ''}`;

export const selectForgottenFavorites = (
  favorites: FavoriteEntry<Track>[],
  history: HistoryEntry[],
  now = new Date(),
): Track[] => {
  const lastPlayed = new Map<string, number>();
  history.forEach((entry) => {
    const key = keyForEntry(entry);
    lastPlayed.set(key, Math.max(lastPlayed.get(key) ?? 0, entry.startedAt));
  });

  return favorites
    .filter((favorite) => {
      const playedAt = lastPlayed.get(keyForTrack(favorite.ref));
      if (playedAt !== undefined) {
        return now.getTime() - playedAt >= FORGOTTEN_AFTER_MS;
      }
      return (
        now.getTime() - new Date(favorite.addedAtIso).getTime() >=
        NEW_FAVORITE_GRACE_MS
      );
    })
    .sort((left, right) => {
      const leftPlayed = lastPlayed.get(keyForTrack(left.ref)) ?? 0;
      const rightPlayed = lastPlayed.get(keyForTrack(right.ref)) ?? 0;
      return leftPlayed - rightPlayed;
    })
    .map((favorite) => favorite.ref);
};
