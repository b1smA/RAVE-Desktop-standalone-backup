import { useCallback, useMemo } from 'react';

import type { Track } from '@nuclearplayer/model';

import { useQueueStore } from '../stores/queueStore';

// You can't replace this with lodash pick because it causes infinite re-renders
export const useQueueActions = () => {
  const addToQueue = useQueueStore((state) => state.addToQueue);
  const addNext = useQueueStore((state) => state.addNext);
  const addAt = useQueueStore((state) => state.addAt);
  const removeByIds = useQueueStore((state) => state.removeByIds);
  const removeByIndices = useQueueStore((state) => state.removeByIndices);
  const clearQueue = useQueueStore((state) => state.clearQueue);
  const reorder = useQueueStore((state) => state.reorder);
  const undoLastChange = useQueueStore((state) => state.undoLastChange);
  const updateItemState = useQueueStore((state) => state.updateItemState);
  const selectCandidate = useQueueStore((state) => state.selectCandidate);
  const goToNext = useQueueStore((state) => state.goToNext);
  const goToPrevious = useQueueStore((state) => state.goToPrevious);
  const goToIndex = useQueueStore((state) => state.goToIndex);
  const goToId = useQueueStore((state) => state.goToId);

  const playNow = useCallback(
    (track: Track) => {
      clearQueue();
      addToQueue([track]);
    },
    [clearQueue, addToQueue],
  );

  return useMemo(
    () => ({
      addToQueue,
      addNext,
      addAt,
      removeByIds,
      removeByIndices,
      clearQueue,
      reorder,
      undoLastChange,
      updateItemState,
      selectCandidate,
      goToNext,
      goToPrevious,
      goToIndex,
      goToId,
      playNow,
    }),
    [
      addAt,
      addNext,
      addToQueue,
      clearQueue,
      goToId,
      goToIndex,
      goToNext,
      goToPrevious,
      playNow,
      removeByIds,
      removeByIndices,
      reorder,
      selectCandidate,
      undoLastChange,
      updateItemState,
    ],
  );
};
