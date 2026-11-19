import { useCallback, useEffect, useRef } from 'react';

import { useAudioEvents } from './hooks/useAudioEvents';
import { useAudioLoader } from './hooks/useAudioLoader';
import { useAudioSeek } from './hooks/useAudioSeek';
import { useHlsSource } from './hooks/useHlsSource';
import { useMseSource } from './hooks/useMseSource';
import { usePlaybackStatus } from './hooks/usePlaybackStatus';
import { useStartPosition } from './hooks/useStartPosition';
import { SoundProps } from './types';

export const Sound: React.FC<SoundProps> = ({
  src,
  status,
  seek,
  volume,
  replayGainDb = 0,
  sinkId,
  preload = 'auto',
  crossOrigin = '',
  onTimeUpdate,
  onEnd,
  onLoadStart,
  onCanPlay,
  onError,
  onSourceInvalid,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useAudioSeek(audioRef, seek);
  useStartPosition(audioRef, src);
  useAudioLoader(audioRef, src);
  useHlsSource(audioRef, src);
  useMseSource(audioRef, src, onError, onSourceInvalid);
  usePlaybackStatus(audioRef, status, src.url, onError);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sinkId || typeof audio.setSinkId !== 'function') {
      return;
    }
    void audio.setSinkId(sinkId).catch(onError);
  }, [onError, sinkId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || volume === undefined) {
      return;
    }

    const replayGainMultiplier = 10 ** (replayGainDb / 20);
    audio.volume = Math.max(
      0,
      Math.min(1, (volume / 100) * replayGainMultiplier),
    );
  }, [replayGainDb, volume]);

  const handleCanPlay = useCallback(() => {
    onCanPlay?.();
  }, [onCanPlay]);

  const handleLoadStart = useCallback(() => {
    onLoadStart?.();
  }, [onLoadStart]);

  const { handleTimeUpdate, handleError } = useAudioEvents({
    onTimeUpdate,
    onError,
  });

  return (
    <audio
      ref={audioRef}
      hidden
      preload={preload}
      crossOrigin={crossOrigin}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnd}
      onLoadStart={handleLoadStart}
      onCanPlay={handleCanPlay}
      onError={handleError}
    />
  );
};
