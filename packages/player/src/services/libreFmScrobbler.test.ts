import type { Track } from '@nuclearplayer/model';

import { createEventBus } from './eventBus';
import {
  buildLibreFmRequest,
  createLibreFmEventHandler,
  shouldScrobble,
} from './libreFmScrobbler';

const track: Track = {
  title: 'Midnight City',
  artists: [{ name: 'M83', roles: ['primary'] }],
  album: { title: 'Hurry Up, We’re Dreaming' },
  durationMs: 244_000,
  source: { provider: 'test', id: 'midnight-city' },
};

describe('Libre.fm scrobbler', () => {
  it('signs a Scrobbling 2.0 request and excludes format from the signature', () => {
    const request = buildLibreFmRequest(
      'track.scrobble',
      {
        artist: 'M83',
        track: 'Midnight City',
        timestamp: 1_700_000_000,
      },
      { apiKey: 'key', apiSecret: 'secret', sessionKey: 'session' },
    );

    expect(request.get('format')).toBe('json');
    expect(request.get('api_sig')).toBe('eb6a83e00a03db8398717947c132ea57');
  });

  it('uses the standard half-track or four-minute threshold', () => {
    expect(shouldScrobble(244_000, 121_999)).toBe(false);
    expect(shouldScrobble(244_000, 122_000)).toBe(true);
    expect(shouldScrobble(600_000, 239_999)).toBe(false);
    expect(shouldScrobble(600_000, 240_000)).toBe(true);
    expect(shouldScrobble(20_000, 20_000)).toBe(false);
  });

  it('submits now playing and a completed track with its start timestamp', async () => {
    const events = createEventBus();
    const client = {
      nowPlaying: vi.fn().mockResolvedValue(undefined),
      scrobble: vi.fn().mockResolvedValue(undefined),
    };
    const dispose = createLibreFmEventHandler(
      events,
      client,
      () => 1_700_000_000_000,
    );

    events.emit('trackStarted', track);
    events.emit('trackFinished', track);

    await vi.waitFor(() => expect(client.scrobble).toHaveBeenCalled());
    expect(client.nowPlaying).toHaveBeenCalledWith(track);
    expect(client.scrobble).toHaveBeenCalledWith({
      track,
      timestamp: 1_700_000_000,
    });
    dispose();
  });

  it('does not submit an early skip', async () => {
    const events = createEventBus();
    const client = {
      nowPlaying: vi.fn().mockResolvedValue(undefined),
      scrobble: vi.fn().mockResolvedValue(undefined),
    };
    const dispose = createLibreFmEventHandler(
      events,
      client,
      () => 1_700_000_000_000,
    );

    events.emit('trackStarted', track);
    events.emit('playbackSkipped', { positionMs: 60_000 });

    await Promise.resolve();
    expect(client.scrobble).not.toHaveBeenCalled();
    dispose();
  });
});
