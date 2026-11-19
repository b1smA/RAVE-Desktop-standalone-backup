import type {
  Album,
  AlbumRef,
  ArtistBio,
  ArtistRef,
  ArtistSocialStats,
  PlaylistRef,
  SearchCategory,
  SearchParams,
  SearchResults,
  TrackRef,
} from '@nuclearplayer/model';
import {
  MissingCapabilityError,
  type ArtistMetadataCapability,
  type MetadataHost,
  type MetadataProvider,
} from '@nuclearplayer/plugin-sdk';

import { stripArtworkForDataSaver } from './dataSaver';
import { providersHost } from './providersHost';

const ALL_CATEGORIES: SearchCategory[] = [
  'artists',
  'albums',
  'tracks',
  'playlists',
];

const onlyCategories = (values: string[] | undefined): SearchCategory[] => {
  if (!values) {
    return [];
  }

  // Dedupe categories and filter out junk
  const set = new Set<SearchCategory>(ALL_CATEGORIES);
  return values.filter((v): v is SearchCategory =>
    set.has(v as SearchCategory),
  );
};

const resolveTypes = (
  provider: MetadataProvider,
  requested: SearchCategory[] | undefined,
): SearchCategory[] => {
  return requested ?? onlyCategories(provider.searchCapabilities);
};

const executeMetadataSearch = async (
  provider: MetadataProvider,
  params: SearchParams,
): Promise<SearchResults> => {
  const unified =
    provider.searchCapabilities?.includes('unified') && provider.search;
  if (unified) {
    return provider.search!(params);
  }

  const types = resolveTypes(provider, params.types);
  const want = new Set(types);

  const artistsPromise =
    want.has('artists') && provider.searchArtists
      ? provider.searchArtists({ query: params.query, limit: params.limit })
      : undefined;
  const albumsPromise =
    want.has('albums') && provider.searchAlbums
      ? provider.searchAlbums({ query: params.query, limit: params.limit })
      : undefined;
  const tracksPromise =
    want.has('tracks') && provider.searchTracks
      ? provider.searchTracks({ query: params.query, limit: params.limit })
      : undefined;
  const playlistsPromise =
    want.has('playlists') && provider.searchPlaylists
      ? provider.searchPlaylists({ query: params.query, limit: params.limit })
      : undefined;

  const [artists, albums, tracks, playlists] = await Promise.all([
    artistsPromise ?? Promise.resolve(undefined),
    albumsPromise ?? Promise.resolve(undefined),
    tracksPromise ?? Promise.resolve(undefined),
    playlistsPromise ?? Promise.resolve(undefined),
  ]);

  const result: SearchResults = {};
  if (artists) {
    result.artists = artists;
  }
  if (albums) {
    result.albums = albums;
  }
  if (tracks) {
    result.tracks = tracks;
  }
  if (playlists) {
    result.playlists = playlists;
  }
  return result;
};

const normalizeSearchText = (value: string): string =>
  value.normalize('NFKD').toLocaleLowerCase().trim();

const rankByQuery = <T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] => {
  const normalizedQuery = normalizeSearchText(query);
  const score = (item: T): number => {
    const text = normalizeSearchText(getText(item));
    if (text === normalizedQuery) {
      return 0;
    }
    if (text.startsWith(normalizedQuery)) {
      return 1;
    }
    if (text.includes(normalizedQuery)) {
      return 2;
    }
    return 3;
  };

  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ item }) => item);
};

const uniqueBy = <T>(items: T[], getKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeSearchText(getKey(item));
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const searchAllMetadataProviders = async (
  params: SearchParams,
): Promise<SearchResults> => {
  const providers = providersHost.list('metadata');
  if (providers.length === 0) {
    throw new Error('No metadata provider available');
  }

  const settled = await Promise.allSettled(
    providers.map((provider) => executeMetadataSearch(provider, params)),
  );
  const successful = settled.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  if (successful.length === 0) {
    const firstFailure = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    throw firstFailure?.reason ?? new Error('Search failed');
  }

  const artists = uniqueBy(
    successful.flatMap((result) => result.artists ?? []),
    (artist) => artist.name,
  );
  const albums = uniqueBy(
    successful.flatMap((result) => result.albums ?? []),
    (album) =>
      `${album.title}:${album.artists?.map((artist) => artist.name).join(',') ?? ''}`,
  );
  const tracks = uniqueBy(
    successful.flatMap((result) => result.tracks ?? []),
    (track) =>
      `${track.title}:${track.artists.map((artist) => artist.name).join(',')}`,
  );
  const playlists = uniqueBy(
    successful.flatMap((result) => result.playlists ?? []),
    (playlist) => playlist.name,
  );

  return {
    artists: rankByQuery(artists, params.query, (artist) => artist.name),
    albums: rankByQuery(albums, params.query, (album) => album.title),
    tracks: rankByQuery(tracks, params.query, (track) => track.title),
    playlists: rankByQuery(
      playlists,
      params.query,
      (playlist) => playlist.name,
    ),
  };
};

export const createMetadataHost = (): MetadataHost => {
  const getProvider = (providerId?: string): MetadataProvider | undefined =>
    providersHost.get<MetadataProvider>(
      providerId ?? providersHost.getActive('metadata'),
      'metadata',
    );

  const withArtistCapability =
    <TResult>(
      capability: ArtistMetadataCapability,
      method: keyof MetadataProvider,
    ) =>
    async (entityId: string, providerId?: string): Promise<TResult> => {
      const provider = getProvider(providerId);
      if (!provider) {
        throw new Error('No metadata provider available');
      }
      if (!provider.artistMetadataCapabilities?.includes(capability)) {
        throw new MissingCapabilityError(capability, provider.name);
      }
      return stripArtworkForDataSaver(
        await (provider[method] as (id: string) => Promise<TResult>)!(entityId),
      );
    };

  return {
    search: async (
      params: SearchParams,
      providerId?: string,
    ): Promise<SearchResults> => {
      const provider = getProvider(providerId);
      if (!provider) {
        throw new Error('No metadata provider available');
      }
      return stripArtworkForDataSaver(
        await executeMetadataSearch(provider, params),
      );
    },

    fetchArtistBio: withArtistCapability<ArtistBio>(
      'artistBio',
      'fetchArtistBio',
    ),
    fetchArtistSocialStats: withArtistCapability<ArtistSocialStats>(
      'artistSocialStats',
      'fetchArtistSocialStats',
    ),
    fetchArtistAlbums: withArtistCapability<AlbumRef[]>(
      'artistAlbums',
      'fetchArtistAlbums',
    ),
    fetchArtistTopTracks: withArtistCapability<TrackRef[]>(
      'artistTopTracks',
      'fetchArtistTopTracks',
    ),
    fetchArtistPlaylists: withArtistCapability<PlaylistRef[]>(
      'artistPlaylists',
      'fetchArtistPlaylists',
    ),
    fetchArtistRelatedArtists: withArtistCapability<ArtistRef[]>(
      'artistRelatedArtists',
      'fetchArtistRelatedArtists',
    ),

    fetchAlbumDetails: async (
      albumId: string,
      providerId?: string,
    ): Promise<Album> => {
      const provider = getProvider(providerId);
      if (!provider) {
        throw new Error('No metadata provider available');
      }
      if (!provider.albumMetadataCapabilities?.includes('albumDetails')) {
        throw new MissingCapabilityError('albumDetails', provider.name);
      }
      return stripArtworkForDataSaver(
        await provider.fetchAlbumDetails!(albumId)!,
      );
    },
  };
};

export const metadataHost = createMetadataHost();
