import { providersHost } from '../services/providersHost';
import { usePlaylistStore } from '../stores/playlistStore';
import { useQueueStore } from '../stores/queueStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSourceFeedbackStore } from '../stores/sourceFeedbackStore';
import { DiscoveryProviderBuilder } from '../test/builders/DiscoveryProviderBuilder';
import { PlaylistBuilder } from '../test/builders/PlaylistBuilder';
import { createMockTrack } from '../test/utils/mockTrack';
import { ConnectedTrackContextMenuWrapper as Wrapper } from './ConnectedTrackContextMenu.test-wrapper';

vi.mock(
  '../services/playlistFileService',
  async () =>
    (await import('../test/fixtures/playlists')).playlistFileServiceMock,
);

describe('ConnectedTrackContextMenu', () => {
  beforeEach(() => {
    providersHost.clear();
    usePlaylistStore.setState({
      index: [],
      playlists: new Map(),
      loaded: true,
    });
    useQueueStore.setState({ items: [], currentIndex: 0 });
    useSettingsStore.setState({ values: {} });
    useSourceFeedbackStore.setState({ feedbackByTrack: {}, loaded: true });
  });

  describe('source feedback', () => {
    it('remembers a rejected version and requests another source', async () => {
      const report = vi.spyOn(useSourceFeedbackStore.getState(), 'report');
      const track = createMockTrack('Test Track');
      track.streamCandidates = [
        {
          id: 'live-version',
          title: 'Test Track Live',
          failed: false,
          source: { provider: 'youtube', id: 'live-version' },
        },
        {
          id: 'studio-version',
          title: 'Test Track',
          failed: false,
          source: { provider: 'youtube', id: 'studio-version' },
        },
      ];

      Wrapper.mount(track);
      await Wrapper.open();
      await Wrapper.wrongVersion.open();
      await Wrapper.wrongVersion.select('Live instead of studio');

      expect(report).toHaveBeenCalled();

      await vi.waitFor(() => {
        expect(
          Object.values(
            useSourceFeedbackStore.getState().feedbackByTrack,
          ).flat(),
        ).toEqual([
          expect.objectContaining({
            candidateId: 'live-version',
            reason: 'live',
          }),
        ]);
      });
      await vi.waitFor(() => {
        expect(useQueueStore.getState().items[0]?.track.title).toBe(
          'Test Track',
        );
      });
    });
  });

  describe('track radio', () => {
    it('does not show the action without a discovery provider', async () => {
      Wrapper.mount();
      await Wrapper.open();

      expect(Wrapper.radioAction.query).not.toBeInTheDocument();
    });

    it('starts a persistent discovery queue from the selected track', async () => {
      const recommendation = createMockTrack('Recommended Track');
      const getRecommendations = vi.fn().mockResolvedValue([recommendation]);
      providersHost.register(
        new DiscoveryProviderBuilder()
          .withGetRecommendations(getRecommendations)
          .build(),
      );

      Wrapper.mount();
      await Wrapper.open();
      await Wrapper.radioAction.click();

      await vi.waitFor(() => {
        expect(useQueueStore.getState().items).toHaveLength(2);
      });
      expect(getRecommendations).toHaveBeenCalledWith(
        [expect.objectContaining({ title: 'Test Track' })],
        { variety: 0.5, limit: 10 },
      );
      expect(
        useQueueStore.getState().items.map((item) => item.track.title),
      ).toEqual(['Test Track', 'Recommended Track']);
      expect(
        useSettingsStore.getState().values['core.playback.discovery'],
      ).toBe(true);
    });
  });

  describe('artist recommendations', () => {
    it('blocks and restores recommendations for the track artist', async () => {
      Wrapper.mount();
      await Wrapper.open();

      expect(Wrapper.blockedArtistAction.element).toHaveTextContent(
        "Don't recommend this artist",
      );
      await Wrapper.blockedArtistAction.click();

      expect(
        useSettingsStore.getState().values['core.playback.blockedArtists'],
      ).toEqual(['test artist']);

      await Wrapper.open();
      expect(Wrapper.blockedArtistAction.element).toHaveTextContent(
        'Recommend this artist again',
      );
      await Wrapper.blockedArtistAction.click();

      expect(
        useSettingsStore.getState().values['core.playback.blockedArtists'],
      ).toEqual([]);
    });
  });

  describe('playlist submenu', () => {
    it('does not show submenu when no playlists exist', async () => {
      Wrapper.mount();
      await Wrapper.open();

      expect(Wrapper.submenu.trigger).not.toBeInTheDocument();
    });

    it('shows playlists in submenu and adds track on click', async () => {
      const addTracks = vi.fn();
      usePlaylistStore.setState({ addTracks });

      Wrapper.createPlaylists(
        new PlaylistBuilder().withId('p1').withName('Rock Classics'),
        new PlaylistBuilder().withName('Chill Vibes'),
      );

      Wrapper.mount();
      await Wrapper.open();

      expect(Wrapper.submenu.trigger).toHaveTextContent('Add to playlist');

      await Wrapper.submenu.open();

      expect(Wrapper.submenu.filterInput).not.toBeInTheDocument();
      expect(Wrapper.submenu.item('Rock Classics').element).toBeInTheDocument();
      expect(Wrapper.submenu.item('Chill Vibes').element).toBeInTheDocument();

      await Wrapper.submenu.item('Rock Classics').click();

      expect(addTracks).toHaveBeenCalledWith('p1', [
        expect.objectContaining({ title: 'Test Track' }),
      ]);
    });

    it('shows filter and caps at 5 items when many playlists exist', async () => {
      Wrapper.createPlaylists(
        new PlaylistBuilder().withName('Playlist 1'),
        new PlaylistBuilder().withName('Playlist 2'),
        new PlaylistBuilder().withName('Playlist 3'),
        new PlaylistBuilder().withName('Playlist 4'),
        new PlaylistBuilder().withName('Playlist 5'),
        new PlaylistBuilder().withName('Playlist 6'),
        new PlaylistBuilder().withName('Playlist 7'),
      );

      Wrapper.mount();
      await Wrapper.open();
      await Wrapper.submenu.open();

      expect(Wrapper.submenu.filterInput).toBeInTheDocument();
      expect(Wrapper.submenu.items).toHaveLength(5);
    });

    it('filters playlists by name', async () => {
      Wrapper.createPlaylists(
        new PlaylistBuilder().withName('Rock Classics'),
        new PlaylistBuilder().withName('Jazz Standards'),
        new PlaylistBuilder().withName('Rock Ballads'),
        new PlaylistBuilder().withName('Electronic'),
        new PlaylistBuilder().withName('Classical'),
      );

      Wrapper.mount();
      await Wrapper.open();
      await Wrapper.submenu.open();
      await Wrapper.submenu.filter('rock');

      expect(Wrapper.submenu.items).toHaveLength(2);
      expect(Wrapper.submenu.item('Rock Classics').element).toBeInTheDocument();
      expect(Wrapper.submenu.item('Rock Ballads').element).toBeInTheDocument();
    });
  });
});
