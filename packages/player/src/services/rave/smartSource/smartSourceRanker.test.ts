import { describe, expect, it } from 'vitest';

import type { StreamCandidate, Track } from '@nuclearplayer/model';

import { rankCandidates, scoreCandidate } from './smartSourceRanker';

const track: Track = {
  title: 'Midnight City',
  artists: [{ name: 'M83', roles: [] }],
  durationMs: 244_000,
  source: { provider: 'metadata', id: 'track' },
};

const candidate = (
  id: string,
  overrides: Partial<StreamCandidate> = {},
): StreamCandidate => ({
  id,
  title: 'Midnight City',
  durationMs: 244_000,
  failed: false,
  source: { provider: 'youtube', id },
  ...overrides,
});

const preferences = {
  qualityWeight: 1,
  speedWeight: 1,
  preferredProviderIds: [],
};

describe('smartSourceRanker', () => {
  it('prefers the candidate with matching duration', () => {
    const ranked = rankCandidates(
      track,
      [candidate('wrong', { durationMs: 300_000 }), candidate('right')],
      preferences,
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('right');
  });

  it('always ranks an available candidate above a failed candidate', () => {
    const ranked = rankCandidates(
      track,
      [candidate('failed', { failed: true }), candidate('available')],
      preferences,
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('available');
    expect(ranked[1].availability).toBe(0);
  });

  it('penalizes unwanted alternate versions', () => {
    const ranked = rankCandidates(
      track,
      [candidate('live', { title: 'Midnight City Live' }), candidate('studio')],
      preferences,
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('studio');
    expect(ranked[1].unwantedVersionPenalty).toBeGreaterThan(0);
  });

  it('never prefers a candidate rejected by the user', () => {
    const ranked = rankCandidates(
      track,
      [candidate('rejected'), candidate('alternative')],
      {
        ...preferences,
        rejectedCandidateKeys: ['youtube:rejected'],
      },
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('alternative');
    expect(ranked[1].userFeedbackPenalty).toBeGreaterThan(0);
  });

  it('automatically removes rejected version types when an alternative exists', () => {
    const ranked = rankCandidates(
      track,
      [candidate('live', { title: 'Midnight City Live' }), candidate('studio')],
      {
        ...preferences,
        autoSkipRejectedVersions: true,
        rejectedVersionMarkers: ['live'],
      },
      new Map(),
    );

    expect(ranked.map(({ candidate: entry }) => entry.id)).toEqual(['studio']);
  });

  it('keeps a rejected version type when it is the only playable option', () => {
    const ranked = rankCandidates(
      track,
      [candidate('live', { title: 'Midnight City Live' })],
      {
        ...preferences,
        autoSkipRejectedVersions: true,
        rejectedVersionMarkers: ['live'],
      },
      new Map(),
    );

    expect(ranked).toHaveLength(1);
  });

  it('does not penalize a version requested by the track title', () => {
    const liveTrack = { ...track, title: 'Midnight City Live' };
    const score = scoreCandidate(
      liveTrack,
      candidate('live', { title: 'Midnight City Live' }),
      preferences,
      undefined,
    );

    expect(score.unwantedVersionPenalty).toBe(0);
  });

  it('penalizes a stream URL explicitly marked as a preview', () => {
    const score = scoreCandidate(
      track,
      candidate('preview', {
        stream: {
          url: 'https://example.com/preview/hls/playlist.m3u8',
          protocol: 'hls',
          source: { provider: 'soundcloud', id: 'preview' },
        },
      }),
      preferences,
      undefined,
    );

    expect(score.previewStreamPenalty).toBe(1);
  });

  it('prefers higher bitrate when quality matters', () => {
    const ranked = rankCandidates(
      track,
      [
        candidate('low', {
          stream: {
            url: 'https://example.com/low',
            protocol: 'https',
            bitrateKbps: 96,
            source: { provider: 'youtube', id: 'low' },
          },
        }),
        candidate('high', {
          stream: {
            url: 'https://example.com/high',
            protocol: 'https',
            bitrateKbps: 320,
            source: { provider: 'youtube', id: 'high' },
          },
        }),
      ],
      preferences,
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('high');
  });

  it('excludes streams above the data saver bitrate when a lower option exists', () => {
    const ranked = rankCandidates(
      track,
      [
        candidate('low', {
          stream: {
            url: 'https://example.com/low',
            protocol: 'https',
            bitrateKbps: 96,
            source: { provider: 'youtube', id: 'low' },
          },
        }),
        candidate('high', {
          stream: {
            url: 'https://example.com/high',
            protocol: 'https',
            bitrateKbps: 320,
            source: { provider: 'youtube', id: 'high' },
          },
        }),
      ],
      { ...preferences, maxBitrateKbps: 128 },
      new Map(),
    );

    expect(ranked.map(({ candidate: entry }) => entry.id)).toEqual(['low']);
  });

  it('uses provider speed and reliability history', () => {
    const ranked = rankCandidates(
      track,
      [
        candidate('slow', {
          source: { provider: 'slow', id: 'slow' },
        }),
        candidate('fast', {
          source: { provider: 'fast', id: 'fast' },
        }),
      ],
      preferences,
      new Map([
        ['slow', { attempts: 10, successes: 4, averageLatencyMs: 4_500 }],
        ['fast', { attempts: 10, successes: 10, averageLatencyMs: 100 }],
      ]),
    );

    expect(ranked[0].candidate.id).toBe('fast');
  });

  it('respects the preferred provider order', () => {
    const ranked = rankCandidates(
      track,
      [
        candidate('youtube'),
        candidate('preferred', {
          source: { provider: 'soundcloud', id: 'preferred' },
        }),
      ],
      { ...preferences, preferredProviderIds: ['soundcloud', 'youtube'] },
      new Map(),
    );

    expect(ranked[0].candidate.id).toBe('preferred');
  });
});
