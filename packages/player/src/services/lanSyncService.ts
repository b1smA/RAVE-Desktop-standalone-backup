import { z } from 'zod';

import type { Playlist } from '@nuclearplayer/model';
import { playlistSchema } from '@nuclearplayer/model';

import { usePlaylistStore } from '../stores/playlistStore';
import {
  getSetting,
  setSetting,
  useSettingsStore,
} from '../stores/settingsStore';
import type { HistoryEntry } from './tauri/bindings';
import { commands } from './tauri/bindings';
import { unwrapResult } from './tauri/results';

const SNAPSHOT_VERSION = 1;
const HISTORY_PAGE_SIZE = 500;
const SYNCABLE_SETTINGS = [
  'core.general.language',
  'core.general.startPage',
  'core.playback.discoveryVariety',
  'core.playback.raveMixMode',
  'core.playback.preventQueueDuplicates',
  'core.playback.autoCleanQueue',
  'core.playback.queueHistoryLimit',
  'core.playback.familyMode',
  'core.playback.skipSeconds',
  'core.playback.crossfadeMs',
  'core.playback.smartSourceSelection',
  'core.playback.smartSourceQualityWeight',
  'core.playback.smartSourceSpeedWeight',
  'core.playback.smartSourcePreferredProviders',
  'core.playback.autoSkipRejectedVersions',
] as const;

const historyEntrySchema = z.object({
  playId: z.string(),
  title: z.string(),
  artists: z.array(z.string()),
  albumTitle: z.string().nullable(),
  durationMs: z.number().nullable(),
  artworkUrl: z.string().nullable(),
  provider: z.string().nullable(),
  providerId: z.string().nullable(),
  startedAt: z.number(),
  msPlayed: z.number(),
  endReason: z.enum(['finished', 'skipped', 'stopped']).nullable(),
  endPositionMs: z.number().nullable(),
});

const lanSyncSnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  deviceId: z.string(),
  createdAt: z.string(),
  settings: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
  ),
  playlists: z.array(playlistSchema),
  history: z.array(historyEntrySchema),
});

export type LanSyncSnapshot = z.infer<typeof lanSyncSnapshotSchema>;

const loadAllPlaylists = async (): Promise<Playlist[]> => {
  const store = usePlaylistStore.getState();
  const playlists = await Promise.all(
    store.index.map((entry) => store.loadPlaylist(entry.id)),
  );
  return playlists.filter((playlist): playlist is Playlist =>
    Boolean(playlist),
  );
};

const loadAllHistory = async (): Promise<HistoryEntry[]> => {
  const first = unwrapResult(
    await commands.historyFetch({ limit: HISTORY_PAGE_SIZE, offset: 0 }),
  );
  const entries = [...first.items];
  for (
    let offset = HISTORY_PAGE_SIZE;
    offset < first.total;
    offset += HISTORY_PAGE_SIZE
  ) {
    entries.push(
      ...unwrapResult(
        await commands.historyFetch({ limit: HISTORY_PAGE_SIZE, offset }),
      ).items,
    );
  }
  return entries;
};

const getDeviceId = async (): Promise<string> => {
  const existing = getSetting('core.integrations.lanSync.deviceId');
  if (typeof existing === 'string' && existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  await setSetting('core.integrations.lanSync.deviceId', created);
  return created;
};

export const exportLanSyncSnapshot = async (): Promise<LanSyncSnapshot> => {
  if (getSetting('core.integrations.lanSync.shareLibrary') !== true) {
    throw new Error('LAN library sync is not enabled');
  }
  const deviceId = await getDeviceId();
  const values = useSettingsStore.getState().values;
  const settings = Object.fromEntries(
    SYNCABLE_SETTINGS.flatMap((id) =>
      values[id] === undefined ? [] : [[id, values[id]] as const],
    ),
  ) as LanSyncSnapshot['settings'];

  return {
    version: SNAPSHOT_VERSION,
    deviceId,
    createdAt: new Date().toISOString(),
    settings,
    playlists: await loadAllPlaylists(),
    history: await loadAllHistory(),
  };
};

const importHistory = async (snapshot: LanSyncSnapshot): Promise<number> => {
  const localHistory = await loadAllHistory();
  const localIds = new Set(localHistory.map((entry) => entry.playId));
  let imported = 0;
  for (const entry of snapshot.history) {
    const playId = `lan:${snapshot.deviceId}:${entry.playId}`;
    if (localIds.has(playId)) {
      continue;
    }
    unwrapResult(
      await commands.historyRecordEvent({
        playId,
        kind: 'started',
        at: entry.startedAt,
        positionMs: 0,
        seekToMs: null,
        snapshot: {
          title: entry.title,
          artists: entry.artists,
          albumTitle: entry.albumTitle,
          durationMs: entry.durationMs,
          artworkUrl: entry.artworkUrl,
          provider: entry.provider ?? 'lan-sync',
          providerId: entry.providerId ?? playId,
        },
      }),
    );
    if (entry.endReason) {
      unwrapResult(
        await commands.historyRecordEvent({
          playId,
          kind: entry.endReason,
          at: entry.startedAt + entry.msPlayed,
          positionMs: entry.endPositionMs ?? entry.msPlayed,
          seekToMs: null,
          snapshot: null,
        }),
      );
    }
    imported += 1;
  }
  return imported;
};

const importPlaylists = async (snapshot: LanSyncSnapshot): Promise<number> => {
  const localPlaylists = await loadAllPlaylists();
  let imported = 0;
  for (const playlist of snapshot.playlists) {
    const originId = `${snapshot.deviceId}:${playlist.id}`;
    const existing = localPlaylists.find(
      (entry) =>
        entry.origin?.provider === 'rave-lan' && entry.origin.id === originId,
    );
    if (existing && existing.lastModifiedIso >= playlist.lastModifiedIso) {
      continue;
    }
    if (existing) {
      await usePlaylistStore.getState().deletePlaylist(existing.id);
    }
    await usePlaylistStore.getState().importPlaylist({
      ...playlist,
      origin: { provider: 'rave-lan', id: originId },
      isReadOnly: false,
    });
    imported += 1;
  }
  return imported;
};

export const importLanSyncSnapshot = async (
  input: unknown,
): Promise<{ playlists: number; history: number; settings: number }> => {
  const snapshot = lanSyncSnapshotSchema.parse(input);
  const settings = Object.entries(snapshot.settings).filter(([id]) =>
    SYNCABLE_SETTINGS.includes(id as (typeof SYNCABLE_SETTINGS)[number]),
  );
  await Promise.all(settings.map(([id, value]) => setSetting(id, value)));
  return {
    playlists: await importPlaylists(snapshot),
    history: await importHistory(snapshot),
    settings: settings.length,
  };
};

export const parseLanSyncSnapshot = (input: unknown): LanSyncSnapshot =>
  lanSyncSnapshotSchema.parse(input);

const normalizeSourceUrl = (value: string): string =>
  value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

export const fetchLanSyncSnapshot = async (
  sourceUrl: string,
  pairingCode: string,
): Promise<LanSyncSnapshot> => {
  const base = normalizeSourceUrl(sourceUrl);
  const statusResponse = await fetch(`${base}/api/session/status`);
  if (!statusResponse.ok) {
    throw new Error(`Connection failed with HTTP ${statusResponse.status}`);
  }
  const status = (await statusResponse.json()) as { requiresPairing?: boolean };
  let token: string | undefined;
  if (status.requiresPairing) {
    const joinResponse = await fetch(`${base}/api/session/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'RAVE Sync', code: pairingCode.trim() }),
    });
    if (!joinResponse.ok) {
      throw new Error(`Pairing failed with HTTP ${joinResponse.status}`);
    }
    token = ((await joinResponse.json()) as { token: string }).token;
  }
  const response = await fetch(`${base}/api/sync/snapshot`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Snapshot failed with HTTP ${response.status}`);
  }
  return parseLanSyncSnapshot(await response.json());
};
