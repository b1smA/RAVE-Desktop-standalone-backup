import type { Track } from '@nuclearplayer/model';
import type { SettingDefinition } from '@nuclearplayer/plugin-sdk';

import { getSetting } from '../../../stores/settingsStore';
import { useSourceFeedbackStore } from '../../../stores/sourceFeedbackStore';
import { dataSaverMaxBitrate } from '../../dataSaver';
import type { SmartSourcePreferences } from './smartSourceRanker';

const DEFAULT_QUALITY_WEIGHT = 0.8;
const DEFAULT_SPEED_WEIGHT = 0.5;

export const RAVE_SMART_SOURCE_SETTINGS: SettingDefinition[] = [
  {
    id: 'playback.smartSourceSelection',
    title: 'preferences.playback.smartSourceSelection.title',
    description: 'preferences.playback.smartSourceSelection.description',
    category: 'playback',
    kind: 'boolean',
    default: true,
    widget: { type: 'toggle' },
  },
  {
    id: 'playback.smartSourceQualityWeight',
    title: 'preferences.playback.smartSourceQualityWeight.title',
    description: 'preferences.playback.smartSourceQualityWeight.description',
    category: 'playback',
    kind: 'number',
    default: DEFAULT_QUALITY_WEIGHT,
    widget: { type: 'slider', min: 0, max: 1, step: 0.05 },
  },
  {
    id: 'playback.smartSourceSpeedWeight',
    title: 'preferences.playback.smartSourceSpeedWeight.title',
    description: 'preferences.playback.smartSourceSpeedWeight.description',
    category: 'playback',
    kind: 'number',
    default: DEFAULT_SPEED_WEIGHT,
    widget: { type: 'slider', min: 0, max: 1, step: 0.05 },
  },
  {
    id: 'playback.smartSourcePreferredProviders',
    title: 'preferences.playback.smartSourcePreferredProviders.title',
    description:
      'preferences.playback.smartSourcePreferredProviders.description',
    category: 'playback',
    kind: 'string',
    default: '',
    widget: { type: 'text', placeholder: 'youtube, soundcloud' },
  },
  {
    id: 'playback.autoSkipRejectedVersions',
    title: 'preferences.playback.autoSkipRejectedVersions.title',
    description: 'preferences.playback.autoSkipRejectedVersions.description',
    category: 'playback',
    kind: 'boolean',
    default: true,
    widget: { type: 'toggle' },
  },
];

const readNumber = (id: string, fallback: number): number => {
  const value = getSetting(id);
  return typeof value === 'number' ? value : fallback;
};

export const isSmartSourceSelectionEnabled = (): boolean =>
  getSetting('core.playback.smartSourceSelection') !== false;

export const getSmartSourcePreferences = (
  activeProviderId?: string,
  track?: Track,
): SmartSourcePreferences => {
  const preferredProviders = getSetting(
    'core.playback.smartSourcePreferredProviders',
  );
  const feedback = track
    ? useSourceFeedbackStore.getState().forTrack(track)
    : [];
  const autoSkipRejectedVersions =
    getSetting('core.playback.autoSkipRejectedVersions') !== false;
  const versionFeedback = autoSkipRejectedVersions
    ? Object.values(useSourceFeedbackStore.getState().feedbackByTrack).flat()
    : feedback;
  return {
    qualityWeight: readNumber(
      'core.playback.smartSourceQualityWeight',
      DEFAULT_QUALITY_WEIGHT,
    ),
    speedWeight: readNumber(
      'core.playback.smartSourceSpeedWeight',
      DEFAULT_SPEED_WEIGHT,
    ),
    preferredProviderIds:
      typeof preferredProviders === 'string'
        ? preferredProviders
            .split(',')
            .map((providerId) => providerId.trim())
            .filter(Boolean)
        : [],
    activeProviderId,
    rejectedCandidateKeys: feedback.map(
      (entry) => `${entry.candidateProvider}:${entry.candidateId}`,
    ),
    rejectedVersionMarkers: feedback
      .concat(versionFeedback)
      .map((entry) => entry.reason)
      .filter((reason) => ['live', 'remix', 'slowed'].includes(reason)),
    autoSkipRejectedVersions,
    maxBitrateKbps: dataSaverMaxBitrate(),
  };
};
