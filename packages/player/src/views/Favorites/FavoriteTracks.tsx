import { Music } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { EmptyState, FilterChips, ViewShell } from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import {
  filterLibraryTracks,
  SmartLibraryFilter,
} from '../../services/rave/libraryFilters/smartLibraryFilters';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useRaveLibraryStore } from '../../stores/raveLibraryStore';
import { FavoriteSortSelect } from './FavoriteSortSelect';
import { useFavoriteSort } from './useFavoriteSort';

const getTrackName = (track: { title: string }) => track.title;

export const FavoriteTracks: FC = () => {
  const { t } = useTranslation('favorites');
  const favorites = useFavoritesStore((state) => state.tracks);
  const profiles = useRaveLibraryStore((state) => state.trackProfiles);
  const [filter, setFilter] = useState<SmartLibraryFilter>('all');

  const sorting = useFavoriteSort(favorites, getTrackName);
  const sortedTracks = sorting.sortedEntries.map((entry) => entry.ref);
  const filterItems = useMemo(() => {
    const moods = new Set(
      Object.values(profiles).flatMap((profile) =>
        profile.mood ? [profile.mood] : [],
      ),
    );
    const tags = new Set(
      Object.values(profiles).flatMap((profile) => profile.tags ?? []),
    );
    return [
      { id: 'all', label: t('filters.all') },
      { id: 'offline', label: t('filters.offline') },
      { id: 'untagged', label: t('filters.untagged') },
      ...[...moods].map((mood) => ({
        id: `mood:${mood}`,
        label: t(`filters.mood.${mood}`),
      })),
      ...[...tags].map((tag) => ({
        id: `tag:${tag.toLocaleLowerCase()}`,
        label: tag,
      })),
    ];
  }, [profiles, t]);
  const visibleTracks = filterLibraryTracks(sortedTracks, profiles, filter);

  const hasDuration = visibleTracks.some((track) => track.durationMs != null);

  return (
    <ViewShell data-testid="favorite-tracks-view" title={t('tracks.title')}>
      {sortedTracks.length === 0 ? (
        <EmptyState
          icon={<Music size={48} />}
          title={t('tracks.empty')}
          description={t('tracks.emptyDescription')}
          className="flex-1"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <FavoriteSortSelect
            sortBy={sorting.sortBy}
            onSortByChange={sorting.setSortBy}
            sortDirection={sorting.sortDirection}
            onToggleSortDirection={sorting.toggleSortDirection}
          />
          <FilterChips
            className="mb-3"
            items={filterItems}
            selected={filter}
            onChange={(value) => setFilter(value as SmartLibraryFilter)}
          />
          <ConnectedTrackTable
            tracks={visibleTracks}
            features={{
              header: true,
              filterable: true,
              sortable: true,
              selectable: true,
              playAll: true,
              addAllToQueue: true,
            }}
            display={{
              displayThumbnail: true,
              displayArtist: true,
              displayDuration: hasDuration,
              displayQueueControls: true,
            }}
          />
        </div>
      )}
    </ViewShell>
  );
};
