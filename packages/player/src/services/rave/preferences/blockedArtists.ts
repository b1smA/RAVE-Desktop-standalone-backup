import type { Track } from '@nuclearplayer/model';

import { useRaveLibraryStore } from '../../../stores/raveLibraryStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { isRecommendationSnoozed } from './recommendationSnooze';

const SETTING_ID = 'core.playback.blockedArtists';
const FAMILY_FILTER_MARKERS = ['explicit', 'uncensored', '18+'];

const normalizeArtist = (name: string): string =>
  name.trim().toLocaleLowerCase();

export const getBlockedArtists = (): string[] => {
  const value = useSettingsStore.getState().getValue(SETTING_ID);
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
};

export const isArtistBlocked = (name: string): boolean =>
  getBlockedArtists().includes(normalizeArtist(name));

export const isTrackBlocked = (track: Track): boolean =>
  useRaveLibraryStore.getState().getTrackProfile(track).blocked === true ||
  isRecommendationSnoozed(track) ||
  track.artists.some((artist) => isArtistBlocked(artist.name));

export const isFamilySafe = (track: Track): boolean => {
  const enabled =
    useSettingsStore.getState().getValue('core.playback.familyMode') === true;
  if (!enabled) {
    return true;
  }
  const text =
    `${track.title} ${(track.tags ?? []).join(' ')}`.toLocaleLowerCase();
  return !FAMILY_FILTER_MARKERS.some((marker) => text.includes(marker));
};

export const blockTrackArtists = async (track: Track): Promise<void> => {
  const blocked = new Set(getBlockedArtists());
  track.artists.forEach((artist) => blocked.add(normalizeArtist(artist.name)));
  await useSettingsStore.getState().setValue(SETTING_ID, [...blocked]);
};

export const unblockTrackArtists = async (track: Track): Promise<void> => {
  const trackArtists = new Set(
    track.artists.map((artist) => normalizeArtist(artist.name)),
  );
  const blocked = getBlockedArtists().filter(
    (artist) => !trackArtists.has(artist),
  );
  await useSettingsStore.getState().setValue(SETTING_ID, blocked);
};
