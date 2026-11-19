import type { StreamCandidate, Track } from '@nuclearplayer/model';
import type {
  StreamingHost,
  StreamingProvider,
} from '@nuclearplayer/plugin-sdk';

import { getSetting, useSettingsStore } from '../stores/settingsStore';
import { errorMessage } from '../utils/errorMessage';
import { Logger } from './logger';
import { providersHost } from './providersHost';
import { providerPerformanceTracker } from './rave/smartSource/providerPerformanceTracker';
import { rankCandidates } from './rave/smartSource/smartSourceRanker';
import {
  getSmartSourcePreferences,
  isSmartSourceSelectionEnabled,
} from './rave/smartSource/smartSourceSettings';

const getActiveStreamingProvider = (): StreamingProvider | undefined =>
  providersHost.get<StreamingProvider>(
    providersHost.getActive('streaming'),
    'streaming',
  );

const getStreamingProvidersActiveFirst = (): StreamingProvider[] => {
  const activeProviderId = providersHost.getActive('streaming');
  return providersHost
    .list<StreamingProvider['kind']>('streaming')
    .sort((left, right) => {
      if (left.id === activeProviderId) {
        return -1;
      }
      if (right.id === activeProviderId) {
        return 1;
      }
      return 0;
    }) as StreamingProvider[];
};

const candidateKey = (candidate: StreamCandidate): string =>
  `${candidate.source.provider}:${candidate.id}`;

export const hasActiveStreamingProvider = (): boolean =>
  Boolean(getActiveStreamingProvider());

export const isStreamExpired = (candidate: StreamCandidate): boolean => {
  if (!candidate.lastResolvedAtIso) {
    return false;
  }

  const expiryMs = getSetting('playback.streamExpiryMs') as number;
  const resolvedAt = new Date(candidate.lastResolvedAtIso).getTime();

  return Date.now() - resolvedAt > expiryMs;
};

export const hasFreshStream = (candidate: StreamCandidate): boolean =>
  Boolean(candidate.stream) &&
  Boolean(candidate.lastResolvedAtIso) &&
  !isStreamExpired(candidate);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs = 500,
): Promise<T> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw new Error('Unreachable');
};

export const createStreamingHost = (): StreamingHost => ({
  resolveCandidatesForTrack: async (track: Track) => {
    const providers = getStreamingProvidersActiveFirst();

    if (providers.length === 0) {
      Logger.streaming.warn('No streaming provider available');
      return {
        success: false,
        error: 'No streaming provider available',
      };
    }

    const searches = await Promise.all(
      providers.map(async (provider) => {
        const startedAt = performance.now();
        try {
          const candidates = provider.searchForTrackV2
            ? await provider.searchForTrackV2(track)
            : await provider.searchForTrack(
                track.artists[0]?.name ?? 'Unknown Artist',
                track.title,
                track.album?.title,
              );
          providerPerformanceTracker.record(
            provider.id,
            performance.now() - startedAt,
            true,
          );
          return { provider, candidates, error: undefined };
        } catch (error) {
          providerPerformanceTracker.record(
            provider.id,
            performance.now() - startedAt,
            false,
          );
          Logger.streaming.warn(
            `Candidate search failed for ${provider.name}: ${errorMessage(error)}`,
          );
          return { provider, candidates: [], error };
        }
      }),
    );
    const errors = searches.flatMap(({ error }) =>
      error === undefined ? [] : [errorMessage(error)],
    );

    if (errors.length === providers.length) {
      return {
        success: false,
        error: `Failed to resolve candidates: ${errors.join('; ')}`,
      };
    }

    const seenCandidates = new Set<string>();
    const candidates = searches.flatMap(({ provider, candidates }) =>
      candidates
        .map((candidate) => ({
          ...candidate,
          source: { ...candidate.source, provider: provider.id },
        }))
        .filter((candidate) => {
          const key = candidateKey(candidate);
          if (seenCandidates.has(key)) {
            return false;
          }
          seenCandidates.add(key);
          return true;
        }),
    );

    if (!isSmartSourceSelectionEnabled()) {
      return { success: true, candidates };
    }

    const ranked = rankCandidates(
      track,
      candidates,
      getSmartSourcePreferences(providersHost.getActive('streaming'), track),
      providerPerformanceTracker.snapshot(),
    );
    const best = ranked[0];
    if (best) {
      Logger.streaming.info(
        `Smart source selected ${best.candidate.source.provider}:${best.candidate.id} score=${best.total.toFixed(3)} title=${best.titleMatch.toFixed(2)} duration=${best.durationMatch.toFixed(2)} quality=${best.quality.toFixed(2)} speed=${best.speed.toFixed(2)} reliability=${best.reliability.toFixed(2)} preference=${best.preference.toFixed(2)}`,
      );
    }
    return {
      success: true,
      candidates: ranked.map(({ candidate }) => candidate),
    };
  },

  resolveStreamForCandidate: async (candidate: StreamCandidate) => {
    const provider =
      providersHost.get<StreamingProvider>(
        candidate.source.provider,
        'streaming',
      ) ?? getActiveStreamingProvider();

    if (!provider) {
      Logger.streaming.warn('No provider for stream resolution');
      return undefined;
    }

    if (candidate.failed) {
      Logger.streaming.warn('Candidate already marked as failed');
      return candidate;
    }

    if (hasFreshStream(candidate)) {
      return candidate;
    }

    const retries =
      (useSettingsStore
        .getState()
        .getValue('playback.streamResolutionRetries') as number) ?? 3;

    const startedAt = performance.now();
    try {
      // Temporarily provide both methods to avoid breaking existing providers until we have autoupdate for plugins
      const stream = await withRetry(
        () =>
          provider.getStreamUrlV2
            ? provider.getStreamUrlV2(candidate)
            : provider.getStreamUrl(candidate.id),
        retries,
      );

      providerPerformanceTracker.record(
        provider.id,
        performance.now() - startedAt,
        true,
      );
      return {
        ...candidate,
        stream,
        lastResolvedAtIso: new Date().toISOString(),
        failed: false,
      };
    } catch (error) {
      providerPerformanceTracker.record(
        provider.id,
        performance.now() - startedAt,
        false,
      );
      Logger.streaming.warn(
        `Stream resolution failed for ${provider.name}: ${errorMessage(error)}`,
      );
      return {
        ...candidate,
        failed: true,
        stream: undefined,
      };
    }
  },
});

export const streamingHost = createStreamingHost();
