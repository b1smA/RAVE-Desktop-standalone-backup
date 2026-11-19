import type { ProviderDescriptor } from './providers';

export type LyricsQuery = {
  artist: string;
  title: string;
  album?: string;
  durationMs?: number;
};

export type SyncedLyricsLine = {
  startMs: number;
  text: string;
};

export type LyricsResult = {
  plainText?: string;
  syncedLines?: SyncedLyricsLine[];
  source?: string;
};

export type LyricsProvider = ProviderDescriptor<'lyrics'> & {
  getLyrics: (query: LyricsQuery) => Promise<LyricsResult | undefined>;
};

export type LyricsHost = {
  getLyrics: (
    query: LyricsQuery,
    providerId?: string,
  ) => Promise<LyricsResult | undefined>;
};
