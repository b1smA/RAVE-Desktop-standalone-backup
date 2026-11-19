import { useSleepTimerStore } from './sleepTimerStore';
import { useSoundStore } from './soundStore';

describe('sleep timer store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSleepTimerStore.getState().cancel();
    useSoundStore.setState({ status: 'playing' });
  });

  afterEach(() => vi.useRealTimers());

  it('pauses playback when the timer expires', () => {
    useSleepTimerStore.getState().start(30);
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(useSoundStore.getState().status).toBe('paused');
    expect(useSleepTimerStore.getState().mode).toBe('off');
  });

  it('consumes the after-track mode once', () => {
    useSleepTimerStore.getState().afterTrack();

    expect(useSleepTimerStore.getState().consumeAfterTrack()).toBe(true);
    expect(useSleepTimerStore.getState().consumeAfterTrack()).toBe(false);
  });
});
