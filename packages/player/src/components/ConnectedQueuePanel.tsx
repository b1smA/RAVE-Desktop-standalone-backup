import { useNavigate } from '@tanstack/react-router';
import {
  EllipsisIcon,
  MoonIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react';
import { FC, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Dialog, Input, Popover, QueuePanel } from '@nuclearplayer/ui';

import { useCurrentQueueItem } from '../hooks/useCurrentQueueItem';
import { useQueue } from '../hooks/useQueue';
import { useQueueActions } from '../hooks/useQueueActions';
import { usePlaylistStore } from '../stores/playlistStore';
import { useQueueStore } from '../stores/queueStore';
import { useRaveLibraryStore } from '../stores/raveLibraryStore';
import { useSleepTimerStore } from '../stores/sleepTimerStore';

type ConnectedQueuePanelProps = {
  isCollapsed?: boolean;
};

const DEFAULT_SLEEP_TIMER_MINUTES = 30;

export const ConnectedQueuePanel: FC<ConnectedQueuePanelProps> = ({
  isCollapsed = false,
}) => {
  const { t } = useTranslation('queue');
  const queue = useQueue();
  const currentItem = useCurrentQueueItem();
  const actions = useQueueActions();
  const nextItem = queue.items[queue.currentIndex + 1];

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      actions.reorder(fromIndex, toIndex);
    },
    [actions],
  );

  const handleSelectItem = useCallback(
    (itemId: string) => {
      actions.goToId(itemId);
    },
    [actions],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      actions.removeByIds([itemId]);
    },
    [actions],
  );

  const labels = useMemo(
    () => ({
      emptyTitle: t('empty.title'),
      emptySubtitle: t('empty.subtitle'),
      removeButton: t('actions.remove'),
      playbackError: t('errors.playback'),
      noCandidates: t('candidates.empty'),
      candidateFailed: t('candidates.failed'),
      history: t('sections.history'),
      nowPlaying: t('sections.nowPlaying'),
      upNext: t('sections.upNext'),
    }),
    [t],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {nextItem?.selectionReason && (
        <div
          data-testid="queue-selection-reason"
          className="border-border bg-primary/10 mx-2 mb-2 rounded-md border px-3 py-2 text-xs"
        >
          {t(`reasons.${nextItem.selectionReason}`)}
        </div>
      )}
      <QueuePanel
        items={queue.items}
        currentItemId={currentItem?.id}
        isCollapsed={isCollapsed}
        reorderable={!isCollapsed}
        onReorder={handleReorder}
        onSelectItem={handleSelectItem}
        onRemoveItem={handleRemoveItem}
        onSelectCandidate={actions.selectCandidate}
        labels={labels}
      />
    </div>
  );
};

export const QueueHeaderActions: FC = () => {
  const { t } = useTranslation('queue');
  const { t: tPlaylists } = useTranslation('playlists');
  const navigate = useNavigate();
  const queue = useQueue();
  const { clearQueue, undoLastChange } = useQueueActions();
  const undoDepth = useQueueStore((state) => state.undoDepth);
  const saveQueueAsPlaylist = usePlaylistStore(
    (state) => state.saveQueueAsPlaylist,
  );
  const listenLater = useRaveLibraryStore((state) => state.listenLater);
  const clearListenLater = useRaveLibraryStore(
    (state) => state.clearListenLater,
  );
  const addToQueue = useQueueStore((state) => state.addToQueue);
  const sleepTimer = useSleepTimerStore(
    useShallow((state) => ({
      mode: state.mode,
      afterTrack: state.afterTrack,
      start: state.start,
      cancel: state.cancel,
    })),
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

  const handleSaveAsPlaylist = async () => {
    if (!playlistName.trim()) {
      return;
    }
    const playlistId = await saveQueueAsPlaylist(playlistName.trim());
    setSaveDialogOpen(false);
    setPlaylistName('');
    navigate({ to: '/playlists/$playlistId', params: { playlistId } });
  };

  if (queue.items.length === 0 && listenLater.length === 0) {
    return null;
  }

  return (
    <>
      {undoDepth > 0 && (
        <Button
          size="icon"
          data-testid="undo-queue-button"
          title={t('actions.undo')}
          onClick={undoLastChange}
        >
          <RotateCcwIcon />
        </Button>
      )}
      {queue.items.length > 0 && (
        <Button
          size="icon"
          data-testid="clear-queue-button"
          onClick={clearQueue}
        >
          <Trash2Icon />
        </Button>
      )}
      <Popover
        className="relative"
        trigger={
          <Button size="icon" data-testid="queue-more-button">
            <EllipsisIcon />
          </Button>
        }
        anchor="bottom end"
      >
        <Popover.Menu>
          <Popover.Item
            onClick={() => setSaveDialogOpen(true)}
            data-testid="save-queue-as-playlist"
          >
            {t('actions.saveAsPlaylist')}
          </Popover.Item>
          {listenLater.length > 0 && (
            <Popover.Item
              onClick={() => {
                addToQueue(listenLater);
                void clearListenLater();
              }}
              data-testid="play-listen-later"
            >
              {t('actions.playListenLater', { count: listenLater.length })}
            </Popover.Item>
          )}
          <Popover.Item onClick={sleepTimer.afterTrack}>
            <MoonIcon size={16} />
            {t('sleep.afterTrack')}
          </Popover.Item>
          <Popover.Item
            onClick={() => sleepTimer.start(DEFAULT_SLEEP_TIMER_MINUTES)}
          >
            {t('sleep.inMinutes', { count: DEFAULT_SLEEP_TIMER_MINUTES })}
          </Popover.Item>
          {sleepTimer.mode !== 'off' && (
            <Popover.Item onClick={sleepTimer.cancel}>
              {t('sleep.cancel')}
            </Popover.Item>
          )}
        </Popover.Menu>
      </Popover>
      <Dialog.Root
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveAsPlaylist();
          }}
        >
          <Dialog.Title>{t('actions.saveAsPlaylist')}</Dialog.Title>
          <div className="mt-4">
            <Input
              label={tPlaylists('name')}
              placeholder={tPlaylists('namePlaceholder')}
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              data-testid="save-queue-playlist-name-input"
              autoFocus
            />
          </div>
          <Dialog.Actions>
            <Dialog.Close>{t('common:actions.cancel')}</Dialog.Close>
            <Button type="submit">{t('common:actions.save')}</Button>
          </Dialog.Actions>
        </form>
      </Dialog.Root>
    </>
  );
};
