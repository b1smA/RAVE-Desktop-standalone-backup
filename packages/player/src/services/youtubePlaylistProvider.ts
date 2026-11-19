import type { Playlist, PlaylistItem, Track } from '@nuclearplayer/model';
import type { PlaylistProvider } from '@nuclearplayer/plugin-sdk';

import { providersHost } from './providersHost';
import { ytdlpEnsureInstalled } from './tauri/commands';
import { ytdlpHost } from './ytdlpHost';

const PROVIDER_ID = 'rave-youtube-playlists';
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'm.youtube.com',
]);

const matchesUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (
      YOUTUBE_HOSTS.has(url.hostname) && Boolean(url.searchParams.get('list'))
    );
  } catch {
    return false;
  }
};

const youtubeTrackUrl = (id: string): string =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

const fetchPlaylistByUrl: PlaylistProvider['fetchPlaylistByUrl'] = async (
  url,
) => {
  await ytdlpEnsureInstalled();
  const source = await ytdlpHost.getPlaylist(url);
  const timestamp = new Date().toISOString();

  const items: PlaylistItem[] = source.entries.map((entry, index) => {
    const sourceRef = {
      provider: 'YouTube',
      id: entry.id,
      url: youtubeTrackUrl(entry.id),
    };
    const artworkItems = entry.thumbnails.map((thumbnail) => ({
      url: thumbnail.url,
      width: thumbnail.width ?? undefined,
      height: thumbnail.height ?? undefined,
      purpose: 'thumbnail' as const,
      source: sourceRef,
    }));
    const track: Track = {
      title: entry.title,
      artists: [
        {
          name: entry.channel ?? 'YouTube',
          roles: [],
          source: {
            provider: 'YouTube',
            id: entry.channel ?? 'youtube',
          },
        },
      ],
      durationMs:
        entry.duration === null ? undefined : Math.round(entry.duration * 1000),
      artwork: artworkItems.length > 0 ? { items: artworkItems } : undefined,
      source: sourceRef,
    };

    return {
      id: `${PROVIDER_ID}:${entry.id}:${index}`,
      track,
      addedAtIso: timestamp,
    };
  });
  const firstArtwork = items.find((item) => item.track.artwork)?.track.artwork;

  return {
    id: source.id || new URL(url).searchParams.get('list') || url,
    name: source.title,
    artwork: firstArtwork,
    createdAtIso: timestamp,
    lastModifiedIso: timestamp,
    isReadOnly: true,
    items,
  } satisfies Playlist;
};

export const youtubePlaylistProvider: PlaylistProvider = {
  id: PROVIDER_ID,
  kind: 'playlists',
  name: 'YouTube',
  matchesUrl,
  fetchPlaylistByUrl,
};

export const registerYoutubePlaylistProvider = (): void => {
  if (!providersHost.get(PROVIDER_ID, 'playlists')) {
    providersHost.register(youtubePlaylistProvider);
  }
};
