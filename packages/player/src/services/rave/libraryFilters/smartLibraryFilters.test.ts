import { createMockTrack } from '../../../test/utils/mockTrack';
import { trackIdentity } from '../trackIdentity';
import { filterLibraryTracks } from './smartLibraryFilters';

describe('smart library filters', () => {
  it('filters tracks by offline availability, mood, and local tag', () => {
    const offline = {
      ...createMockTrack('Offline'),
      localFile: { fileUri: 'file:///a.mp3' },
    };
    const focus = createMockTrack('Focus');
    const profiles = {
      [trackIdentity(focus)]: { mood: 'focus' as const, tags: ['work'] },
    };

    expect(filterLibraryTracks([offline, focus], profiles, 'offline')).toEqual([
      offline,
    ]);
    expect(
      filterLibraryTracks([offline, focus], profiles, 'mood:focus'),
    ).toEqual([focus]);
    expect(filterLibraryTracks([offline, focus], profiles, 'tag:work')).toEqual(
      [focus],
    );
  });
});
