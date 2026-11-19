import type { Track } from './index';

export type QueueItem = {
  id: string;
  track: Track;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  addedAtIso: string;
  selectionReason?: 'autoradio' | 'taste-match' | 'variety';
};

export type RepeatMode = 'off' | 'all' | 'one';

export type Queue = {
  items: QueueItem[];
  currentIndex: number;
};
