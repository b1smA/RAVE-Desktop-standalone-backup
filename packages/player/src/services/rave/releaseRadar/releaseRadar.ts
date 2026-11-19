import type { AlbumRef, ArtistRef } from '@nuclearplayer/model';
import type { AttributedResult } from '@nuclearplayer/plugin-sdk';

import { metadataHost } from '../../metadataHost';
import { providersHost } from '../../providersHost';

const PAST_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const FUTURE_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

export const filterRecentReleases = (
  albums: AlbumRef[],
  now = new Date(),
): AlbumRef[] => {
  const seen = new Set<string>();
  return albums
    .filter((album) => {
      if (!album.releaseDate) {
        return false;
      }
      const releaseAt = new Date(album.releaseDate.dateIso).getTime();
      return (
        Number.isFinite(releaseAt) &&
        releaseAt >= now.getTime() - PAST_WINDOW_MS &&
        releaseAt <= now.getTime() + FUTURE_WINDOW_MS
      );
    })
    .filter((album) => {
      const key = `${album.source.provider}:${album.source.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        new Date(right.releaseDate!.dateIso).getTime() -
        new Date(left.releaseDate!.dateIso).getTime(),
    );
};

export const fetchReleaseRadar = async (
  artists: ArtistRef[],
): Promise<AttributedResult<AlbumRef>[]> => {
  const settled = await Promise.allSettled(
    artists.map(async (artist) => ({
      providerId: artist.source.provider,
      albums: await metadataHost.fetchArtistAlbums(
        artist.source.id,
        artist.source.provider,
      ),
    })),
  );
  const grouped = new Map<string, AlbumRef[]>();
  settled.forEach((result) => {
    if (result.status !== 'fulfilled') {
      return;
    }
    grouped.set(result.value.providerId, [
      ...(grouped.get(result.value.providerId) ?? []),
      ...result.value.albums,
    ]);
  });

  return [...grouped.entries()].flatMap(([providerId, albums]) => {
    const items = filterRecentReleases(albums);
    if (items.length === 0) {
      return [];
    }
    return [
      {
        providerId: `rave-release-radar-${providerId}`,
        metadataProviderId: providerId,
        providerName:
          providersHost.get(providerId, 'metadata')?.name ?? providerId,
        items,
      },
    ];
  });
};
