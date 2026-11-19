import { FC, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import {
  Button,
  Dialog,
  Select,
  TrackTable,
  TrackTableActions,
  TrackTableProps,
} from '@nuclearplayer/ui';

import { useQueueActions } from '../hooks/useQueueActions';
import { useTrackActions } from '../hooks/useTrackActions';
import { useTrackTableLabels } from '../hooks/useTrackTableLabels';
import { usePlaylistStore } from '../stores/playlistStore';
import { ConnectedTrackContextMenu } from './ConnectedTrackContextMenu';

type ConnectedTrackTableProps = Omit<
  TrackTableProps<Track>,
  'actions' | 'meta' | 'labels'
> & {
  actions?: Pick<TrackTableActions<Track>, 'onRemove' | 'onReorder'>;
};

export const ConnectedTrackTable: FC<ConnectedTrackTableProps> = (props) => {
  const { actions: externalActions, ...restProps } = props;
  const trackActions = useTrackActions();
  const queueActions = useQueueActions();
  const labels = useTrackTableLabels();
  const { t } = useTranslation('playlists');
  const playlists = usePlaylistStore((state) => state.index);
  const addTracks = usePlaylistStore((state) => state.addTracks);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [playlistId, setPlaylistId] = useState('');

  const closePlaylistDialog = () => {
    setSelectedTracks([]);
    setPlaylistId('');
  };

  const addSelectedTracks = async () => {
    if (!playlistId) {
      return;
    }
    await addTracks(playlistId, selectedTracks);
    closePlaylistDialog();
  };

  return (
    <>
      <TrackTable
        {...restProps}
        labels={labels}
        display={{
          displayFavorite: true,
          ...restProps.display,
        }}
        actions={{
          onAddToQueue: trackActions.addToQueue,
          onPlayNow: trackActions.playNow,
          onPlayNext: trackActions.addNext,
          onToggleFavorite: trackActions.toggleFavorite,
          onRemove: externalActions?.onRemove,
          onReorder: externalActions?.onReorder,
          onPlayAll: () => {
            queueActions.clearQueue();
            queueActions.addToQueue(restProps.tracks);
          },
          onAddAllToQueue: () => {
            queueActions.addToQueue(restProps.tracks);
          },
          onPlaySelected: (tracks) => {
            queueActions.clearQueue();
            queueActions.addToQueue(tracks);
          },
          onAddSelectedToQueue: queueActions.addToQueue,
          onAddSelectedToPlaylist:
            playlists.length > 0 ? setSelectedTracks : undefined,
        }}
        meta={{
          isTrackFavorite: trackActions.isFavorite,
          ContextMenuWrapper: ConnectedTrackContextMenu,
        }}
      />
      <Dialog.Root
        isOpen={selectedTracks.length > 0}
        onClose={closePlaylistDialog}
      >
        <Dialog.Title>{t('addSelectedTitle')}</Dialog.Title>
        <div className="mt-4">
          <Select
            options={playlists.map((playlist) => ({
              id: playlist.id,
              label: playlist.name,
            }))}
            value={playlistId}
            onValueChange={setPlaylistId}
            placeholder={t('selectPlaylist')}
          />
        </div>
        <Dialog.Actions>
          <Dialog.Close>{t('common:actions.cancel')}</Dialog.Close>
          <Button disabled={!playlistId} onClick={addSelectedTracks}>
            {t('common:actions.add')}
          </Button>
        </Dialog.Actions>
      </Dialog.Root>
    </>
  );
};
