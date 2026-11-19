import type { Playlist, Track } from '@nuclearplayer/model';
import type {
  PlaylistsHost,
  PlaylistsListener,
  PlaylistProvider,
} from '@nuclearplayer/plugin-sdk';

import { usePlaylistStore } from '../stores/playlistStore';
import { providersHost } from './providersHost';

export const getPlaylistProvidersForUrl = (
  url: string,
  preferredProviderId?: string,
): PlaylistProvider[] =>
  (providersHost.list('playlists') as PlaylistProvider[])
    .filter((provider) => {
      try {
        return provider.matchesUrl(url);
      } catch {
        return false;
      }
    })
    .sort((left, right) => {
      if (left.id === preferredProviderId) {
        return -1;
      }
      if (right.id === preferredProviderId) {
        return 1;
      }
      return 0;
    });

export const createPlaylistsHost = (): PlaylistsHost => ({
  getIndex: async () => usePlaylistStore.getState().index,

  getPlaylist: async (id: string) =>
    usePlaylistStore.getState().loadPlaylist(id),

  createPlaylist: async (name: string) =>
    usePlaylistStore.getState().createPlaylist(name),

  deletePlaylist: async (id: string) =>
    usePlaylistStore.getState().deletePlaylist(id),

  addTracks: async (playlistId: string, tracks: Track[]) =>
    usePlaylistStore.getState().addTracks(playlistId, tracks),

  removeTracks: async (playlistId: string, itemIds: string[]) =>
    usePlaylistStore.getState().removeTracks(playlistId, itemIds),

  reorderTracks: async (playlistId: string, from: number, to: number) =>
    usePlaylistStore.getState().reorderTracks(playlistId, from, to),

  importPlaylist: async (playlist: Playlist) =>
    usePlaylistStore.getState().importPlaylist(playlist),

  saveQueueAsPlaylist: async (name: string) =>
    usePlaylistStore.getState().saveQueueAsPlaylist(name),

  subscribe: (listener: PlaylistsListener) =>
    usePlaylistStore.subscribe((state) => listener(state.index)),
});

export const playlistsHost = createPlaylistsHost();
