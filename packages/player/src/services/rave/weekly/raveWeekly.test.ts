import type { HistoryEntry } from '../../tauri/bindings';
import { buildWeeklyReport } from './raveWeekly';

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  playId: crypto.randomUUID(),
  title: 'Track',
  artists: ['Artist'],
  albumTitle: null,
  durationMs: 180_000,
  artworkUrl: null,
  provider: 'test',
  providerId: 'track',
  startedAt: Date.parse('2026-11-17T12:00:00.000Z'),
  msPlayed: 180_000,
  endReason: 'finished',
  endPositionMs: 180_000,
  ...overrides,
});

describe('RAVE Weekly', () => {
  it('summarizes the rolling seven-day listening window', () => {
    const report = buildWeeklyReport(
      [
        entry({ artists: ['Top Artist'], msPlayed: 240_000 }),
        entry({ artists: ['Top Artist'], providerId: 'second' }),
        entry({ artists: ['New Artist'], providerId: 'new' }),
        entry({
          artists: ['Known Artist'],
          startedAt: Date.parse('2026-10-01T12:00:00.000Z'),
        }),
      ],
      new Date('2026-11-18T12:00:00.000Z'),
    );

    expect(report.listenCount).toBe(3);
    expect(report.minutesListened).toBe(10);
    expect(report.topArtist).toBe('Top Artist');
    expect(report.newArtists).toBe(2);
  });
});
