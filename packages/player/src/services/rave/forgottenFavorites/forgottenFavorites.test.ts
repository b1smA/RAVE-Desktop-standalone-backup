import type { Track } from '@nuclearplayer/model';
import type { FavoriteEntry } from '@nuclearplayer/plugin-sdk';

import type { HistoryEntry } from '../../tauri/bindings';
import { selectForgottenFavorites } from './forgottenFavorites';

const track = (id: string): Track => ({
  title: id,
  artists: [{ name: 'Artist', roles: ['primary'] }],
  source: { provider: 'test', id },
});

const favorite = (id: string): FavoriteEntry<Track> => ({
  ref: track(id),
  addedAtIso: '2026-01-01T00:00:00.000Z',
});

const play = (id: string, startedAt: number): HistoryEntry => ({
  playId: id,
  title: id,
  artists: ['Artist'],
  albumTitle: null,
  durationMs: 180_000,
  artworkUrl: null,
  provider: 'test',
  providerId: id,
  startedAt,
  msPlayed: 180_000,
  endReason: 'finished',
  endPositionMs: 180_000,
});

describe('forgotten favorites', () => {
  it('keeps never-played and stale favorites but excludes recently played tracks', () => {
    const now = new Date('2026-11-18T00:00:00.000Z');
    const result = selectForgottenFavorites(
      [favorite('never'), favorite('stale'), favorite('recent')],
      [
        play('stale', Date.parse('2026-08-01T00:00:00.000Z')),
        play('recent', Date.parse('2026-11-17T00:00:00.000Z')),
      ],
      now,
    );

    expect(result.map((item) => item.title)).toEqual(['never', 'stale']);
  });
});
