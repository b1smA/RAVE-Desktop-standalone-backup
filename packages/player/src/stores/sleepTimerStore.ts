import { create } from 'zustand';

import { useSoundStore } from './soundStore';

type SleepTimerMode = 'off' | 'after-track' | 'timed';

type SleepTimerState = {
  mode: SleepTimerMode;
  endsAt: number | null;
  start: (minutes: number) => void;
  afterTrack: () => void;
  cancel: () => void;
  consumeAfterTrack: () => boolean;
};

let timer: ReturnType<typeof setTimeout> | null = null;

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  mode: 'off',
  endsAt: null,
  start: (minutes) => {
    clearTimer();
    const durationMs = minutes * 60 * 1000;
    const endsAt = Date.now() + durationMs;
    timer = setTimeout(() => {
      useSoundStore.getState().pause();
      set({ mode: 'off', endsAt: null });
    }, durationMs);
    set({ mode: 'timed', endsAt });
  },
  afterTrack: () => {
    clearTimer();
    set({ mode: 'after-track', endsAt: null });
  },
  cancel: () => {
    clearTimer();
    set({ mode: 'off', endsAt: null });
  },
  consumeAfterTrack: () => {
    if (get().mode !== 'after-track') {
      return false;
    }
    set({ mode: 'off', endsAt: null });
    return true;
  },
}));
