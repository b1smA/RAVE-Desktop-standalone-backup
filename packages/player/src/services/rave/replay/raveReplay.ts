import type { Track } from '@nuclearplayer/model';

import type { HistoryEntry } from '../../tauri/bindings';

type ReplayTrack = {
  track: Track;
  score: number;
};

const MAX_REPLAY_TRACKS = 50;
const MINIMUM_COMPLETION = 0.35;

export const buildReplayTracks = (
  entries: HistoryEntry[],
  limit = MAX_REPLAY_TRACKS,
): Track[] => {
  const byTrack = new Map<string, ReplayTrack>();

  for (const entry of entries) {
    if (!entry.provider || !entry.providerId) {
      continue;
    }
    const completion = entry.durationMs
      ? Math.min(1, entry.msPlayed / entry.durationMs)
      : entry.endReason === 'finished'
        ? 1
        : 0.5;
    if (completion < MINIMUM_COMPLETION) {
      continue;
    }
    const key = `${entry.provider}:${entry.providerId}`;
    const existing = byTrack.get(key);
    const score = completion + (entry.endReason === 'finished' ? 0.5 : 0);
    if (existing) {
      existing.score += score;
      continue;
    }
    byTrack.set(key, {
      score,
      track: {
        title: entry.title,
        artists: entry.artists.map((name) => ({ name, roles: ['primary'] })),
        album: entry.albumTitle
          ? {
              title: entry.albumTitle,
              source: { provider: entry.provider, id: entry.providerId },
            }
          : undefined,
        durationMs: entry.durationMs ?? undefined,
        artwork: entry.artworkUrl
          ? { items: [{ url: entry.artworkUrl, purpose: 'cover' }] }
          : undefined,
        source: { provider: entry.provider, id: entry.providerId },
      },
    });
  }

  return [...byTrack.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ track }) => track);
};
