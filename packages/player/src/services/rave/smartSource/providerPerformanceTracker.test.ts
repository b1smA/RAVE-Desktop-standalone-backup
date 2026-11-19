import { describe, expect, it } from 'vitest';

import { ProviderPerformanceTracker } from './providerPerformanceTracker';

describe('ProviderPerformanceTracker', () => {
  it('tracks attempts, successes, and smoothed latency', () => {
    const tracker = new ProviderPerformanceTracker();

    tracker.record('provider', 100, true);
    tracker.record('provider', 500, false);

    expect(tracker.snapshot().get('provider')).toEqual({
      attempts: 2,
      successes: 1,
      averageLatencyMs: 200,
    });
  });

  it('returns an isolated snapshot', () => {
    const tracker = new ProviderPerformanceTracker();
    tracker.record('provider', 100, true);

    const snapshot = tracker.snapshot() as Map<string, unknown>;
    snapshot.clear();

    expect(tracker.snapshot().has('provider')).toBe(true);
  });
});
