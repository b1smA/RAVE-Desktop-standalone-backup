import { useTranslation } from '@nuclearplayer/i18n';
import { TrackTableLabels } from '@nuclearplayer/ui';

export const useTrackTableLabels = (): TrackTableLabels => {
  const { t } = useTranslation('trackTable');

  return {
    headers: {
      artist: t('headers.artist'),
      title: t('headers.title'),
      album: t('headers.album'),
      duration: t('headers.duration'),
    },
    favorite: t('favorite'),
    unfavorite: t('unfavorite'),
    playAll: t('playAll'),
    addAllToQueue: t('addAllToQueue'),
    playSelected: t('playSelected'),
    addSelectedToQueue: t('addSelectedToQueue'),
    addSelectedToPlaylist: t('addSelectedToPlaylist'),
    selectAll: t('selectAll'),
    selectTrack: t('selectTrack'),
    addToQueue: t('addToQueue'),
    trackOptions: t('trackOptions'),
    remove: t('remove'),
    filterPlaceholder: t('filterPlaceholder'),
  };
};
