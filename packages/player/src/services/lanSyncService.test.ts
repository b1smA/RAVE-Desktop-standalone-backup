import { usePlaylistStore } from '../stores/playlistStore';
import { useSettingsStore } from '../stores/settingsStore';
import { PlaylistBuilder } from '../test/builders/PlaylistBuilder';
import {
  exportLanSyncSnapshot,
  fetchLanSyncSnapshot,
  importLanSyncSnapshot,
  parseLanSyncSnapshot,
} from './lanSyncService';
import { commands } from './tauri/bindings';

const historyEntry = {
  playId: 'play-1',
  title: 'Midnight City',
  artists: ['M83'],
  albumTitle: 'Hurry Up, We’re Dreaming',
  durationMs: 244_000,
  artworkUrl: null,
  provider: 'youtube',
  providerId: 'video-1',
  startedAt: 1_700_000_000_000,
  msPlayed: 244_000,
  endReason: 'finished' as const,
  endPositionMs: 244_000,
};

describe('LAN sync service', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      values: {
        'core.integrations.lanSync.shareLibrary': true,
        'core.general.language': 'ru_RU',
        'core.integrations.librefm.apiSecret': 'must-not-leak',
      },
      loaded: true,
    });
    const builder = new PlaylistBuilder().withId('playlist-1').withName('Mix');
    const playlist = builder.build();
    usePlaylistStore.setState({
      index: [builder.buildIndexEntry()],
      playlists: new Map([[playlist.id, playlist]]),
      loaded: true,
    });
    vi.spyOn(commands, 'historyFetch').mockResolvedValue({
      status: 'ok',
      data: { items: [historyEntry], total: 1 },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('exports playlists, history, and only allowlisted settings', async () => {
    const snapshot = await exportLanSyncSnapshot();

    expect(snapshot.playlists).toHaveLength(1);
    expect(snapshot.history).toEqual([historyEntry]);
    expect(snapshot.settings).toEqual({
      'core.general.language': 'ru_RU',
    });
  });

  it('rejects unsupported snapshot versions', () => {
    expect(() =>
      parseLanSyncSnapshot({ version: 2, deviceId: 'remote' }),
    ).toThrow();
  });

  it('imports a remote history entry and settings explicitly', async () => {
    const snapshot = await exportLanSyncSnapshot();
    snapshot.deviceId = 'remote-device';
    snapshot.playlists = [];
    snapshot.settings = { 'core.general.startPage': 'history' };
    vi.mocked(commands.historyFetch).mockResolvedValue({
      status: 'ok',
      data: { items: [], total: 0 },
    });
    const record = vi
      .spyOn(commands, 'historyRecordEvent')
      .mockResolvedValue({ status: 'ok', data: null });

    const result = await importLanSyncSnapshot(snapshot);

    expect(result).toEqual({ playlists: 0, history: 1, settings: 1 });
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ playId: 'lan:remote-device:play-1' }),
    );
    expect(useSettingsStore.getState().values['core.general.startPage']).toBe(
      'history',
    );
  });

  it('pairs with the source and authenticates the snapshot request', async () => {
    const snapshot = await exportLanSyncSnapshot();
    const request = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ requiresPairing: true }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'session-token' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(snapshot), { status: 200 }),
      );

    await expect(
      fetchLanSyncSnapshot('http://192.168.1.20:4120/api/', '123456'),
    ).resolves.toEqual(snapshot);
    expect(request).toHaveBeenNthCalledWith(
      3,
      'http://192.168.1.20:4120/api/sync/snapshot',
      { headers: { Authorization: 'Bearer session-token' } },
    );
  });
});
