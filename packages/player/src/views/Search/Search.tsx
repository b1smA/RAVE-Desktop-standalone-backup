import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import type {
  MetadataProvider,
  SearchResults,
} from '@nuclearplayer/plugin-sdk';
import {
  Button,
  Card,
  CardGrid,
  Tabs,
  TabsItem,
  ViewShell,
} from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import { useProviders } from '../../hooks/useProviders';
import { searchAllMetadataProviders } from '../../services/metadataHost';
import { SearchEmptyState } from './SearchEmptyState';

const SearchContent: FC<{
  hasProviders: boolean;
  isLoading: boolean;
  isError: boolean;
  results: SearchResults | undefined;
  refetch: () => void;
}> = ({ hasProviders, isLoading, isError, results, refetch }) => {
  const { t } = useTranslation(['search', 'common']);
  const navigate = useNavigate();

  if (!hasProviders) {
    return <SearchEmptyState />;
  }

  if (isLoading) {
    return <CardGrid.Skeleton data-testid="search-skeleton" />;
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="text-accent-red">{t('search:failedToLoad')}</div>
        <Button
          onClick={() => {
            void refetch();
          }}
        >
          {t('common:actions.retry')}
        </Button>
      </div>
    );
  }

  const artistCards = results?.artists?.map((item) => (
    <div key={`${item.source.provider}:${item.source.id}`} data-testid="search-result-heading">
      <Card
        title={item.name}
        src={pickArtwork(item.artwork, 'cover', 300)?.url}
        onClick={() =>
          navigate({
            to: `/artist/${item.source.provider}/${item.source.id}`,
          })
        }
      />
    </div>
  ));
  const albumCards = results?.albums?.map((item) => (
    <Card
      key={`${item.source.provider}:${item.source.id}`}
      title={item.title}
      src={pickArtwork(item.artwork, 'cover', 300)?.url}
      onClick={() =>
        navigate({ to: `/album/${item.source.provider}/${item.source.id}` })
      }
    />
  ));

  const tabsItems = [
    {
      id: 'all',
      label: t('search:results.all'),
      content: (
        <div className="flex flex-col gap-8" data-testid="search-unified-results">
          {artistCards && artistCards.length > 0 && (
            <CardGrid>{artistCards}</CardGrid>
          )}
          {results?.tracks && results.tracks.length > 0 && (
            <ConnectedTrackTable tracks={results.tracks.slice(0, 8)} />
          )}
          {albumCards && albumCards.length > 0 && (
            <CardGrid>{albumCards}</CardGrid>
          )}
        </div>
      ),
    },
    results?.albums && {
      id: 'albums',
      label: t('search:results.albums'),
      content: (
        <CardGrid>
          {results.albums.map((item) => (
            <Card
              key={`${item.source.provider}:${item.source.id}`}
              title={item.title}
              src={pickArtwork(item.artwork, 'cover', 300)?.url}
              onClick={() =>
                navigate({
                  to: `/album/${item.source.provider}/${item.source.id}`,
                })
              }
            />
          ))}
        </CardGrid>
      ),
    },
    results?.artists && {
      id: 'artists',
      label: t('search:results.artists'),
      content: (
        <CardGrid>
          {results.artists.map((item) => (
            <Card
              key={`${item.source.provider}:${item.source.id}`}
              title={item.name}
              src={pickArtwork(item.artwork, 'cover', 300)?.url}
              onClick={() =>
                navigate({
                  to: `/artist/${item.source.provider}/${item.source.id}`,
                })
              }
            />
          ))}
        </CardGrid>
      ),
    },
    results?.tracks && {
      id: 'tracks',
      label: t('search:results.tracks'),
      content: (
        <div className="flex flex-col">
          <ConnectedTrackTable
            features={{ playAll: true, addAllToQueue: true }}
            tracks={results.tracks}
          />
        </div>
      ),
    },
  ].filter(Boolean);

  return <Tabs items={tabsItems as TabsItem[]} className="flex-1" />;
};

export const Search: FC = () => {
  const { t } = useTranslation(['search', 'common']);
  const { q } = useSearch({ from: '/search' });

  const providers = useProviders('metadata') as MetadataProvider[];
  const providerIds = providers.map((provider) => provider.id).sort().join(',');

  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useQuery<SearchResults>({
    queryKey: ['metadata-search', providerIds, q],
    queryFn: () =>
      searchAllMetadataProviders({
        query: q,
      }),
    enabled: Boolean(providers.length > 0 && q),
  });

  return (
    <ViewShell
      data-testid="search-view"
      title={t('search:title')}
      subtitle={`${t('search:query')}: "${q}"`}
    >
      <SearchContent
        hasProviders={providers.length > 0}
        isLoading={isLoading}
        isError={isError}
        results={results}
        refetch={refetch}
      />
    </ViewShell>
  );
};
