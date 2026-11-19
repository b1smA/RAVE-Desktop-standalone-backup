import type { Track } from '@nuclearplayer/model';

import { trackContentIdentity } from '../trackIdentity';

export type RaveMixMode = 'focus' | 'balanced' | 'explore' | 'energy';

const VARIETY_BY_MODE: Record<RaveMixMode, number> = {
  focus: 0.15,
  balanced: 0.5,
  explore: 0.85,
  energy: 0.65,
};

export const varietyForMixMode = (mode: RaveMixMode, fallback: number) =>
  mode === 'balanced' ? fallback : VARIETY_BY_MODE[mode];

export const rankTracksForTaste = (
  tracks: Track[],
  artistTaste: Record<string, number>,
  mode: RaveMixMode,
): Track[] => {
  if (mode !== 'focus' && mode !== 'explore') {
    return tracks;
  }
  const direction = mode === 'focus' ? -1 : 1;
  const scores = new Map(
    tracks.map((track) => [
      track,
      track.artists.reduce(
        (total, artist) =>
          total + (artistTaste[artist.name.trim().toLocaleLowerCase()] ?? 0),
        0,
      ),
    ]),
  );
  return [...tracks].sort(
    (left, right) =>
      ((scores.get(left) ?? 0) - (scores.get(right) ?? 0)) * direction,
  );
};

export const selectMixTracks = (
  recommendations: Track[],
  context: Track[],
  limit: number,
  isBlocked: (track: Track) => boolean = () => false,
): Track[] => {
  const knownTracks = new Set(context.map(trackContentIdentity));
  const artistCounts = new Map<string, number>();
  const selected: Track[] = [];

  for (const track of recommendations) {
    const key = trackContentIdentity(track);
    const artist = track.artists[0]?.name.toLocaleLowerCase() ?? '';
    if (
      isBlocked(track) ||
      knownTracks.has(key) ||
      (artistCounts.get(artist) ?? 0) >= 2
    ) {
      continue;
    }
    knownTracks.add(key);
    artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    selected.push(track);
    if (selected.length === limit) {
      break;
    }
  }

  return selected;
};
