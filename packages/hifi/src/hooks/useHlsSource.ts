import type Hls from 'hls.js';
import { RefObject, useEffect, useRef } from 'react';

import { AudioSource } from '../types';

const canPlayNativeHls = (audio: HTMLAudioElement): boolean =>
  audio.canPlayType('application/vnd.apple.mpegurl') !== '';

export const useHlsSource = (
  audioRef: RefObject<HTMLAudioElement | null>,
  src: AudioSource,
) => {
  const hlsRef = useRef<Hls | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    let cancelled = false;

    if (!audio) {
      return;
    }
    if (src.protocol !== 'hls') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }
    if (src.url === prevUrl.current) {
      return;
    }
    prevUrl.current = src.url;

    if (hlsRef.current) {
      // Means we have a new URL and need to destroy the old HLS instance
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    void import('hls.js').then(({ default: HlsRuntime }) => {
      if (cancelled || src.url !== prevUrl.current) {
        return;
      }

      if (HlsRuntime.isSupported()) {
        const hls = new HlsRuntime();
        hls.attachMedia(audio);
        hls.loadSource(src.url);
        hlsRef.current = hls;
      } else if (canPlayNativeHls(audio)) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio.src = src.url;
        audio.load();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, audioRef]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);
};
