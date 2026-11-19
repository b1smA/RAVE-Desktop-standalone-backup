import type { ProviderPerformance } from './smartSourceRanker';

const LATENCY_SMOOTHING_FACTOR = 0.25;

const updateAverage = (
  currentAverage: number | undefined,
  sample: number,
): number =>
  currentAverage === undefined
    ? sample
    : currentAverage * (1 - LATENCY_SMOOTHING_FACTOR) +
      sample * LATENCY_SMOOTHING_FACTOR;

export class ProviderPerformanceTracker {
  private readonly performance = new Map<string, ProviderPerformance>();

  record(providerId: string, latencyMs: number, success: boolean): void {
    const current = this.performance.get(providerId) ?? {
      attempts: 0,
      successes: 0,
    };
    this.performance.set(providerId, {
      attempts: current.attempts + 1,
      successes: current.successes + Number(success),
      averageLatencyMs: updateAverage(current.averageLatencyMs, latencyMs),
    });
  }

  snapshot(): ReadonlyMap<string, ProviderPerformance> {
    return new Map(this.performance);
  }

  clear(): void {
    this.performance.clear();
  }
}

export const providerPerformanceTracker = new ProviderPerformanceTracker();
