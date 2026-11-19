import type { LyricsHost, LyricsQuery, LyricsResult } from '../types/lyrics';

export class LyricsAPI {
  #host?: LyricsHost;

  constructor(host?: LyricsHost) {
    this.#host = host;
  }

  #withHost<T>(fn: (host: LyricsHost) => T): T {
    const host = this.#host;
    if (!host) {
      throw new Error('Lyrics host not available');
    }
    return fn(host);
  }

  getLyrics(
    query: LyricsQuery,
    providerId?: string,
  ): Promise<LyricsResult | undefined> {
    return this.#withHost((host) => host.getLyrics(query, providerId));
  }
}
