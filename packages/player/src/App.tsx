import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { platform } from '@tauri-apps/plugin-os';
import { FC } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18n } from '@nuclearplayer/i18n';
import { Platform, PlatformProvider } from '@nuclearplayer/ui';

import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });
const QUERY_STALE_TIME_MS = 30_000;
const QUERY_GC_TIME_MS = 10 * 60_000;
const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
      refetchOnWindowFocus: false,
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

type AppProps = {
  routerProp?: typeof router;
  queryClientProp?: QueryClient;
};

const App: FC<AppProps> = ({ routerProp, queryClientProp }) => {
  return (
    <PlatformProvider platform={platform() as Platform}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClientProp ?? defaultQueryClient}>
          <RouterProvider router={routerProp ?? router} />
        </QueryClientProvider>
      </I18nextProvider>
    </PlatformProvider>
  );
};

export default App;
