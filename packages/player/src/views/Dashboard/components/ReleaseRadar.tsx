import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';
import { useCallback } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork, type AlbumRef } from '@nuclearplayer/model';
import type { AttributedResult } from '@nuclearplayer/plugin-sdk';
import type { CardsRowItem } from '@nuclearplayer/ui';

import { fetchReleaseRadar } from '../../../services/rave/releaseRadar/releaseRadar';
import { useFavoritesStore } from '../../../stores/favoritesStore';
import { useNavigateToEntity } from '../hooks/useNavigateToEntity';
import { DashboardCardsWidget } from './DashboardCardsWidget';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const ReleaseRadar: FC = () => {
  const { t } = useTranslation('dashboard');
  const artists = useFavoritesStore((state) => state.artists);
  const navigateToEntity = useNavigateToEntity();
  const { data, isLoading } = useQuery({
    queryKey: [
      'rave',
      'release-radar',
      artists.map((entry) => entry.ref.source.id),
    ],
    queryFn: () => fetchReleaseRadar(artists.map((entry) => entry.ref)),
    enabled: artists.length > 0,
    staleTime: REFRESH_INTERVAL_MS,
  });
  const mapRelease = useCallback(
    (album: AlbumRef, result: AttributedResult<AlbumRef>): CardsRowItem => ({
      id: `${result.providerId}-${album.source.id}`,
      title: album.title,
      subtitle: album.releaseDate?.dateIso,
      imageUrl: pickArtwork(album.artwork, 'thumbnail', 300)?.url,
      onClick: () =>
        navigateToEntity(
          { name: album.title, sourceId: album.source.id },
          result,
          'album',
        ),
    }),
    [navigateToEntity],
  );

  return (
    <DashboardCardsWidget
      data-testid="rave-release-radar"
      results={data}
      isLoading={isLoading && artists.length > 0}
      title={t('releaseRadar')}
      labels={{
        filterPlaceholder: t('filter-releases'),
        nothingFound: t('nothing-found'),
      }}
      mapItem={mapRelease}
    />
  );
};
