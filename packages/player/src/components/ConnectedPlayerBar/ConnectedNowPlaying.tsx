import { useNavigate } from '@tanstack/react-router';
import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { FavoriteButton, PlayerBar } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../hooks/useCoreSetting';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useQueueStore } from '../../stores/queueStore';

export const ConnectedNowPlaying: FC = () => {
  const { t } = useTranslation('playerBar');
  const { t: tTrack } = useTranslation('track');
  const navigate = useNavigate();
  const [dataSaver] = useCoreSetting<boolean>('playback.dataSaver');
  const currentItem = useQueueStore((s) => s.getCurrentItem());
  const { isTrackFavorite, addTrack, removeTrack } = useFavoritesStore(
    useShallow((state) => ({
      isTrackFavorite: state.isTrackFavorite,
      addTrack: state.addTrack,
      removeTrack: state.removeTrack,
    })),
  );

  const track = currentItem?.track;
  const isFavorite = track ? isTrackFavorite(track.source) : false;

  const artwork = dataSaver
    ? undefined
    : pickArtwork(track?.artwork, 'thumbnail', 64);
  const title = track?.title ?? t('noTrackPlaying');
  const artist = track?.artists[0]?.name ?? '';
  const artistSource = track?.artists[0]?.source;
  const album = track?.album;

  const handleToggleFavorite = () => {
    if (!track) {
      return;
    }
    if (isFavorite) {
      removeTrack(track.source);
    } else {
      addTrack(track);
    }
  };

  return (
    <PlayerBar.NowPlaying
      title={title}
      artist={artist}
      coverUrl={artwork?.url}
      onArtistClick={
        artist
          ? () => {
              if (artistSource) {
                navigate({
                  to: '/artist/$providerId/$artistId',
                  params: {
                    providerId: artistSource.provider,
                    artistId: artistSource.id,
                  },
                });
              } else {
                navigate({ to: '/search', search: { q: artist } });
              }
            }
          : undefined
      }
      onTitleClick={
        album
          ? () =>
              navigate({
                to: '/album/$providerId/$albumId',
                params: {
                  providerId: album.source.provider,
                  albumId: album.source.id,
                },
              })
          : undefined
      }
      action={
        track && (
          <FavoriteButton
            size="sm"
            isFavorite={isFavorite}
            onToggle={handleToggleFavorite}
            ariaLabelAdd={tTrack('actions.addToFavorites')}
            ariaLabelRemove={tTrack('actions.removeFromFavorites')}
          />
        )
      }
    />
  );
};
