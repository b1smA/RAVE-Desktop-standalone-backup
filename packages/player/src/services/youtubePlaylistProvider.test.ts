import { ytdlpEnsureInstalled } from './tauri/commands';
import { youtubePlaylistProvider } from './youtubePlaylistProvider';
import { ytdlpHost } from './ytdlpHost';

vi.mock('./tauri/commands', () => ({
  ytdlpEnsureInstalled: vi.fn().mockResolvedValue(true),
}));

vi.mock('./ytdlpHost', () => ({
  ytdlpHost: {
    getPlaylist: vi.fn(),
  },
}));

describe('youtubePlaylistProvider', () => {
  it('matches YouTube playlist URLs only', () => {
    expect(
      youtubePlaylistProvider.matchesUrl(
        'https://www.youtube.com/playlist?list=PL123',
      ),
    ).toBe(true);
    expect(
      youtubePlaylistProvider.matchesUrl(
        'https://music.youtube.com/watch?v=video&list=PL123',
      ),
    ).toBe(true);
    expect(
      youtubePlaylistProvider.matchesUrl(
        'https://www.youtube.com/watch?v=video',
      ),
    ).toBe(false);
    expect(
      youtubePlaylistProvider.matchesUrl(
        'https://example.com/playlist?list=PL123',
      ),
    ).toBe(false);
  });

  it('imports playlist entries as playable YouTube tracks', async () => {
    vi.mocked(ytdlpHost.getPlaylist).mockResolvedValue({
      id: 'PL123',
      title: 'Road Trip',
      entries: [
        {
          id: 'video-1',
          title: 'Night Drive',
          duration: 185.4,
          channel: 'Example Artist',
          thumbnails: [
            { url: 'https://img.example/cover.jpg', width: 640, height: 360 },
          ],
        },
      ],
    });

    const playlist = await youtubePlaylistProvider.fetchPlaylistByUrl(
      'https://www.youtube.com/playlist?list=PL123',
    );

    expect(ytdlpEnsureInstalled).toHaveBeenCalledOnce();
    expect(playlist.name).toBe('Road Trip');
    expect(playlist.items).toHaveLength(1);
    expect(playlist.items[0]?.track).toMatchObject({
      title: 'Night Drive',
      durationMs: 185400,
      artists: [{ name: 'Example Artist' }],
      source: {
        provider: 'YouTube',
        id: 'video-1',
        url: 'https://www.youtube.com/watch?v=video-1',
      },
    });
    expect(playlist.artwork?.items[0]?.url).toBe(
      'https://img.example/cover.jpg',
    );
  });
});
