import type {
  LyricsHost,
  LyricsProvider,
  LyricsQuery,
} from '@nuclearplayer/plugin-sdk';

import { providersHost } from './providersHost';

const getProvider = (providerId?: string): LyricsProvider | undefined => {
  const active = providersHost.get<LyricsProvider>(
    providerId ?? providersHost.getActive('lyrics'),
    'lyrics',
  );
  return (
    active ?? (providersHost.list('lyrics')[0] as LyricsProvider | undefined)
  );
};

export const lyricsHost: LyricsHost = {
  getLyrics: async (query: LyricsQuery, providerId?: string) => {
    const provider = getProvider(providerId);
    if (!provider) {
      return undefined;
    }
    return provider.getLyrics(query);
  },
};
