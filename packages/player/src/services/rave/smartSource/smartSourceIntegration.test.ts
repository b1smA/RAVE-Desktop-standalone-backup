import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Track } from '@nuclearplayer/model';
import type { StreamingProvider } from '@nuclearplayer/plugin-sdk';

import { useSettingsStore } from '../../../stores/settingsStore';
import { providersHost } from '../../providersHost';
import { createStreamingHost } from '../../streamingHost';
import { providerPerformanceTracker } from './providerPerformanceTracker';

const track: Track = {
  title: 'Midnight City',
  artists: [{ name: 'M83', roles: [] }],
  durationMs: 244_000,
  source: { provider: 'metadata', id: 'track' },
};

const provider = (
  id: string,
  title: string,
  durationMs = 244_000,
): StreamingProvider => ({
  id,
  name: id,
  kind: 'streaming',
  searchForTrack: vi.fn().mockResolvedValue([
    {
      id: `${id}-candidate`,
      title,
      durationMs,
      failed: false,
      source: { provider: id, id: `${id}-candidate` },
    },
  ]),
  getStreamUrl: vi.fn(),
});

describe('RAVE smart source integration', () => {
  afterEach(() => {
    providersHost.clear();
    providerPerformanceTracker.clear();
    useSettingsStore.setState({ values: {} });
  });

  it('ranks a studio match above a live alternate from the active provider', async () => {
    providersHost.register(provider('active', 'Midnight City Live'));
    providersHost.register(provider('studio', 'Midnight City'));
    providersHost.setActive('streaming', 'active');

    const result = await createStreamingHost().resolveCandidatesForTrack(track);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.candidates[0].source.provider).toBe('studio');
    }
  });

  it('uses the configured provider order when candidates otherwise match', async () => {
    providersHost.register(provider('youtube', 'Midnight City'));
    providersHost.register(provider('soundcloud', 'Midnight City'));
    await useSettingsStore
      .getState()
      .setValue(
        'core.playback.smartSourcePreferredProviders',
        'soundcloud, youtube',
      );

    const result = await createStreamingHost().resolveCandidatesForTrack(track);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.candidates[0].source.provider).toBe('soundcloud');
    }
  });
});
