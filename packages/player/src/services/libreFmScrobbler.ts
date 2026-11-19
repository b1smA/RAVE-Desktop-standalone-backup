import { LazyStore } from '@tauri-apps/plugin-store';
import { md5 } from 'js-md5';

import type { Track } from '@nuclearplayer/model';
import type { EventsHost } from '@nuclearplayer/plugin-sdk';

import { getSetting } from '../stores/settingsStore';
import { errorMessage } from '../utils/errorMessage';
import { eventBus } from './eventBus';
import { httpHost } from './httpHost';
import { Logger } from './logger';

const DEFAULT_ENDPOINT = 'https://libre.fm/2.0/';
const MINIMUM_TRACK_DURATION_MS = 30_000;
const MAXIMUM_SCROBBLE_THRESHOLD_MS = 240_000;
const OUTBOX_KEY = 'pending';
const outboxStore = new LazyStore('librefm-outbox.json');

type LibreFmCredentials = {
  apiKey: string;
  apiSecret: string;
  sessionKey: string;
};

type LibreFmTrackParameters = {
  artist: string;
  track: string;
  album?: string;
  duration?: number;
  timestamp?: number;
};

type LibreFmSubmission = {
  track: Track;
  timestamp: number;
};

type LibreFmClient = {
  nowPlaying: (track: Track) => Promise<void>;
  scrobble: (submission: LibreFmSubmission) => Promise<void>;
};

type ActiveTrack = {
  track: Track;
  timestamp: number;
};

const readString = (id: string): string => {
  const value = getSetting(id);
  return typeof value === 'string' ? value.trim() : '';
};

const getCredentials = (): LibreFmCredentials | undefined => {
  if (getSetting('core.integrations.librefm.enabled') !== true) {
    return undefined;
  }
  const credentials = {
    apiKey: readString('core.integrations.librefm.apiKey'),
    apiSecret: readString('core.integrations.librefm.apiSecret'),
    sessionKey: readString('core.integrations.librefm.sessionKey'),
  };
  return Object.values(credentials).every(Boolean) ? credentials : undefined;
};

export const buildLibreFmRequest = (
  method: 'track.updateNowPlaying' | 'track.scrobble',
  trackParameters: LibreFmTrackParameters,
  credentials: LibreFmCredentials,
): URLSearchParams => {
  const parameters: Record<string, string> = {
    api_key: credentials.apiKey,
    method,
    sk: credentials.sessionKey,
    artist: trackParameters.artist,
    track: trackParameters.track,
  };
  if (trackParameters.album) {
    parameters.album = trackParameters.album;
  }
  if (trackParameters.duration !== undefined) {
    parameters.duration = String(trackParameters.duration);
  }
  if (trackParameters.timestamp !== undefined) {
    parameters.timestamp = String(trackParameters.timestamp);
  }
  const signatureSource = Object.keys(parameters)
    .sort()
    .map((key) => `${key}${parameters[key]}`)
    .join('');
  return new URLSearchParams({
    ...parameters,
    api_sig: md5(`${signatureSource}${credentials.apiSecret}`),
    format: 'json',
  });
};

const parametersForTrack = (track: Track): LibreFmTrackParameters => ({
  artist: track.artists.map((artist) => artist.name).join(', '),
  track: track.title,
  album: track.album?.title,
  duration: track.durationMs ? Math.round(track.durationMs / 1000) : undefined,
});

const submitRequest = async (
  method: 'track.updateNowPlaying' | 'track.scrobble',
  parameters: LibreFmTrackParameters,
): Promise<void> => {
  const credentials = getCredentials();
  if (!credentials) {
    return;
  }
  const endpoint =
    readString('core.integrations.librefm.endpoint') || DEFAULT_ENDPOINT;
  const response = await httpHost.fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildLibreFmRequest(method, parameters, credentials).toString(),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Libre.fm returned HTTP ${response.status}`);
  }
  const payload = response.body ? JSON.parse(response.body) : undefined;
  if (payload?.error) {
    throw new Error(`Libre.fm error ${payload.error}: ${payload.message}`);
  }
};

const submitScrobble = ({ track, timestamp }: LibreFmSubmission) =>
  submitRequest('track.scrobble', {
    ...parametersForTrack(track),
    timestamp,
  });

const enqueue = async (submission: LibreFmSubmission): Promise<void> => {
  const pending =
    (await outboxStore.get<LibreFmSubmission[]>(OUTBOX_KEY)) ?? [];
  if (
    pending.some(
      (entry) =>
        entry.timestamp === submission.timestamp &&
        entry.track.source.provider === submission.track.source.provider &&
        entry.track.source.id === submission.track.source.id,
    )
  ) {
    return;
  }
  await outboxStore.set(OUTBOX_KEY, [...pending, submission]);
  await outboxStore.save();
};

const flushOutbox = async (): Promise<void> => {
  if (!getCredentials()) {
    return;
  }
  const pending =
    (await outboxStore.get<LibreFmSubmission[]>(OUTBOX_KEY)) ?? [];
  const remaining: LibreFmSubmission[] = [];
  for (const submission of pending) {
    try {
      await submitScrobble(submission);
    } catch {
      remaining.push(submission);
    }
  }
  await outboxStore.set(OUTBOX_KEY, remaining);
  await outboxStore.save();
};

const client: LibreFmClient = {
  nowPlaying: (track) =>
    submitRequest('track.updateNowPlaying', parametersForTrack(track)),
  scrobble: async (submission) => {
    await flushOutbox();
    try {
      await submitScrobble(submission);
    } catch (error) {
      await enqueue(submission);
      throw error;
    }
  },
};

export const shouldScrobble = (
  durationMs: number | undefined,
  playedMs: number,
): boolean =>
  durationMs !== undefined &&
  durationMs >= MINIMUM_TRACK_DURATION_MS &&
  playedMs >= Math.min(durationMs / 2, MAXIMUM_SCROBBLE_THRESHOLD_MS);

export const createLibreFmEventHandler = (
  events: EventsHost,
  libreFmClient: LibreFmClient,
  now: () => number = Date.now,
): (() => void) => {
  let activeTrack: ActiveTrack | undefined;

  const submitTerminal = async (playedMs: number): Promise<void> => {
    const completed = activeTrack;
    activeTrack = undefined;
    if (!completed || !shouldScrobble(completed.track.durationMs, playedMs)) {
      return;
    }
    await libreFmClient.scrobble(completed);
  };

  const unsubscribes = [
    events.on('trackStarted', async (track) => {
      activeTrack = { track, timestamp: Math.floor(now() / 1000) };
      await libreFmClient.nowPlaying(track);
    }),
    events.on('trackFinished', async (track) => {
      await submitTerminal(track.durationMs ?? 0);
    }),
    events.on('playbackSkipped', async ({ positionMs }) => {
      await submitTerminal(positionMs);
    }),
    events.on('playbackStopped', async ({ positionMs }) => {
      await submitTerminal(positionMs);
    }),
  ];

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
};

export const initLibreFmScrobbler = (): (() => void) =>
  createLibreFmEventHandler(eventBus, {
    nowPlaying: async (track) => {
      try {
        await client.nowPlaying(track);
      } catch (error) {
        Logger.app.warn(`Libre.fm now playing failed: ${errorMessage(error)}`);
      }
    },
    scrobble: async (submission) => {
      try {
        await client.scrobble(submission);
      } catch (error) {
        Logger.app.warn(`Libre.fm scrobble queued: ${errorMessage(error)}`);
      }
    },
  });
