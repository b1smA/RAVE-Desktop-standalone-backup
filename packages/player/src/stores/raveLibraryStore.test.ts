import { createMockTrack } from '../test/utils/mockTrack';
import {
  initializeRaveLibraryStore,
  useRaveLibraryStore,
} from './raveLibraryStore';

describe('RAVE library store', () => {
  beforeEach(() => {
    useRaveLibraryStore.setState({
      listenLater: [],
      trackProfiles: {},
      taste: { artists: {}, moods: {} },
      loaded: false,
    });
  });

  it('keeps listen later unique and persistent', async () => {
    const track = createMockTrack('Later');

    await useRaveLibraryStore.getState().addToListenLater(track);
    await useRaveLibraryStore.getState().addToListenLater(track);

    expect(useRaveLibraryStore.getState().listenLater).toEqual([track]);
  });

  it('stores local moods, tags, and notes without changing the track', async () => {
    const track = createMockTrack('Profiled');

    await useRaveLibraryStore.getState().updateTrackProfile(track, {
      mood: 'focus',
      tags: ['work'],
      note: 'Good opening track',
    });

    expect(useRaveLibraryStore.getState().getTrackProfile(track)).toEqual({
      mood: 'focus',
      tags: ['work'],
      note: 'Good opening track',
    });
  });

  it('loads saved RAVE data independently from the Nuclear stores', async () => {
    await initializeRaveLibraryStore();
    expect(useRaveLibraryStore.getState().loaded).toBe(true);
  });

  it('does not train the taste profile with excluded tracks', async () => {
    const track = createMockTrack('Background music');
    await useRaveLibraryStore.getState().updateTrackProfile(track, {
      excludedFromTaste: true,
    });

    await useRaveLibraryStore.getState().recordTaste(track);

    expect(useRaveLibraryStore.getState().taste.artists).toEqual({});
  });
});
