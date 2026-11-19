import { LazyStore } from '@tauri-apps/plugin-store';
import { create } from 'zustand';

import type { StreamCandidate, Track } from '@nuclearplayer/model';

import { trackIdentity } from '../services/rave/trackIdentity';

export type SourceFeedbackReason =
  | 'wrongArtist'
  | 'live'
  | 'remix'
  | 'slowed'
  | 'truncated'
  | 'insertions'
  | 'poorQuality';

export type SourceFeedback = {
  candidateId: string;
  candidateProvider: string;
  candidateTitle: string;
  reason: SourceFeedbackReason;
};

const store = new LazyStore('source-feedback.json');

type SourceFeedbackState = {
  feedbackByTrack: Record<string, SourceFeedback[]>;
  loaded: boolean;
  report: (
    track: Track,
    candidate: StreamCandidate,
    reason: SourceFeedbackReason,
  ) => Promise<void>;
  forTrack: (track: Track) => SourceFeedback[];
  loadFromDisk: () => Promise<void>;
};

export const useSourceFeedbackStore = create<SourceFeedbackState>(
  (set, get) => ({
    feedbackByTrack: {},
    loaded: false,
    loadFromDisk: async () => {
      const feedbackByTrack =
        (await store.get<Record<string, SourceFeedback[]>>('feedback')) ?? {};
      set({ feedbackByTrack, loaded: true });
    },
    forTrack: (track) => get().feedbackByTrack[trackIdentity(track)] ?? [],
    report: async (track, candidate, reason) => {
      const key = trackIdentity(track);
      const previous = get().feedbackByTrack[key] ?? [];
      const feedback = {
        candidateId: candidate.id,
        candidateProvider: candidate.source.provider,
        candidateTitle: candidate.title,
        reason,
      };
      const feedbackByTrack = {
        ...get().feedbackByTrack,
        [key]: [
          ...previous.filter(
            (entry) =>
              entry.candidateId !== candidate.id ||
              entry.candidateProvider !== candidate.source.provider,
          ),
          feedback,
        ],
      };
      set({ feedbackByTrack });
      await store.set('feedback', feedbackByTrack);
      await store.save();
    },
  }),
);

export const initializeSourceFeedbackStore = async (): Promise<void> => {
  await useSourceFeedbackStore.getState().loadFromDisk();
};
