import { LazyStore } from '@tauri-apps/plugin-store';
import { produce } from 'immer';
import partition from 'lodash-es/partition';
import { create } from 'zustand';

import type {
  Queue,
  QueueItem,
  StreamCandidate,
  Track,
} from '@nuclearplayer/model';
import { stripResolutionState } from '@nuclearplayer/model';

import { eventBus } from '../services/eventBus';
import { Logger } from '../services/logger';
import { trackIdentity } from '../services/rave/trackIdentity';
import { errorMessage } from '../utils/errorMessage';
import { createRandomId } from '../utils/randomId';
import { secondsToMs } from '../utils/time';
import { getSetting } from './settingsStore';
import { useSoundStore } from './soundStore';

const QUEUE_FILE = 'queue.json';
const store = new LazyStore(QUEUE_FILE);

type QueueStore = Queue & {
  isLoading: boolean;
  isReady: boolean;
  loadFromDisk: () => Promise<void>;
  addToQueue: (tracks: Track[]) => void;
  addToQueueWithReason: (
    tracks: Track[],
    selectionReason: QueueItem['selectionReason'],
  ) => void;
  addNext: (tracks: Track[]) => void;
  addAt: (tracks: Track[], index: number) => void;
  removeByIds: (ids: string[]) => void;
  removeByIndices: (indices: number[]) => void;
  clearQueue: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  undoDepth: number;
  undoLastChange: () => void;
  updateItemState: (id: string, updates: Partial<QueueItem>) => void;
  updateCandidate: (itemId: string, candidate: StreamCandidate) => void;
  removeCandidate: (
    itemId: string,
    candidateId: string,
    providerId?: string,
  ) => void;
  selectCandidate: (itemId: string, candidateId: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  goToId: (id: string) => void;
  getCurrentItem: () => QueueItem | undefined;
  getItemById: (id: string) => QueueItem | undefined;
  restoredPosition: { itemId: string; seconds: number } | null;
  savePlaybackPosition: (itemId: string, seconds: number) => void;
};

type QueueSnapshot = Pick<Queue, 'items' | 'currentIndex'>;

const MAX_UNDO_STEPS = 20;
const undoStack: QueueSnapshot[] = [];

export const resetQueueUndoHistory = () => {
  undoStack.length = 0;
  useQueueStore.setState({ undoDepth: 0 });
};

const rememberQueue = () => {
  const { items, currentIndex } = useQueueStore.getState();
  undoStack.push({ items: structuredClone(items), currentIndex });
  if (undoStack.length > MAX_UNDO_STEPS) {
    undoStack.shift();
  }
};

const createQueueItem = (
  track: Track,
  selectionReason?: QueueItem['selectionReason'],
): QueueItem => ({
  id: createRandomId(),
  track: stripResolutionState(track),
  status: 'idle',
  addedAtIso: new Date().toISOString(),
  selectionReason,
});

const getDirectionalIndex = (
  state: Pick<QueueStore, 'items' | 'currentIndex'>,
  direction: 'forward' | 'backward',
): number => {
  const { items, currentIndex } = state;
  const shuffleEnabled =
    (getSetting('core.playback.shuffle') as boolean) ?? false;
  const repeatMode = (getSetting('core.playback.repeat') as string) ?? 'off';

  if (items.length === 0) {
    return currentIndex;
  }

  if (shuffleEnabled) {
    return getShuffledIndex(items.length, currentIndex);
  }

  if (direction === 'forward') {
    if (currentIndex < items.length - 1) {
      return currentIndex + 1;
    }
    return repeatMode === 'all' ? 0 : currentIndex;
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  return repeatMode === 'all' ? items.length - 1 : currentIndex;
};

const getShuffledIndex = (length: number, currentIndex: number): number => {
  if (length <= 1) {
    return currentIndex;
  }

  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length);
  }

  return nextIndex;
};

const emitSkip = (): void => {
  eventBus.emit('playbackSkipped', {
    positionMs: secondsToMs(useSoundStore.getState().seek),
  });
};

const saveToDisk = async (): Promise<void> => {
  try {
    const state = useQueueStore.getState();
    await store.set('queue.items', state.items);
    await store.set('queue.currentIndex', state.currentIndex);
    await store.set('playback.position', state.restoredPosition);
    await store.save();
  } catch (error) {
    Logger.queue.error(`Failed to save queue: ${errorMessage(error)}`);
  }
};

const savePlaybackPositionToDisk = async (
  position: QueueStore['restoredPosition'],
): Promise<void> => {
  try {
    await store.set('playback.position', position);
    await store.save();
  } catch (error) {
    Logger.queue.error(
      `Failed to save playback position: ${errorMessage(error)}`,
    );
  }
};

const withPersistence = <T extends unknown[]>(
  fn: (...args: T) => void,
): ((...args: T) => void) => {
  return (...args: T) => {
    fn(...args);
    void saveToDisk();
  };
};

export const useQueueStore = create<QueueStore>((set, get) => ({
  items: [],
  currentIndex: 0,
  isReady: false,
  isLoading: false,
  undoDepth: 0,
  restoredPosition: null,

  loadFromDisk: async () => {
    resetQueueUndoHistory();
    set({ isLoading: true });
    const items = (await store.get<QueueItem[]>('queue.items')) ?? [];
    const currentIndex = (await store.get<number>('queue.currentIndex')) ?? 0;
    const restoredPosition =
      (await store.get<{ itemId: string; seconds: number }>(
        'playback.position',
      )) ?? null;

    const sanitizedIndex =
      currentIndex >= 0 && currentIndex < items.length ? currentIndex : 0;

    const resetItems = items.map((item) => ({
      ...item,
      status: 'idle' as const,
      error: undefined,
    }));

    set({
      items: resetItems,
      currentIndex: sanitizedIndex,
      isReady: true,
      isLoading: false,
      restoredPosition,
    });

    Logger.queue.info(`Loaded ${resetItems.length} items from disk`);
  },

  addToQueue: withPersistence((tracks: Track[]) => {
    rememberQueue();
    const preventDuplicates =
      getSetting('core.playback.preventQueueDuplicates') === true;
    const existing = new Set(
      get().items.map((item) => trackIdentity(item.track)),
    );
    const tracksToAdd = preventDuplicates
      ? tracks.filter((track) => {
          const key = trackIdentity(track);
          if (existing.has(key)) {
            return false;
          }
          existing.add(key);
          return true;
        })
      : tracks;
    set(
      produce((state: QueueStore) => {
        const newItems = tracksToAdd.map((track) => createQueueItem(track));
        state.items.push(...newItems);
      }),
    );
    Logger.queue.debug(`Added ${tracksToAdd.length} tracks to queue`);
    set({ undoDepth: undoStack.length });
  }),

  addToQueueWithReason: withPersistence(
    (tracks: Track[], selectionReason: QueueItem['selectionReason']) => {
      rememberQueue();
      const preventDuplicates =
        getSetting('core.playback.preventQueueDuplicates') === true;
      const existing = new Set(
        get().items.map((item) => trackIdentity(item.track)),
      );
      const tracksToAdd = preventDuplicates
        ? tracks.filter((track) => {
            const key = trackIdentity(track);
            if (existing.has(key)) {
              return false;
            }
            existing.add(key);
            return true;
          })
        : tracks;
      set(
        produce((state: QueueStore) => {
          state.items.push(
            ...tracksToAdd.map((track) =>
              createQueueItem(track, selectionReason),
            ),
          );
        }),
      );
      set({ undoDepth: undoStack.length });
    },
  ),

  addNext: (tracks: Track[]) => {
    const { currentIndex } = get();
    get().addAt(tracks, currentIndex + 1);
  },

  addAt: withPersistence((tracks: Track[], index: number) => {
    rememberQueue();
    set(
      produce((state: QueueStore) => {
        const newItems = tracks.map((track) => createQueueItem(track));
        state.items.splice(index, 0, ...newItems);
        if (index <= state.currentIndex) {
          state.currentIndex += newItems.length;
        }
      }),
    );
    set({ undoDepth: undoStack.length });
  }),

  removeByIds: withPersistence((ids: string[]) => {
    rememberQueue();
    const currentItem = get().getCurrentItem();
    const currentItemRemoved = currentItem && ids.includes(currentItem.id);

    set(
      produce((state: QueueStore) => {
        const idsSet = new Set(ids);
        const removedBeforeCurrent = state.items
          .slice(0, state.currentIndex)
          .filter((item) => idsSet.has(item.id)).length;

        state.items = state.items.filter((item) => !idsSet.has(item.id));
        state.currentIndex = Math.max(
          0,
          state.currentIndex - removedBeforeCurrent,
        );

        if (state.currentIndex >= state.items.length) {
          state.currentIndex = Math.max(0, state.items.length - 1);
        }
      }),
    );

    if (currentItemRemoved || get().items.length === 0) {
      useSoundStore.getState().stop();
    }
    set({ undoDepth: undoStack.length });
  }),

  removeByIndices: withPersistence((indices: number[]) => {
    rememberQueue();
    const currentIndex = get().currentIndex;
    const currentIndexRemoved = indices.includes(currentIndex);

    set(
      produce((state: QueueStore) => {
        const indicesSet = new Set(indices);
        const removedBeforeCurrent = indices.filter(
          (idx) => idx < state.currentIndex,
        ).length;

        state.items = state.items.filter((_, idx) => !indicesSet.has(idx));
        state.currentIndex = Math.max(
          0,
          state.currentIndex - removedBeforeCurrent,
        );

        if (state.currentIndex >= state.items.length) {
          state.currentIndex = Math.max(0, state.items.length - 1);
        }
      }),
    );

    if (currentIndexRemoved || get().items.length === 0) {
      useSoundStore.getState().stop();
    }
    set({ undoDepth: undoStack.length });
  }),

  clearQueue: withPersistence(() => {
    rememberQueue();
    const itemCount = get().items.length;
    set({ items: [], currentIndex: 0 });
    useSoundStore.getState().stop();
    Logger.queue.info(`Cleared queue (${itemCount} items removed)`);
    set({ undoDepth: undoStack.length });
  }),

  reorder: withPersistence((fromIndex: number, toIndex: number) => {
    rememberQueue();
    set(
      produce((state: QueueStore) => {
        const [movedItem] = state.items.splice(fromIndex, 1);
        state.items.splice(toIndex, 0, movedItem);

        if (state.currentIndex === fromIndex) {
          state.currentIndex = toIndex;
        } else if (
          fromIndex < state.currentIndex &&
          toIndex >= state.currentIndex
        ) {
          state.currentIndex -= 1;
        } else if (
          fromIndex > state.currentIndex &&
          toIndex <= state.currentIndex
        ) {
          state.currentIndex += 1;
        }
      }),
    );
    set({ undoDepth: undoStack.length });
  }),

  undoLastChange: withPersistence(() => {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      return;
    }
    set({
      items: snapshot.items,
      currentIndex: snapshot.currentIndex,
      undoDepth: undoStack.length,
    });
  }),

  updateItemState: withPersistence(
    (id: string, updates: Partial<QueueItem>) => {
      set(
        produce((state: QueueStore) => {
          const item = state.items.find((item) => item.id === id);
          if (item) {
            Object.assign(item, updates);
          }
        }),
      );
    },
  ),

  updateCandidate: (itemId: string, candidate: StreamCandidate) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    get().updateItemState(itemId, {
      track: {
        ...track,
        streamCandidates: track.streamCandidates?.map((current) => {
          if (
            current.id === candidate.id &&
            current.source.provider === candidate.source.provider
          ) {
            return candidate;
          }
          return current;
        }),
      },
    });
  },

  removeCandidate: (
    itemId: string,
    candidateId: string,
    providerId?: string,
  ) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    get().updateItemState(itemId, {
      track: {
        ...track,
        streamCandidates: track.streamCandidates?.filter(
          (current) =>
            current.id !== candidateId ||
            (providerId !== undefined &&
              current.source.provider !== providerId),
        ),
      },
    });
  },

  selectCandidate: (itemId: string, candidateId: string) => {
    const item = get().getItemById(itemId);
    if (!item) {
      return;
    }
    const { track } = item;
    const [selected, rest] = partition(
      track.streamCandidates ?? [],
      (candidate) => candidate.id === candidateId,
    );
    const retried = selected.map((candidate) => ({
      ...candidate,
      failed: false,
    }));
    get().updateItemState(itemId, {
      track: { ...track, streamCandidates: [...retried, ...rest] },
    });
  },

  goToNext: withPersistence(() => {
    const state = get();
    const nextIndex = getDirectionalIndex(state, 'forward');
    if (nextIndex !== state.currentIndex) {
      emitSkip();
      useSoundStore.getState().stop();
      set({ currentIndex: nextIndex });
      if (getSetting('core.playback.autoCleanQueue') === true) {
        const historyLimit = Math.max(
          0,
          Number(getSetting('core.playback.queueHistoryLimit') ?? 20),
        );
        const removeCount = Math.max(0, nextIndex - historyLimit);
        if (removeCount > 0) {
          set((current) => ({
            items: current.items.slice(removeCount),
            currentIndex: current.currentIndex - removeCount,
          }));
        }
      }
      Logger.queue.debug(`Moved to next track (index ${nextIndex})`);
    }
  }),

  goToPrevious: withPersistence(() => {
    const state = get();
    const previousIndex = getDirectionalIndex(state, 'backward');
    if (previousIndex !== state.currentIndex) {
      emitSkip();
      useSoundStore.getState().stop();
      set({ currentIndex: previousIndex });
      Logger.queue.debug(`Moved to previous track (index ${previousIndex})`);
    }
  }),

  goToIndex: withPersistence((index: number) => {
    const { items, currentIndex } = get();
    if (index >= 0 && index < items.length && index !== currentIndex) {
      emitSkip();
      useSoundStore.getState().stop();
      set({ currentIndex: index });
    }
  }),

  goToId: withPersistence((id: string) => {
    const { items, currentIndex } = get();
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1 && index !== currentIndex) {
      emitSkip();
      useSoundStore.getState().stop();
      set({ currentIndex: index });
    }
  }),

  getCurrentItem: () => {
    const { items, currentIndex } = get();
    return items[currentIndex];
  },

  getItemById: (id: string) => {
    return get().items.find((item) => item.id === id);
  },

  savePlaybackPosition: (itemId, seconds) => {
    const restoredPosition = { itemId, seconds };
    set({ restoredPosition });
    void savePlaybackPositionToDisk(restoredPosition);
  },
}));

export const initializeQueueStore = async (): Promise<void> => {
  await useQueueStore.getState().loadFromDisk();
};
