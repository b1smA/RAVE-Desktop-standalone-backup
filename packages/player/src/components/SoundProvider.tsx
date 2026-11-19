import type { FC, PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  CrossfadeSound,
  LoggerProvider,
  Sound,
  SoundError,
} from '@nuclearplayer/hifi';
import type { TFunction } from '@nuclearplayer/i18n';
import { useTranslation } from '@nuclearplayer/i18n';

import { useCoreSetting } from '../hooks/useCoreSetting';
import { eventBus } from '../services/eventBus';
import { Logger } from '../services/logger';
import { getReplayGainDb } from '../services/loudnessAnalysis';
import { playbackManager } from '../services/playback';
import { useQueueStore } from '../stores/queueStore';
import { useSleepTimerStore } from '../stores/sleepTimerStore';
import { useSoundStore } from '../stores/soundStore';
import { errorMessage } from '../utils/errorMessage';

const describePlaybackError = (error: Error, t: TFunction): string => {
  if (error instanceof SoundError) {
    return t(`errors.hifi.${error.code}`, { details: error.details });
  }
  return errorMessage(error);
};

const MINIMUM_DURATION_TO_VALIDATE_SECONDS = 60;
const MAXIMUM_DURATION_RATIO = 0.6;
const MINIMUM_DURATION_DIFFERENCE_SECONDS = 30;
const PLAYBACK_POSITION_SAVE_INTERVAL_SECONDS = 15;

export const isTruncatedStream = (
  expectedDurationSeconds: number,
  actualDurationSeconds: number,
): boolean =>
  Number.isFinite(actualDurationSeconds) &&
  actualDurationSeconds > 0 &&
  expectedDurationSeconds >= MINIMUM_DURATION_TO_VALIDATE_SECONDS &&
  actualDurationSeconds / expectedDurationSeconds < MAXIMUM_DURATION_RATIO &&
  expectedDurationSeconds - actualDurationSeconds >=
    MINIMUM_DURATION_DIFFERENCE_SECONDS;

export const SoundProvider: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('streaming');
  const { src, status, seek } = useSoundStore(
    useShallow((state) => ({
      src: state.src,
      status: state.status,
      seek: state.seek,
    })),
  );
  const currentItem = useQueueStore((state) => state.getCurrentItem());
  const [crossfadeMs] = useCoreSetting<number>('playback.crossfadeMs');
  const [dataSaver] = useCoreSetting<boolean>('playback.dataSaver');
  const preload: HTMLAudioElement['preload'] = dataSaver ? 'metadata' : 'auto';
  const crossOrigin = '' as const;
  const [volume01] = useCoreSetting<number>('playback.volume');
  const [muted] = useCoreSetting<boolean>('playback.muted');
  const [sinkId] = useCoreSetting<string>('playback.audioOutputDeviceId');
  const volumePercent = muted ? 0 : Math.round((volume01 ?? 1) * 100);
  const replayGainDb = getReplayGainDb(currentItem?.track);
  const rejectedSourceRef = useRef<string | null>(null);
  const lastSavedSecondRef = useRef(0);
  const restoredItemRef = useRef<string | null>(null);
  const canCrossfade =
    (crossfadeMs ?? 0) > 0 &&
    (src?.protocol === 'http' ||
      src?.protocol === 'https' ||
      src?.protocol === 'file');
  const SoundComponent = canCrossfade ? CrossfadeSound : Sound;

  useEffect(() => {
    LoggerProvider.init(Logger.streaming);
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }
    navigator.mediaSession.metadata = currentItem
      ? new MediaMetadata({
          title: currentItem.track.title,
          artist: currentItem.track.artists
            .map((artist) => artist.name)
            .join(', '),
          album: currentItem.track.album?.title,
          artwork: dataSaver
            ? undefined
            : currentItem.track.artwork?.items.map((artwork) => ({
                src: artwork.url,
                sizes:
                  artwork.width && artwork.height
                    ? `${artwork.width}x${artwork.height}`
                    : undefined,
              })),
        })
      : null;
    navigator.mediaSession.playbackState =
      status === 'playing' ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', playbackManager.play);
    navigator.mediaSession.setActionHandler('pause', playbackManager.pause);
    navigator.mediaSession.setActionHandler(
      'previoustrack',
      useQueueStore.getState().goToPrevious,
    );
    navigator.mediaSession.setActionHandler(
      'nexttrack',
      useQueueStore.getState().goToNext,
    );
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        useSoundStore.getState().seekTo(details.seekTime);
      }
    });
  }, [currentItem, status]);

  const handleTimeUpdate = useCallback(
    ({ position, duration }: { position: number; duration: number }) => {
      useSoundStore.getState().updatePlayback(position, duration);

      const currentItem = useQueueStore.getState().getCurrentItem();
      if (
        currentItem &&
        Math.abs(position - lastSavedSecondRef.current) >=
          PLAYBACK_POSITION_SAVE_INTERVAL_SECONDS
      ) {
        lastSavedSecondRef.current = position;
        useQueueStore.getState().savePlaybackPosition(currentItem.id, position);
      }

      if (
        !src ||
        rejectedSourceRef.current === src.url ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return;
      }

      const expectedDurationSeconds =
        (currentItem?.track.durationMs ?? 0) / 1000;
      const isUnexpectedlyShort = isTruncatedStream(
        expectedDurationSeconds,
        duration,
      );

      if (!currentItem || !isUnexpectedlyShort) {
        return;
      }

      const candidate = currentItem.track.streamCandidates?.find(
        (streamCandidate) => streamCandidate.stream?.url === src.url,
      );
      if (!candidate) {
        return;
      }

      rejectedSourceRef.current = src.url;
      Logger.streaming.warn(
        `Rejected truncated stream for '${currentItem.track.title}': expected ${Math.round(expectedDurationSeconds)}s, received ${Math.round(duration)}s`,
      );
      useQueueStore
        .getState()
        .removeCandidate(
          currentItem.id,
          candidate.id,
          candidate.source.provider,
        );
      eventBus.emit('streamSourceInvalid', currentItem.track);
    },
    [src],
  );

  const handleEnd = useCallback(() => {
    if (useSleepTimerStore.getState().consumeAfterTrack()) {
      useSoundStore.getState().stop();
      return;
    }
    playbackManager.finishTrack();
  }, []);

  const handleCanPlay = useCallback(() => {
    const currentItem = useQueueStore.getState().getCurrentItem();
    if (currentItem) {
      useQueueStore
        .getState()
        .updateItemState(currentItem.id, { status: 'success' });
      const restored = useQueueStore.getState().restoredPosition;
      if (
        restored?.itemId === currentItem.id &&
        restored.seconds > 0 &&
        restoredItemRef.current !== currentItem.id
      ) {
        restoredItemRef.current = currentItem.id;
        useSoundStore.setState({ seek: restored.seconds });
      }
    }
  }, []);

  const handleSourceInvalid = useCallback(() => {
    const currentTrack = useQueueStore.getState().getCurrentItem()?.track;
    if (currentTrack) {
      eventBus.emit('streamSourceInvalid', currentTrack);
    }
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      const message = describePlaybackError(error, t);
      Logger.streaming.error(`Playback error: ${message}`);

      const currentItem = useQueueStore.getState().getCurrentItem();
      if (currentItem) {
        useQueueStore
          .getState()
          .updateItemState(currentItem.id, { status: 'error', error: message });
      }
    },
    [t],
  );

  return (
    <>
      {src && (
        <SoundComponent
          src={src}
          status={status}
          seek={seek}
          volume={volumePercent}
          replayGainDb={replayGainDb}
          sinkId={sinkId ?? 'default'}
          crossfadeMs={crossfadeMs}
          preload={preload}
          crossOrigin={crossOrigin}
          onTimeUpdate={handleTimeUpdate}
          onEnd={handleEnd}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onSourceInvalid={handleSourceInvalid}
        />
      )}
      {children}
    </>
  );
};
