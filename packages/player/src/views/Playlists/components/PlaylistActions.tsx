import {
  DownloadIcon,
  EllipsisVerticalIcon,
  PlayIcon,
  PlusIcon,
  ShuffleIcon,
  SparklesIcon,
} from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';
import { Button, cn, Popover } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../../hooks/useCoreSetting';
import { useQueueActions } from '../../../hooks/useQueueActions';
import { useTrackDownloads } from '../../../hooks/useTrackDownloads';
import { playbackManager } from '../../../services/playback';
import {
  rankTracksForTaste,
  RaveMixMode,
} from '../../../services/rave/mix/raveMix';
import { useQueueStore } from '../../../stores/queueStore';
import { useRaveLibraryStore } from '../../../stores/raveLibraryStore';

type PlaylistActionsProps = {
  tracks: Track[];
  menuItems?: ReactNode;
  className?: string;
};

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  tracks,
  menuItems,
  className,
}) => {
  const { t } = useTranslation('playlists');
  const { addToQueue, clearQueue } = useQueueActions();
  const { downloadTracks, downloading } = useTrackDownloads(tracks);
  const [mixMode] = useCoreSetting<RaveMixMode>('playback.raveMixMode');
  const artistTaste = useRaveLibraryStore((state) => state.taste.artists);

  const handlePlayAll = () => {
    clearQueue();
    addToQueue(tracks);
    playbackManager.play();
  };

  const handleAddToQueue = () => {
    addToQueue(tracks);
  };

  const handleShufflePlay = () => {
    const shuffledTracks = [...tracks];
    for (let index = shuffledTracks.length - 1; index > 0; index -= 1) {
      const targetIndex = Math.floor(Math.random() * (index + 1));
      [shuffledTracks[index], shuffledTracks[targetIndex]] = [
        shuffledTracks[targetIndex],
        shuffledTracks[index],
      ];
    }
    clearQueue();
    addToQueue(shuffledTracks);
    playbackManager.play();
  };

  const handleSmartShuffle = () => {
    const rankedTracks = rankTracksForTaste(
      tracks,
      artistTaste,
      mixMode ?? 'balanced',
    );
    const smartOrder = rankedTracks.flatMap((_, index) => {
      const oppositeIndex = rankedTracks.length - index - 1;
      return index <= oppositeIndex
        ? [rankedTracks[index], rankedTracks[oppositeIndex]]
        : [];
    });
    clearQueue();
    useQueueStore
      .getState()
      .addToQueueWithReason(Array.from(new Set(smartOrder)), 'taste-match');
    playbackManager.play();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="tertiary"
        onClick={handlePlayAll}
        data-testid="play-all-button"
      >
        <PlayIcon size={16} />
        {t('play')}
      </Button>
      <Popover
        className="relative"
        panelClassName="surface-background px-0 py-0"
        trigger={
          <Button
            variant="tertiary"
            size="icon"
            data-testid="playlist-actions-button"
          >
            <EllipsisVerticalIcon size={16} />
          </Button>
        }
        anchor="bottom start"
      >
        <Popover.Menu>
          <Popover.Item
            icon={<ShuffleIcon size={16} />}
            onClick={handleShufflePlay}
            data-testid="shuffle-play-action"
          >
            {t('shufflePlay')}
          </Popover.Item>
          <Popover.Item
            icon={<SparklesIcon size={16} />}
            onClick={handleSmartShuffle}
            data-testid="smart-shuffle-action"
          >
            {t('smartShuffle')}
          </Popover.Item>
          <Popover.Item
            icon={<PlusIcon size={16} />}
            onClick={handleAddToQueue}
            data-testid="add-to-queue-action"
          >
            {t('addToQueue')}
          </Popover.Item>
          <Popover.Item
            icon={<DownloadIcon size={16} />}
            onClick={downloadTracks}
            disabled={downloading}
            data-testid="download-playlist-action"
          >
            {t('downloadTracks')}
          </Popover.Item>
          {menuItems}
        </Popover.Menu>
      </Popover>
    </div>
  );
};
