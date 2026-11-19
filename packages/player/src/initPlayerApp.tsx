import React from 'react';

import App from './App';
import { initLogStream } from './hooks/useLogStream';
import { applyThemeFromSettingsIfAny } from './services/advancedThemeService';
import { registerBuiltInCoreSettings } from './services/coreSettings';
import { initDiscoveryService } from './services/discoveryService';
import { initHistoryService } from './services/history';
import { initHttpApiHandler } from './services/httpApi';
import {
  applyLanguageFromSettings,
  initLanguageWatcher,
} from './services/languageService';
import { Logger } from './services/logger';
import { initializeLoudnessAnalysis } from './services/loudnessAnalysis';
import { loadMarketplaceThemes } from './services/marketplaceThemeDirService';
import { initPlaybackEventBridge } from './services/playbackEventBridge';
import { registerYoutubePlaylistProvider } from './services/youtubePlaylistProvider';
import { initializeFavoritesStore } from './stores/favoritesStore';
import { initializePinnedPlaylistsStore } from './stores/pinnedPlaylistsStore';
import { initializePlaylistStore } from './stores/playlistStore';
import { initializeQueueStore } from './stores/queueStore';
import { initializeRaveLibraryStore } from './stores/raveLibraryStore';
import { initializeSettingsStore } from './stores/settingsStore';
import { initializeShortcutsStore } from './stores/shortcutsStore';
import { initializeSourceFeedbackStore } from './stores/sourceFeedbackStore';
import { initializeStreamVerificationStore } from './stores/streamVerificationStore';
import { hydrateThemeStore, useThemeStore } from './stores/themeStore';
import { errorMessage } from './utils/errorMessage';

const BACKGROUND_TASK_TIMEOUT_MS = 1_000;

type BackgroundTask = {
  name: string;
  run: () => Promise<unknown> | unknown;
};

const initializeStores = async (): Promise<void> => {
  await initializeSettingsStore();
  registerBuiltInCoreSettings();

  await Promise.all([
    initializeShortcutsStore(),
    initializeSourceFeedbackStore(),
    initializeQueueStore(),
    initializeRaveLibraryStore(),
    initializeFavoritesStore(),
    initializeStreamVerificationStore(),
    initializePlaylistStore(),
    initializePinnedPlaylistsStore(),
    initializeLoudnessAnalysis(),
  ]);
};

const initializeLanguage = async (): Promise<void> => {
  await applyLanguageFromSettings();
  initLanguageWatcher();
};

const initializeTheme = async (): Promise<void> => {
  hydrateThemeStore();
  const { activeTheme } = useThemeStore.getState();

  if (activeTheme.type === 'marketplace') {
    await loadMarketplaceThemes();
  }

  await applyThemeFromSettingsIfAny();
};

const backgroundTasks: BackgroundTask[] = [
  {
    name: 'advanced theme watcher',
    run: async () =>
      (
        await import('./services/advancedThemeWatcher')
      ).startAdvancedThemeWatcher(),
  },
  {
    name: 'marketplace themes',
    run: () =>
      useThemeStore.getState().activeTheme.type === 'marketplace'
        ? undefined
        : loadMarketplaceThemes(),
  },
  {
    name: 'plugin registry',
    run: async () =>
      (
        await import('./services/plugins/pluginBootstrap')
      ).hydratePluginsFromRegistry(),
  },
  {
    name: 'yt-dlp setup',
    run: async () =>
      (await import('./services/tauri/commands')).ytdlpEnsureInstalled(),
  },
  {
    name: 'MCP server',
    run: async () => (await import('./services/mcp')).initMcpHandler(),
  },
  {
    name: 'MPD server',
    run: async () => (await import('./services/mpd')).initMpdHandler(),
  },
  {
    name: 'bridge server',
    run: async () =>
      (await import('./services/bridge/bridgeHandler')).initBridgeHandler(),
  },
  {
    name: 'Discord integration',
    run: async () =>
      (await import('./services/discordHandler')).initDiscordHandler(),
  },
  {
    name: 'Libre.fm integration',
    run: async () =>
      (await import('./services/libreFmScrobbler')).initLibreFmScrobbler(),
  },
];

const startBackgroundTasks = (): void => {
  const start = () => {
    backgroundTasks.forEach(({ name, run }) => {
      void Promise.resolve()
        .then(run)
        .catch((error) =>
          Logger.app.error(
            `Startup task "${name}" failed: ${errorMessage(error)}`,
          ),
        );
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: BACKGROUND_TASK_TIMEOUT_MS });
    return;
  }

  globalThis.setTimeout(start, BACKGROUND_TASK_TIMEOUT_MS);
};

export const initPlayerApp = async (
  root: ReturnType<typeof import('react-dom/client').createRoot>,
) => {
  initLogStream();

  await initializeStores();
  registerYoutubePlaylistProvider();
  initDiscoveryService();
  initPlaybackEventBridge();
  initHistoryService();
  await Promise.all([
    initializeLanguage(),
    initializeTheme(),
    initHttpApiHandler(),
  ]);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  startBackgroundTasks();
};
