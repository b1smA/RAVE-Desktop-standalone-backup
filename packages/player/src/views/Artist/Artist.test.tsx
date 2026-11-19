import { providersHost } from '../../services/providersHost';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { MetadataProviderBuilder } from '../../test/builders/MetadataProviderBuilder';
import {
  BIO_BEATLES,
  SEARCH_RESULT,
  TOP_TRACKS_BEATLES,
} from '../../test/fixtures/artists';
import { resetInMemoryTauriStore } from '../../test/utils/inMemoryTauriStore';
import { ArtistWrapper } from './Artist.test-wrapper';

const resetStores = () => {
  providersHost.clear();
  resetInMemoryTauriStore();
  useFavoritesStore.setState({
    tracks: [],
    albums: [],
    artists: [],
    loaded: true,
  });
};

describe('Artist view', () => {
  describe('with bio provider', () => {
    beforeEach(() => {
      resetStores();
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider().build(),
      );
    });

    it('(Snapshot) renders the artist view', async () => {
      const component = await ArtistWrapper.mount('The Beatles');
      expect(component.asFragment()).toMatchSnapshot();
    });

    it('shows loading states for bio, top tracks, related artists, and albums', async () => {
      providersHost.clear();
      const delay = () => new Promise<never>(() => {});
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider()
          .withId('bio-never-resolves')
          .withFetchArtistBio(delay)
          .withFetchArtistAlbums(delay)
          .withFetchArtistTopTracks(delay)
          .withFetchArtistRelatedArtists(delay)
          .build(),
      );

      await ArtistWrapper.mountNoWait();

      expect(await ArtistWrapper.bioHeader.findSkeleton()).toBeInTheDocument();
      expect(await ArtistWrapper.albums.findSkeleton()).toBeInTheDocument();
      expect(
        await ArtistWrapper.popularTracks.findSkeleton(),
      ).toBeInTheDocument();
      expect(
        await ArtistWrapper.similarArtists.findSkeleton(),
      ).toBeInTheDocument();
    });

    it('adds artist to favorites when clicking the heart button', async () => {
      vi.setSystemTime(new Date('2026-01-30T12:00:00.000Z'));
      await ArtistWrapper.mount('The Beatles');
      await ArtistWrapper.toggleFavorite();

      expect(useFavoritesStore.getState().artists).toMatchSnapshot();
    });

    it('renders provider biography markup as plain text', async () => {
      providersHost.clear();
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider()
          .withFetchArtistBio(async () => ({
            ...BIO_BEATLES,
            bio: 'Worked with &lt;a href="spotify:artist:wayne"&gt;Lil Wayne&lt;/a&gt; and &lt;a href="spotify:artist:rihanna"&gt;Rihanna&lt;/a&gt;.',
          }))
          .build(),
      );

      await ArtistWrapper.mount('The Beatles');

      expect(ArtistWrapper.bioHeader.biography).toHaveTextContent(
        'Worked with Lil Wayne and Rihanna.',
      );
      expect(ArtistWrapper.bioHeader.biography).not.toHaveTextContent('<a');
    });

    it('filters and sorts the extended discography', async () => {
      await ArtistWrapper.mount('The Beatles');

      await ArtistWrapper.discography.selectFilter('Singles & EPs');
      expect(ArtistWrapper.discography.titles).toEqual(['Hello Goodbye']);

      await ArtistWrapper.discography.selectFilter('Compilations');
      expect(ArtistWrapper.discography.titles).toEqual(['Collected Works']);

      await ArtistWrapper.discography.selectFilter('Live');
      expect(ArtistWrapper.discography.titles).toEqual(['Live at Test Hall']);

      await ArtistWrapper.discography.selectFilter('All');
      expect(ArtistWrapper.discography.versionLabels).toHaveLength(1);
      expect(ArtistWrapper.discography.titles).toEqual([
        'Hello Goodbye',
        'Live at Test Hall',
        'Collected Works',
        'Hello World LP',
      ]);

      await ArtistWrapper.discography.selectSort('Title: A–Z');
      expect(ArtistWrapper.discography.titles).toEqual([
        'Collected Works',
        'Hello Goodbye',
        'Hello World LP',
        'Live at Test Hall',
      ]);
    });

    it('sorts releases by complete dates and natural title order', async () => {
      providersHost.clear();
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider()
          .withFetchArtistAlbums(async () => [
            {
              title: 'Album 10',
              trackCount: 7,
              artists: [],
              source: { provider: 'test-metadata-provider', id: 'album-10' },
            },
            {
              title: 'Same Year Early',
              trackCount: 7,
              releaseDate: { precision: 'day', dateIso: '2024-01-15' },
              artists: [],
              source: { provider: 'test-metadata-provider', id: 'early' },
            },
            {
              title: 'Album 2',
              trackCount: 7,
              releaseDate: { precision: 'day', dateIso: '2023-06-01' },
              artists: [],
              source: { provider: 'test-metadata-provider', id: 'album-2' },
            },
            {
              title: 'Same Year Late',
              trackCount: 7,
              releaseDate: { precision: 'day', dateIso: '2024-11-20' },
              artists: [],
              source: { provider: 'test-metadata-provider', id: 'late' },
            },
          ])
          .build(),
      );

      await ArtistWrapper.mount('The Beatles');

      expect(ArtistWrapper.discography.titles).toEqual([
        'Same Year Late',
        'Same Year Early',
        'Album 2',
        'Album 10',
      ]);

      await ArtistWrapper.discography.selectSort('Year: oldest first');
      expect(ArtistWrapper.discography.titles).toEqual([
        'Album 2',
        'Same Year Early',
        'Same Year Late',
        'Album 10',
      ]);

      await ArtistWrapper.discography.selectSort('Title: A–Z');
      expect(ArtistWrapper.discography.titles).toEqual([
        'Album 2',
        'Album 10',
        'Same Year Early',
        'Same Year Late',
      ]);
    });

    it('classifies a one-track release as a single even when the provider calls it an album', async () => {
      providersHost.clear();
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider()
          .withFetchArtistAlbums(async () => [
            {
              title: 'Provider Marked Album',
              releaseType: 'album',
              trackCount: 1,
              artists: [],
              source: {
                provider: 'test-metadata-provider',
                id: 'single-marked-as-album',
              },
            },
          ])
          .build(),
      );
      await ArtistWrapper.mount('The Beatles');

      await ArtistWrapper.discography.selectFilter('Albums');
      expect(ArtistWrapper.discography.section).not.toBeInTheDocument();

      await ArtistWrapper.discography.selectFilter('Singles & EPs');
      expect(ArtistWrapper.discography.titles).toContain(
        'Provider Marked Album',
      );
    });

    it('loads missing release metrics before classifying the discography', async () => {
      providersHost.clear();
      providersHost.register(
        MetadataProviderBuilder.bioStyleProvider()
          .withFetchArtistAlbums(async () => [
            {
              title: 'Ambiguous Provider Album',
              releaseType: 'album',
              artists: [],
              source: {
                provider: 'test-metadata-provider',
                id: 'ambiguous-provider-album',
              },
            },
          ])
          .withFetchAlbumDetails(async () => ({
            title: 'Ambiguous Provider Album',
            artists: [{ name: 'Test Artist', roles: [] }],
            tracks: [
              {
                title: 'Only Track',
                artists: [],
                durationMs: 4 * 60 * 1000,
                source: {
                  provider: 'test-metadata-provider',
                  id: 'only-track',
                },
              },
            ],
            source: {
              provider: 'test-metadata-provider',
              id: 'ambiguous-provider-album',
            },
          }))
          .build(),
      );

      await ArtistWrapper.mount('The Beatles');

      await ArtistWrapper.discography.selectFilter('Albums');
      expect(ArtistWrapper.discography.section).not.toBeInTheDocument();

      await ArtistWrapper.discography.selectFilter('Singles & EPs');
      expect(ArtistWrapper.discography.titles).toContain(
        'Ambiguous Provider Album',
      );
    });

    it('removes artist from favorites when clicking the heart button again', async () => {
      await ArtistWrapper.mount('The Beatles');
      await ArtistWrapper.toggleFavorite();
      await ArtistWrapper.toggleFavorite();

      expect(useFavoritesStore.getState().artists).toHaveLength(0);
    });

    it('only renders widgets for capabilities the provider declares', async () => {
      providersHost.clear();
      providersHost.register(
        new MetadataProviderBuilder()
          .withSearchCapabilities(['unified', 'artists'])
          .withArtistMetadataCapabilities(['artistBio', 'artistTopTracks'])
          .withSearch(async () => SEARCH_RESULT)
          .withFetchArtistBio(async () => BIO_BEATLES)
          .withFetchArtistTopTracks(async () => TOP_TRACKS_BEATLES)
          .build(),
      );

      await ArtistWrapper.mount('The Beatles');

      expect(ArtistWrapper.socialHeader.element).not.toBeInTheDocument();
      expect(ArtistWrapper.albums.skeleton).not.toBeInTheDocument();
      expect(ArtistWrapper.similarArtists.skeleton).not.toBeInTheDocument();
      expect(ArtistWrapper.albums.cards).toHaveLength(0);
    });
  });

  describe('with social stats provider', () => {
    beforeEach(() => {
      resetStores();
      providersHost.register(
        MetadataProviderBuilder.socialStatsStyleProvider().build(),
      );
    });

    it('(Snapshot) renders the artist view with social stats', async () => {
      const component = await ArtistWrapper.mount('Deadmau5');
      expect(component.asFragment()).toMatchSnapshot();
    });

    it('shows loading states for social stats, top tracks, playlists, and related artists', async () => {
      providersHost.clear();
      const delay = () => new Promise<never>(() => {});
      providersHost.register(
        MetadataProviderBuilder.socialStatsStyleProvider()
          .withId('social-never-resolves')
          .withFetchArtistSocialStats(delay)
          .withFetchArtistTopTracks(delay)
          .withFetchArtistPlaylists(delay)
          .withFetchArtistRelatedArtists(delay)
          .build(),
      );

      await ArtistWrapper.mountNoWait();

      expect(
        await ArtistWrapper.socialHeader.findSkeleton(),
      ).toBeInTheDocument();
      expect(
        await ArtistWrapper.popularTracks.findSkeleton(),
      ).toBeInTheDocument();
      expect(await ArtistWrapper.playlists.findSkeleton()).toBeInTheDocument();
      expect(
        await ArtistWrapper.similarArtists.findSkeleton(),
      ).toBeInTheDocument();
    });

    it('does not render bio header or albums grid', async () => {
      await ArtistWrapper.mount('Deadmau5');

      expect(ArtistWrapper.bioHeader.skeleton).not.toBeInTheDocument();
      expect(ArtistWrapper.albums.skeleton).not.toBeInTheDocument();
    });
  });
});
