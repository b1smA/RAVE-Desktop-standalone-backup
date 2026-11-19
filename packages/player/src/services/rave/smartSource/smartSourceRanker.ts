import type { StreamCandidate, Track } from '@nuclearplayer/model';

const MIN_BITRATE_KBPS = 64;
const MAX_BITRATE_KBPS = 320;
const MAX_ACCEPTABLE_DURATION_DIFFERENCE_MS = 15_000;
const MAX_LATENCY_MS = 5_000;
const DEFAULT_RELIABILITY = 0.85;
const RELIABILITY_PRIOR_WEIGHT = 4;
const EXACT_TITLE_SCORE = 1;
const PARTIAL_TITLE_SCORE = 0.55;
const MISMATCHED_TITLE_SCORE = 0;
const RESOLVED_STREAM_BONUS = 0.08;
const UNWANTED_VERSION_PENALTY = 0.35;
const FAILED_CANDIDATE_PENALTY = 1;
const PREVIEW_STREAM_PENALTY = 1;
const USER_REJECTED_CANDIDATE_PENALTY = 2;
const USER_REJECTED_VERSION_PENALTY = 0.75;

const UNWANTED_VERSION_MARKERS = [
  'cover',
  'instrumental',
  'karaoke',
  'live',
  'nightcore',
  'remix',
  'slowed',
  'sped up',
  'tribute',
];

export type ProviderPerformance = {
  attempts: number;
  successes: number;
  averageLatencyMs?: number;
};

export type SmartSourcePreferences = {
  qualityWeight: number;
  speedWeight: number;
  preferredProviderIds: string[];
  activeProviderId?: string;
  rejectedCandidateKeys?: string[];
  rejectedVersionMarkers?: string[];
  autoSkipRejectedVersions?: boolean;
  maxBitrateKbps?: number;
};

export type CandidateScore = {
  candidate: StreamCandidate;
  total: number;
  availability: number;
  titleMatch: number;
  durationMatch: number;
  quality: number;
  speed: number;
  reliability: number;
  preference: number;
  unwantedVersionPenalty: number;
  previewStreamPenalty: number;
  userFeedbackPenalty: number;
};

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeText = (value: string): string =>
  value
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const scoreTitle = (track: Track, candidate: StreamCandidate): number => {
  const expectedTitle = normalizeText(track.title);
  const candidateTitle = normalizeText(candidate.title);

  if (candidateTitle === expectedTitle) {
    return EXACT_TITLE_SCORE;
  }
  if (
    candidateTitle.includes(expectedTitle) ||
    expectedTitle.includes(candidateTitle)
  ) {
    return PARTIAL_TITLE_SCORE;
  }
  return MISMATCHED_TITLE_SCORE;
};

const scoreDuration = (track: Track, candidate: StreamCandidate): number => {
  if (!track.durationMs || !candidate.durationMs) {
    return 0.5;
  }

  const differenceMs = Math.abs(track.durationMs - candidate.durationMs);
  return clamp(1 - differenceMs / MAX_ACCEPTABLE_DURATION_DIFFERENCE_MS);
};

const scoreQuality = (candidate: StreamCandidate): number => {
  const bitrateKbps = candidate.stream?.bitrateKbps;
  if (bitrateKbps !== undefined) {
    return clamp(
      (bitrateKbps - MIN_BITRATE_KBPS) / (MAX_BITRATE_KBPS - MIN_BITRATE_KBPS),
    );
  }

  const qualityLabel = candidate.stream?.qualityLabel?.toLocaleLowerCase();
  if (qualityLabel?.includes('lossless')) {
    return 1;
  }
  if (qualityLabel?.includes('high')) {
    return 0.8;
  }
  if (qualityLabel?.includes('medium')) {
    return 0.55;
  }
  if (qualityLabel?.includes('low')) {
    return 0.25;
  }
  return 0.5;
};

const scoreReliability = (
  performance: ProviderPerformance | undefined,
): number => {
  if (!performance || performance.attempts === 0) {
    return DEFAULT_RELIABILITY;
  }

  return (
    (performance.successes + DEFAULT_RELIABILITY * RELIABILITY_PRIOR_WEIGHT) /
    (performance.attempts + RELIABILITY_PRIOR_WEIGHT)
  );
};

const scoreSpeed = (performance: ProviderPerformance | undefined): number => {
  if (performance?.averageLatencyMs === undefined) {
    return 0.5;
  }
  return clamp(1 - performance.averageLatencyMs / MAX_LATENCY_MS);
};

const scorePreference = (
  providerId: string,
  preferences: SmartSourcePreferences,
): number => {
  const preferredIndex = preferences.preferredProviderIds.indexOf(providerId);
  if (preferredIndex >= 0) {
    return 1 - preferredIndex / (preferences.preferredProviderIds.length + 1);
  }
  return providerId === preferences.activeProviderId ? 0.6 : 0;
};

const getUnwantedVersionPenalty = (
  track: Track,
  candidate: StreamCandidate,
): number => {
  const expectedTitle = normalizeText(track.title);
  const candidateTitle = normalizeText(candidate.title);
  return UNWANTED_VERSION_MARKERS.some(
    (marker) =>
      candidateTitle.includes(marker) && !expectedTitle.includes(marker),
  )
    ? UNWANTED_VERSION_PENALTY
    : 0;
};

const getPreviewStreamPenalty = (candidate: StreamCandidate): number => {
  const streamUrl = candidate.stream?.url.toLocaleLowerCase();
  return streamUrl?.includes('/preview/') || streamUrl?.includes('preview.')
    ? PREVIEW_STREAM_PENALTY
    : 0;
};

const getUserFeedbackPenalty = (
  candidate: StreamCandidate,
  preferences: SmartSourcePreferences,
): number => {
  const candidateKey = `${candidate.source.provider}:${candidate.id}`;
  if (preferences.rejectedCandidateKeys?.includes(candidateKey)) {
    return USER_REJECTED_CANDIDATE_PENALTY;
  }
  const title = normalizeText(candidate.title);
  return preferences.rejectedVersionMarkers?.some((marker) =>
    title.includes(marker),
  )
    ? USER_REJECTED_VERSION_PENALTY
    : 0;
};

export const scoreCandidate = (
  track: Track,
  candidate: StreamCandidate,
  preferences: SmartSourcePreferences,
  performance: ProviderPerformance | undefined,
): CandidateScore => {
  const titleMatch = scoreTitle(track, candidate);
  const availability = candidate.failed ? 0 : 1;
  const durationMatch = scoreDuration(track, candidate);
  const quality = scoreQuality(candidate);
  const speed = scoreSpeed(performance);
  const reliability = scoreReliability(performance);
  const preference = scorePreference(candidate.source.provider, preferences);
  const unwantedVersionPenalty = getUnwantedVersionPenalty(track, candidate);
  const previewStreamPenalty = getPreviewStreamPenalty(candidate);
  const userFeedbackPenalty = getUserFeedbackPenalty(candidate, preferences);
  const qualityWeight = clamp(preferences.qualityWeight);
  const speedWeight = clamp(preferences.speedWeight);
  const total =
    availability * 0.1 +
    titleMatch * 0.25 +
    durationMatch * 0.2 +
    quality * 0.2 * qualityWeight +
    speed * 0.1 * speedWeight +
    reliability * 0.15 +
    preference * 0.05 +
    (candidate.stream ? RESOLVED_STREAM_BONUS : 0) -
    unwantedVersionPenalty -
    previewStreamPenalty -
    userFeedbackPenalty -
    (candidate.failed ? FAILED_CANDIDATE_PENALTY : 0);

  return {
    candidate,
    total,
    availability,
    titleMatch,
    durationMatch,
    quality,
    speed,
    reliability,
    preference,
    unwantedVersionPenalty,
    previewStreamPenalty,
    userFeedbackPenalty,
  };
};

export const rankCandidates = (
  track: Track,
  candidates: StreamCandidate[],
  preferences: SmartSourcePreferences,
  performanceByProvider: ReadonlyMap<string, ProviderPerformance>,
): CandidateScore[] => {
  const acceptableCandidates = candidates.filter((candidate) => {
    const candidateTitle = normalizeText(candidate.title);
    const expectedTitle = normalizeText(track.title);
    return !preferences.rejectedVersionMarkers?.some(
      (marker) =>
        candidateTitle.includes(marker) && !expectedTitle.includes(marker),
    );
  });
  const candidatesToRank =
    preferences.autoSkipRejectedVersions && acceptableCandidates.length > 0
      ? acceptableCandidates
      : candidates;
  const withinBitrateLimit = candidatesToRank.filter(
    (candidate) =>
      candidate.stream?.bitrateKbps === undefined ||
      preferences.maxBitrateKbps === undefined ||
      candidate.stream.bitrateKbps <= preferences.maxBitrateKbps,
  );
  const bitrateCandidates =
    preferences.maxBitrateKbps !== undefined && withinBitrateLimit.length > 0
      ? withinBitrateLimit
      : candidatesToRank;

  return bitrateCandidates
    .map((candidate) =>
      scoreCandidate(
        track,
        candidate,
        preferences,
        performanceByProvider.get(candidate.source.provider),
      ),
    )
    .sort((left, right) => right.total - left.total);
};
