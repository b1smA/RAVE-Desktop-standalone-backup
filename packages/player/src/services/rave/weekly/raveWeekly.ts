import type { HistoryEntry } from '../../tauri/bindings';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeeklyReport = {
  listenCount: number;
  minutesListened: number;
  uniqueTracks: number;
  uniqueArtists: number;
  newArtists: number;
  topArtist?: string;
};

const normalize = (value: string): string => value.trim().toLocaleLowerCase();

export const buildWeeklyReport = (
  entries: HistoryEntry[],
  now = new Date(),
): WeeklyReport => {
  const cutoff = now.getTime() - WEEK_MS;
  const weekly = entries.filter(
    (entry) => entry.startedAt >= cutoff && entry.startedAt <= now.getTime(),
  );
  const earlierArtists = new Set(
    entries
      .filter((entry) => entry.startedAt < cutoff)
      .flatMap((entry) => entry.artists.map(normalize)),
  );
  const artistCounts = new Map<string, { name: string; count: number }>();
  weekly.forEach((entry) => {
    entry.artists.forEach((artist) => {
      const key = normalize(artist);
      const previous = artistCounts.get(key);
      artistCounts.set(key, {
        name: artist,
        count: (previous?.count ?? 0) + 1,
      });
    });
  });
  const topArtist = [...artistCounts.values()].sort(
    (left, right) => right.count - left.count,
  )[0]?.name;
  const uniqueTracks = new Set(
    weekly.map(
      (entry) => `${entry.provider}:${entry.providerId}:${entry.title}`,
    ),
  ).size;

  return {
    listenCount: weekly.length,
    minutesListened: Math.round(
      weekly.reduce((total, entry) => total + entry.msPlayed, 0) / 60_000,
    ),
    uniqueTracks,
    uniqueArtists: artistCounts.size,
    newArtists: [...artistCounts.keys()].filter(
      (artist) => !earlierArtists.has(artist),
    ).length,
    topArtist,
  };
};
