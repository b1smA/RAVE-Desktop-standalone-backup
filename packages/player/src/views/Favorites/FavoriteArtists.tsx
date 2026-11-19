import { useNavigate } from '@tanstack/react-router';
import { User } from 'lucide-react';
import { type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Card, CardGrid, EmptyState, ViewShell } from '@nuclearplayer/ui';

import { useFavoritesStore } from '../../stores/favoritesStore';
import { FavoriteSortSelect } from './FavoriteSortSelect';
import { useFavoriteSort } from './useFavoriteSort';

const getArtistName = (artist: { name: string }) => artist.name;

export const FavoriteArtists: FC = () => {
  const { t } = useTranslation('favorites');
  const navigate = useNavigate();
  const artists = useFavoritesStore((state) => state.artists);

  const sorting = useFavoriteSort(artists, getArtistName);

  return (
    <ViewShell data-testid="favorite-artists-view" title={t('artists.title')}>
      {sorting.sortedEntries.length === 0 ? (
        <EmptyState
          icon={<User size={48} />}
          title={t('artists.empty')}
          description={t('artists.emptyDescription')}
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
                title={entry.ref.name}
                src={pickArtwork(entry.ref.artwork, 'cover', 300)?.url}
                onClick={() =>
                  navigate({
                    to: `/artist/${entry.ref.source.provider}/${entry.ref.source.id}`,
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
