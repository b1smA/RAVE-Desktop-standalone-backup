import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type { Track } from '@nuclearplayer/model';

import { startRadioFromTrack } from '../services/discoveryService';
import {
  blockTrackArtists,
  isTrackBlocked,
  unblockTrackArtists,
} from '../services/rave/preferences/blockedArtists';
import {
  clearRecommendationSnooze,
  RecommendationSnoozeDays,
  snoozeRecommendations,
} from '../services/rave/preferences/recommendationSnooze';
import { useFavoritesStore } from '../stores/favoritesStore';
import { TrackMood, useRaveLibraryStore } from '../stores/raveLibraryStore';
import {
  SourceFeedbackReason,
  useSourceFeedbackStore,
} from '../stores/sourceFeedbackStore';
import { useQueueActions } from './useQueueActions';

export const useTrackActions = () => {
  const queueActions = useQueueActions();
  const { favoriteTracks, isTrackFavorite, addTrack, removeTrack } =
    useFavoritesStore(
      useShallow((state) => ({
        favoriteTracks: state.tracks,
        isTrackFavorite: state.isTrackFavorite,
        addTrack: state.addTrack,
        removeTrack: state.removeTrack,
      })),
    );
  const addToListenLaterStore = useRaveLibraryStore(
    (state) => state.addToListenLater,
  );
  const getTrackProfile = useRaveLibraryStore((state) => state.getTrackProfile);
  const updateTrackProfile = useRaveLibraryStore(
    (state) => state.updateTrackProfile,
  );

  const playNow = useCallback(
    (track: Track) => queueActions.playNow(track),
    [queueActions],
  );

  const addNext = useCallback(
    (track: Track) => queueActions.addNext([track]),
    [queueActions],
  );

  const addToQueue = useCallback(
    (track: Track) => queueActions.addToQueue([track]),
    [queueActions],
  );

  const toggleFavorite = useCallback(
    (track: Track) => {
      if (isTrackFavorite(track.source)) {
        removeTrack(track.source);
      } else {
        addTrack(track);
      }
    },
    [isTrackFavorite, addTrack, removeTrack],
  );

  const isFavorite = useCallback(
    (track: Track) => isTrackFavorite(track.source),
    [favoriteTracks, isTrackFavorite],
  );

  const startRadio = useCallback(
    (track: Track) => startRadioFromTrack(track),
    [],
  );

  const toggleArtistBlocked = useCallback(async (track: Track) => {
    if (isTrackBlocked(track)) {
      await unblockTrackArtists(track);
    } else {
      await blockTrackArtists(track);
    }
  }, []);

  const addToListenLater = useCallback(
    (track: Track) => addToListenLaterStore(track),
    [addToListenLaterStore],
  );

  const toggleTrackBlocked = useCallback(
    (track: Track) => {
      const blocked = getTrackProfile(track).blocked === true;
      return updateTrackProfile(track, { blocked: !blocked });
    },
    [getTrackProfile, updateTrackProfile],
  );

  const setMood = useCallback(
    (track: Track, mood: TrackMood) => updateTrackProfile(track, { mood }),
    [updateTrackProfile],
  );

  const toggleTasteExclusion = useCallback(
    (track: Track) => {
      const excluded = getTrackProfile(track).excludedFromTaste === true;
      return updateTrackProfile(track, { excludedFromTaste: !excluded });
    },
    [getTrackProfile, updateTrackProfile],
  );

  const snooze = useCallback(
    (track: Track, days: RecommendationSnoozeDays) =>
      snoozeRecommendations(track, days),
    [],
  );

  const clearSnooze = useCallback(
    (track: Track) => clearRecommendationSnooze(track),
    [],
  );

  const reportWrongVersion = useCallback(
    async (track: Track, reason: SourceFeedbackReason) => {
      const candidate = track.streamCandidates?.find(
        (streamCandidate) => !streamCandidate.failed,
      );
      if (!candidate) {
        return;
      }
      await useSourceFeedbackStore.getState().report(track, candidate, reason);
      const alternatives = track.streamCandidates?.filter(
        (streamCandidate) =>
          streamCandidate.id !== candidate.id ||
          streamCandidate.source.provider !== candidate.source.provider,
      );
      if (alternatives?.length) {
        queueActions.playNow({ ...track, streamCandidates: alternatives });
      }
    },
    [queueActions],
  );

  return {
    playNow,
    addNext,
    addToQueue,
    toggleFavorite,
    isFavorite,
    startRadio,
    isArtistBlocked: isTrackBlocked,
    toggleArtistBlocked,
    addToListenLater,
    toggleTrackBlocked,
    setMood,
    reportWrongVersion,
    snoozeRecommendations: snooze,
    clearRecommendationSnooze: clearSnooze,
    toggleTasteExclusion,
  };
};
