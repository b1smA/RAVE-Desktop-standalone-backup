import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react';
import { type FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button } from '@nuclearplayer/ui';

import { useCoreSetting } from '../hooks/useCoreSetting';
import { playbackManager } from '../services/playback';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';

export const ConnectedMiniPlayerControls: FC = () => {
  const { t } = useTranslation('playerBar');
  const [volume, setVolume] = useCoreSetting<number>('playback.volume');
  const { goToNext, goToPrevious } = useQueueStore(
    useShallow((state) => ({
      goToNext: state.goToNext,
      goToPrevious: state.goToPrevious,
    })),
  );
  const { duration, seek, seekTo, status } = useSoundStore(
    useShallow((state) => ({
      duration: state.duration,
      seek: state.seek,
      seekTo: state.seekTo,
      status: state.status,
    })),
  );
  const safeDuration = Number.isFinite(duration) ? Math.max(duration, 0) : 0;
  const safeSeek = Number.isFinite(seek)
    ? Math.min(Math.max(seek, 0), safeDuration)
    : 0;
  const isPlaying = status === 'playing';

  return (
    <div className="flex shrink-0 items-center gap-1 pr-3">
      <input
        data-testid="mini-player-seek-bar"
        type="range"
        min={0}
        max={safeDuration || 1}
        step={0.1}
        value={safeSeek}
        aria-label={t('miniPlayer.seek')}
        onChange={(event) => seekTo(Number(event.currentTarget.value))}
        className="accent-primary bg-foreground/15 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:bg-primary absolute right-0 bottom-0 left-0 h-[3px] cursor-pointer appearance-none [&::-moz-range-thumb]:size-2.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 hover:[&::-moz-range-thumb]:opacity-100 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 hover:[&::-webkit-slider-thumb]:opacity-100"
      />
      <Button
        size="xs"
        variant="text"
        title={t('miniPlayer.previous')}
        className="text-foreground/65 hover:text-primary rounded-full"
        onClick={goToPrevious}
      >
        <SkipBackIcon size={16} />
      </Button>
      <Button
        size="icon"
        variant="text"
        title={t(isPlaying ? 'miniPlayer.pause' : 'miniPlayer.play')}
        data-testid={isPlaying ? 'player-pause-button' : 'player-play-button'}
        className="bg-primary text-primary-foreground size-10 rounded-full hover:brightness-110"
        onClick={() => void playbackManager.toggle()}
      >
        {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      </Button>
      <Button
        size="xs"
        variant="text"
        title={t('miniPlayer.next')}
        className="text-foreground/65 hover:text-primary rounded-full"
        onClick={goToNext}
      >
        <SkipForwardIcon size={16} />
      </Button>
      <div className="ml-1 flex items-center gap-1.5">
        {(volume ?? 1) === 0 ? (
          <VolumeXIcon size={14} className="text-foreground/50" />
        ) : (
          <Volume2Icon size={14} className="text-foreground/50" />
        )}
        <input
          data-testid="mini-player-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round((volume ?? 1) * 100)}
          aria-label={t('audioOutput.volume')}
          onChange={(event) =>
            setVolume(Number(event.currentTarget.value) / 100)
          }
          className="accent-primary bg-foreground/15 [&::-webkit-slider-thumb]:bg-primary h-1 w-10 cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>
    </div>
  );
};
