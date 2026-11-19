import { getSetting } from '../stores/settingsStore';

export const isDataSaverEnabled = (): boolean =>
  getSetting('core.playback.dataSaver') === true;

export const dataSaverMaxBitrate = (): number | undefined => {
  if (!isDataSaverEnabled()) {
    return undefined;
  }
  const value = getSetting('core.playback.dataSaverMaxBitrate');
  return typeof value === 'number' ? value : 128;
};

export const stripArtworkForDataSaver = <T>(value: T): T => {
  if (!isDataSaverEnabled() || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(stripArtworkForDataSaver) as T;
  }
  if (typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) =>
      key === 'artwork'
        ? []
        : [[key, stripArtworkForDataSaver(entry)] as const],
    ),
  ) as T;
};
