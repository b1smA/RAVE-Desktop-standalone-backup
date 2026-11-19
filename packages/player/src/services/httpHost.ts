import { invoke } from '@tauri-apps/api/core';

import type {
  HttpHost,
  HttpRequestInit,
  HttpResponseData,
} from '@nuclearplayer/plugin-sdk';

import { Logger } from './logger';

export const httpHost: HttpHost = {
  fetch: async (
    url: string,
    init?: HttpRequestInit,
  ): Promise<HttpResponseData> => {
    const method = init?.method ?? 'GET';

    const response = await invoke<HttpResponseData>('http_fetch', {
      request: {
        url,
        method,
        headers: init?.headers,
        body: init?.body,
      },
    });

    Logger.http.trace(`${method} ${url} -> ${response.status}`);

    return response;
  },
};
