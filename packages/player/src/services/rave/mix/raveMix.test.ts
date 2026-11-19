import { createMockTrack } from '../../../test/utils/mockTrack';
import {
  rankTracksForTaste,
  selectMixTracks,
  varietyForMixMode,
} from './raveMix';

describe('RAVE Mix', () => {
  it('removes tracks already present in the listening context', () => {
    const existing = createMockTrack('Existing');
    const fresh = createMockTrack('Fresh');
    expect(selectMixTracks([existing, fresh], [existing], 5)).toEqual([fresh]);
  });

  it('limits repeated artists', () => {
    const tracks = ['One', 'Two', 'Three'].map((title) => ({
      ...createMockTrack(title),
      artists: [{ name: 'Same artist', roles: [] }],
    }));
    expect(selectMixTracks(tracks, [], 5)).toHaveLength(2);
  });

  it('removes tracks by blocked artists', () => {
    const blocked = createMockTrack('Blocked');
    const allowed = createMockTrack('Allowed');

    expect(
      selectMixTracks(
        [blocked, allowed],
        [],
        5,
        (track) => track.title === 'Blocked',
      ),
    ).toEqual([allowed]);
  });

  it('maps branded modes to predictable variety', () => {
    expect(varietyForMixMode('focus', 0.5)).toBe(0.15);
    expect(varietyForMixMode('balanced', 0.42)).toBe(0.42);
    expect(varietyForMixMode('explore', 0.5)).toBe(0.85);
  });

  it('uses the local taste profile for focus and explore modes', () => {
    const familiar = {
      ...createMockTrack('Familiar'),
      artists: [{ name: 'Known', roles: [] }],
    };
    const newArtist = {
      ...createMockTrack('New'),
      artists: [{ name: 'New', roles: [] }],
    };
    const taste = { known: 10 };

    expect(rankTracksForTaste([newArtist, familiar], taste, 'focus')).toEqual([
      familiar,
      newArtist,
    ]);
    expect(rankTracksForTaste([familiar, newArtist], taste, 'explore')).toEqual([
      newArtist,
      familiar,
    ]);
  });
});
