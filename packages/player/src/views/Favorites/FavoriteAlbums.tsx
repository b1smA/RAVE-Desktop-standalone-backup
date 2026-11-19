import { useNavigate } from '@tanstack/react-router';
import { Disc3 } from 'lucide-react';
import { type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Card, CardGrid, EmptyState, ViewShell } from '@nuclearplayer/ui';

import { useFavoritesStore } from '../../stores/favoritesStore';
import { FavoriteSortSelect } from './FavoriteSortSelect';
import { useFavoriteSort } from './useFavoriteSort';

const getAlbumName = (album: { title: string }) => album.title;

export const FavoriteAlbums: FC = () => {
  const { t } = useTranslation('favorites');
  const navigate = useNavigate();
  const albums = useFavoritesStore((state) => state.albums);

  const sorting = useFavoriteSort(albums, getAlbumName);

  return (
    <ViewShell data-testid="favorite-albums-view" title={t('albums.title')}>
      {sorting.sortedEntries.length === 0 ? (
        <EmptyState
          icon={<Disc3 size={48} />}
          title={t('albums.empty')}
          description={t('albums.emptyDescription')}
          className="flex-1"
        />
      ) : (
        <div>
          <FavoriteSortSelect
            sortBy={sorting.sortBy}
            onSortByChange={sorting.setSortBy}
            sortDirection={sorting.sortDirection}
            onToggleSortDirection={sorting.toggleSortDirection}
          />
          <CardGrid>
            {sorting.sortedEntries.map((entry) => (
              <Card
                key={`${entry.ref.source.provider}-${entry.ref.source.id}`}
                title={entry.ref.title}
                src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
                onClick={() =>
                  navigate({
                    to: `/album/${entry.ref.source.provider}/${entry.ref.source.id}`,
                  })
                }
              />
            ))}
          </CardGrid>
        </div>
      )}
    </ViewShell>
  );
};
