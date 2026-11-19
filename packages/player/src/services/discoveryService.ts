import { i18n } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';

import { useQueueStore } from '../stores/queueStore';
import { useRaveLibraryStore } from '../stores/raveLibraryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { reportError } from '../utils/logging';
import { discoveryHost } from './discoveryHost';
import { eventBus } from './eventBus';
import { providersHost } from './providersHost';
import {
  rankTracksForTaste,
  RaveMixMode,
  selectMixTracks,
  varietyForMixMode,
} from './rave/mix/raveMix';
import {
  isFamilySafe,
  isTrackBlocked,
} from './rave/preferences/blockedArtists';

const CONTEXT_SIZE = 10;
const RECOMMENDATION_LIMIT = 5;
const isRecommendationBlocked = (track: Track): boolean =>
  isTrackBlocked(track) || !isFamilySafe(track);

const getDiscoveryVariety = (): number =>
  (useSettingsStore
    .getState()
    .getValue('core.playback.discoveryVariety') as number) ?? 0.5;

const getMixVariety = () => {
  const mode = (useSettingsStore
    .getState()
    .getValue('core.playback.raveMixMode') ?? 'balanced') as RaveMixMode;
  return varietyForMixMode(mode, getDiscoveryVariety());
};

const getMixMode = (): RaveMixMode =>
  (useSettingsStore.getState().getValue('core.playback.raveMixMode') ??
    'balanced') as RaveMixMode;

const rankForTaste = (tracks: Track[]): Track[] =>
  rankTracksForTaste(
    tracks,
    useRaveLibraryStore.getState().taste.artists,
    getMixMode(),
  );

export const startRadioFromTrack = async (track: Track): Promise<void> => {
  const activeDiscoveryId = providersHost.getActive('discovery');
  if (!providersHost.get(activeDiscoveryId, 'discovery')) {
    return;
  }

  try {
    const recommendations = await discoveryHost.getRecommendations(
      [track],
      { variety: getMixVariety(), limit: RECOMMENDATION_LIMIT * 2 },
      activeDiscoveryId,
    );
    const queue = useQueueStore.getState();
    queue.clearQueue();
    queue.addToQueue([track]);
    queue.addToQueueWithReason(
      selectMixTracks(
        rankForTaste(recommendations),
        [track],
        RECOMMENDATION_LIMIT,
        isRecommendationBlocked,
      ),
      'autoradio',
    );
    useSettingsStore.getState().setValue('core.playback.discovery', true);
  } catch (error) {
    reportError('discovery', {
      userMessage: i18n.t('discovery:recommendationError'),
      error,
    });
  }
};

export const initDiscoveryService = () => {
  return eventBus.on('trackStarted', async () => {
    const currentTrack = useQueueStore.getState().getCurrentItem()?.track;
    if (currentTrack) {
      await useRaveLibraryStore.getState().recordTaste(currentTrack);
    }
    const isEnabled = useSettingsStore
      .getState()
      .getValue('core.playback.discovery');
    const activeDiscoveryId = providersHost.getActive('discovery');
    if (!isEnabled || !providersHost.get(activeDiscoveryId, 'discovery')) {
      return;
    }

    const { items, currentIndex } = useQueueStore.getState();
    const isLastTrack = currentIndex >= items.length - 1;
    if (!isLastTrack) {
      return;
    }

    const contextTracks: Track[] = items
      .slice(-CONTEXT_SIZE)
      .map((item) => item.track);

    try {
      const recommendations = await discoveryHost.getRecommendations(
        contextTracks,
        { variety: getMixVariety(), limit: RECOMMENDATION_LIMIT * 2 },
      );

      const selected = selectMixTracks(
        rankForTaste(recommendations),
        contextTracks,
        RECOMMENDATION_LIMIT,
        isRecommendationBlocked,
      );
      if (selected.length > 0) {
        useQueueStore.getState().addToQueueWithReason(selected, 'autoradio');
      }
    } catch (error) {
      reportError('discovery', {
        userMessage: i18n.t('discovery:recommendationError'),
        error,
      });
    }
  });
};
