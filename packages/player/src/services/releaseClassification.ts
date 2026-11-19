import type { AlbumRef } from '@nuclearplayer/model';

export type ReleaseFormat = 'single' | 'ep' | 'album';

const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const MAX_SINGLE_TRACKS = 3;
const MAX_EP_TRACKS = 6;
const COMPILATION_TITLE_PATTERN =
  /\b(?:anthology|best of|collection|compilation|greatest hits|original soundtrack|soundtrack|various artists)\b/i;

export const needsReleaseClassificationMetrics = (
  release: Pick<
    AlbumRef,
    'releaseType' | 'trackCount' | 'totalDurationMs' | 'longestTrackDurationMs'
  >,
): boolean => {
  if (release.releaseType === 'compilation' || release.releaseType === 'live') {
    return false;
  }

  const { trackCount, totalDurationMs, longestTrackDurationMs } = release;
  if (trackCount === undefined || trackCount < 1) {
    return true;
  }
  if (trackCount > MAX_EP_TRACKS) {
    return false;
  }
  if (totalDurationMs === undefined) {
    return true;
  }
  if (totalDurationMs > THIRTY_MINUTES_MS || trackCount > MAX_SINGLE_TRACKS) {
    return false;
  }
  return longestTrackDurationMs === undefined;
};

export const classifyReleaseFormat = (
  release: Pick<
    AlbumRef,
    'releaseType' | 'trackCount' | 'totalDurationMs' | 'longestTrackDurationMs'
  >,
): ReleaseFormat => {
  const { trackCount, totalDurationMs, longestTrackDurationMs } = release;

  if (
    (totalDurationMs !== undefined && totalDurationMs > THIRTY_MINUTES_MS) ||
    (trackCount !== undefined && trackCount >= MAX_EP_TRACKS + 1)
  ) {
    return 'album';
  }

  if (trackCount !== undefined && trackCount > MAX_SINGLE_TRACKS) {
    return 'ep';
  }

  if (trackCount !== undefined && trackCount >= 1) {
    if (
      trackCount <= MAX_SINGLE_TRACKS &&
      (longestTrackDurationMs ?? 0) >= TEN_MINUTES_MS
    ) {
      return 'ep';
    }
    return 'single';
  }

  if (release.releaseType === 'single' || release.releaseType === 'ep') {
    return release.releaseType;
  }

  return 'album';
};

export const isCompilationRelease = (
  release: Pick<
    AlbumRef,
    'artists' | 'releaseType' | 'title' | 'trackReleaseYears'
  >,
): boolean => {
  const releaseYears = new Set(release.trackReleaseYears ?? []);
  return (
    release.releaseType === 'compilation' ||
    (release.artists?.length ?? 0) > 3 ||
    releaseYears.size > 1 ||
    COMPILATION_TITLE_PATTERN.test(release.title)
  );
};
