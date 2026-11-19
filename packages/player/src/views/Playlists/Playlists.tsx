import { useNavigate } from '@tanstack/react-router';
import isEmpty from 'lodash-es/isEmpty';
import { ListMusic, SearchX } from 'lucide-react';
import { useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { EmptyState, ScrollableArea, ViewShell } from '@nuclearplayer/ui';

import { usePinnedPlaylistsStore } from '../../stores/pinnedPlaylistsStore';
import { usePlaylistStore } from '../../stores/playlistStore';
import { CreatePlaylistDialog } from './components/CreatePlaylistDialog';
import { PlaylistCardGrid } from './components/PlaylistCardGrid';
import { PlaylistsToolbar } from './components/PlaylistsToolbar';
import { PromptedPlaylistDialog } from './components/PromptedPlaylistDialog';
import { usePlaylistFilter } from './hooks/usePlaylistFilter';
import { usePlaylistSort } from './hooks/usePlaylistSort';
import { PlaylistsProvider } from './PlaylistsContext';

const PlaylistsContent: FC = () => {
  const { t } = useTranslation('playlists');
  const navigate = useNavigate();
  const index = usePlaylistStore((state) => state.index);
  const pinnedIds = usePinnedPlaylistsStore((state) => state.pinnedIds);
  const togglePinned = usePinnedPlaylistsStore((state) => state.toggle);
  const { filter, setFilter, filteredPlaylists, hasFilter } =
    usePlaylistFilter(index);
  const {
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    sortedPlaylists,
  } = usePlaylistSort(filteredPlaylists, pinnedIds);
  const hasPlaylists = !isEmpty(index);
  const hasResults = !isEmpty(filteredPlaylists);
  const [promptedOpen, setPromptedOpen] = useState(false);

  return (
    <ViewShell data-testid="playlists-view" title={t('title')}>
      <PlaylistsToolbar
        filter={filter}
        onFilterChange={setFilter}
        hasPlaylists={hasPlaylists}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDirection={sortDirection}
        onToggleSortDirection={toggleSortDirection}
        onOpenPromptedPlaylist={() => setPromptedOpen(true)}
      />

      {!hasPlaylists && (
        <EmptyState
          icon={<ListMusic size={48} />}
          title={t('empty')}
          description={t('emptyDescription')}
          className="flex-1"
        />
      )}

      {hasPlaylists && hasFilter && !hasResults && (
        <EmptyState
          icon={<SearchX size={48} />}
          title={t('filterNoResults')}
          description={t('filterNoResultsDescription')}
          className="flex-1"
          data-testid="filter-empty-state"
        />
      )}

      {hasPlaylists && hasResults && (
        <ScrollableArea className="flex-1 overflow-hidden">
          <PlaylistCardGrid
            playlists={sortedPlaylists}
            pinnedIds={pinnedIds}
            onTogglePinned={(id) => void togglePinned(id)}
            onCardClick={(id) =>
              navigate({
                to: '/playlists/$playlistId',
                params: { playlistId: id },
              })
            }
          />
        </ScrollableArea>
      )}

      <CreatePlaylistDialog />
      <PromptedPlaylistDialog
        isOpen={promptedOpen}
        onClose={() => setPromptedOpen(false)}
      />
    </ViewShell>
  );
};

export const Playlists: FC = () => (
  <PlaylistsProvider>
    <PlaylistsContent />
  </PlaylistsProvider>
);
