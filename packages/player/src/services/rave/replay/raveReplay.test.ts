import type { HistoryEntry } from '../../tauri/bindings';
import { buildReplayTracks } from './raveReplay';

const entry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  playId: 'play',
  title: 'Track',
  artists: ['Artist'],
  albumTitle: null,
  durationMs: 100_000,
  artworkUrl: null,
  provider: 'provider',
  providerId: 'track',
  startedAt: 0,
  msPlayed: 100_000,
  endReason: 'finished',
  endPositionMs: 100_000,
  ...overrides,
});

describe('RAVE Replay', () => {
  it('ranks frequently completed tracks first', () => {
    const tracks = buildReplayTracks([
      entry({ title: 'Other', providerId: 'other' }),
      entry(),
      entry({ playId: 'again' }),
    ]);
    expect(tracks[0].title).toBe('Track');
  });

  it('excludes heavily skipped tracks and entries without a source', () => {
    expect(
      buildReplayTracks([
        entry({ msPlayed: 10_000, endReason: 'skipped' }),
        entry({ provider: null }),
      ]),
    ).toEqual([]);
  });
});
