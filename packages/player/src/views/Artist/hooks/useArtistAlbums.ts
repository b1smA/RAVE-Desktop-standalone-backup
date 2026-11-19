import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { Album, AlbumRef } from '@nuclearplayer/model';
import type { MetadataProvider } from '@nuclearplayer/plugin-sdk';

import { metadataHost } from '../../../services/metadataHost';
import { providersHost } from '../../../services/providersHost';
import { needsReleaseClassificationMetrics } from '../../../services/releaseClassification';

const RELEASE_DETAILS_CONCURRENCY = 4;
const ALBUM_DETAILS_STALE_TIME_MS = 10 * 60 * 1000;

const addClassificationMetrics = (
  release: AlbumRef,
  details: Album,
): AlbumRef => {
  const tracks = details.tracks;
  if (!tracks) {
    return release;
  }

  const durations = tracks.map((track) => track.durationMs);
  const hasCompleteDurations = durations.every(
    (duration): duration is number => duration !== undefined,
  );

  return {
    ...release,
    trackCount: tracks.length,
    totalDurationMs: hasCompleteDurations
      ? durations.reduce((total, duration) => total + duration, 0)
      : release.totalDurationMs,
    longestTrackDurationMs: hasCompleteDurations
      ? Math.max(0, ...durations)
      : release.longestTrackDurationMs,
  };
};

export const useArtistAlbums = (providerId: string, artistId: string) => {
  const queryClient = useQueryClient();

  return useQuery<AlbumRef[]>({
    queryKey: ['artist-albums', providerId, artistId],
    queryFn: async () => {
      const releases = await metadataHost.fetchArtistAlbums(
        artistId,
        providerId,
      );
      const provider = providersHost.get<MetadataProvider>(
        providerId,
        'metadata',
      );
      if (!provider?.albumMetadataCapabilities?.includes('albumDetails')) {
        return releases;
      }

      const enrichedReleases = [...releases];
      const releaseIndexes = releases
        .map((release, index) => ({ release, index }))
        .filter(({ release }) => needsReleaseClassificationMetrics(release));
      let nextReleaseIndex = 0;
      const workerCount = Math.min(
        RELEASE_DETAILS_CONCURRENCY,
        releaseIndexes.length,
      );

      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (nextReleaseIndex < releaseIndexes.length) {
            const currentIndex = nextReleaseIndex;
            nextReleaseIndex += 1;
            const { release, index } = releaseIndexes[currentIndex];
            try {
              const details = await queryClient.fetchQuery({
                queryKey: [
                  'album-details',
                  release.source.provider || providerId,
                  release.source.id,
                ],
                queryFn: () =>
                  metadataHost.fetchAlbumDetails(
                    release.source.id,
                    release.source.provider || providerId,
                  ),
                staleTime: ALBUM_DETAILS_STALE_TIME_MS,
              });
              enrichedReleases[index] = addClassificationMetrics(
                release,
                details,
              );
            } catch {
              enrichedReleases[index] = release;
            }
          }
        }),
      );

      return enrichedReleases;
    },
    enabled: Boolean(providerId && artistId),
  });
};
