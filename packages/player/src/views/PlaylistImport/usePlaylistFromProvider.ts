import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Playlist, PlaylistItem } from '@nuclearplayer/model';

import { getPlaylistProvidersForUrl } from '../../services/playlistsHost';
import { reportError } from '../../utils/logging';

const EMPTY_ITEMS: PlaylistItem[] = [];

export const usePlaylistFromProvider = (
  providerId: string,
  encodedUrl: string,
) => {
  const { t } = useTranslation('playlists');
  const decodedUrl = decodeURIComponent(encodedUrl);
  const providers = getPlaylistProvidersForUrl(decodedUrl, providerId);
  const providerIds = providers.map((provider) => provider.id);

  const query = useQuery<Playlist>({
    queryKey: ['playlist-import', providerIds, decodedUrl],
    queryFn: async () => {
      if (providers.length === 0) {
        throw new Error('Provider not found');
      }

      let lastError: unknown;
      for (const provider of providers) {
        try {
          const fetched = await provider.fetchPlaylistByUrl(decodedUrl);
          return {
            ...fetched,
            isReadOnly: true,
            origin: {
              provider: provider.name,
              id: provider.id,
              url: decodedUrl,
            },
          };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError ?? new Error('Playlist import failed');
    },
    enabled: providers.length > 0,
    retry: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      toast.success(t('importSuccess'));
    }
  }, [query.isSuccess, t]);

  useEffect(() => {
    if (query.error) {
      reportError('playlists', {
        userMessage: t('importError'),
        error: query.error,
      });
    }
  }, [query.error, t]);

  const playlist = query.data ?? null;
  const items = playlist?.items ?? EMPTY_ITEMS;
  const tracks = useMemo(() => items.map((item) => item.track), [items]);

  return { playlist, items, tracks, isLoading: query.isLoading };
};
