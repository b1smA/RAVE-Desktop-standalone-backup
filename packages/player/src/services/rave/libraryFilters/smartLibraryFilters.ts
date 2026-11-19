import type { Track } from '@nuclearplayer/model';

import type { TrackProfile } from '../../../stores/raveLibraryStore';
import { trackIdentity } from '../trackIdentity';

export type SmartLibraryFilter =
  'all' | 'offline' | 'untagged' | `mood:${string}` | `tag:${string}`;

export const filterLibraryTracks = (
  tracks: Track[],
  profiles: Record<string, TrackProfile>,
  filter: SmartLibraryFilter,
): Track[] =>
  tracks.filter((track) => {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'offline') {
      return Boolean(track.localFile);
    }
    const profile = profiles[trackIdentity(track)] ?? {};
    if (filter === 'untagged') {
      return !profile.mood && !profile.tags?.length;
    }
    if (filter.startsWith('mood:')) {
      return profile.mood === filter.slice('mood:'.length);
    }
    return (
      profile.tags?.some(
        (tag) => tag.toLocaleLowerCase() === filter.slice('tag:'.length),
      ) === true
    );
  });
