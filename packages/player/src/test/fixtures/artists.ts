import type {
  AlbumRef,
  ArtistBio,
  ArtistRef,
  ArtistSocialStats,
  PlaylistRef,
  SearchResults,
  TrackRef,
} from '@nuclearplayer/model';

const TEST_PROVIDER_ID = 'test-metadata-provider';
const TEST_ARTIST_ID = 'test-artist-id';

const testSource = (id: string) => ({ provider: TEST_PROVIDER_ID, id });

export const SEARCH_RESULT: SearchResults = {
  artists: [
    {
      name: 'Test Artist',
      artwork: {
        items: [
          {
            url: 'https://img/avatar.jpg',
            purpose: 'avatar' as const,
            width: 300,
          },
          {
            url: 'https://img/cover.jpg',
            purpose: 'cover' as const,
            width: 1200,
          },
        ],
      },
      source: testSource(TEST_ARTIST_ID),
    },
  ],
};

export const BIO_BEATLES: ArtistBio = {
  name: 'The Beatles',
  bio: 'The Beatles were an English rock band formed in Liverpool in 1960. The group, whose best-known line-up comprised John Lennon, Paul McCartney, George Harrison and Ringo Starr, are regarded as the most influential band of all time.',
  onTour: true,
  tags: ['rock', 'indie', 'brit-pop'],
  artwork: {
    items: [
      { url: 'https://img/avatar.jpg', purpose: 'avatar' as const, width: 300 },
      { url: 'https://img/cover.jpg', purpose: 'cover' as const, width: 1200 },
    ],
  },
  source: testSource(TEST_ARTIST_ID),
};

export const SOCIAL_STATS_DEADMAU5: ArtistSocialStats = {
  name: 'Deadmau5',
  artwork: {
    items: [
      { url: 'https://img/avatar.jpg', purpose: 'avatar' as const, width: 300 },
    ],
  },
  city: 'Toronto',
  country: 'CA',
  followersCount: 5400000,
  followingsCount: 120,
  trackCount: 340,
  playlistCount: 22,
  source: testSource(TEST_ARTIST_ID),
};

export const ALBUMS_BEATLES: AlbumRef[] = [
  {
    title: 'Hello World LP',
    releaseType: 'album',
    trackCount: 7,
    releaseDate: { precision: 'year', dateIso: '2020' },
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        { url: 'https://img/debut.jpg', purpose: 'cover' as const, width: 300 },
      ],
    },
    source: testSource('album-1'),
  },
  {
    title: 'Hello World LP',
    releaseType: 'album',
    trackCount: 7,
    releaseDate: { precision: 'year', dateIso: '2020' },
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        {
          url: 'https://img/debut-alternative.jpg',
          purpose: 'cover' as const,
          width: 1200,
        },
      ],
    },
    source: testSource('album-1-alternative'),
  },
  {
    title: 'Hello Goodbye',
    releaseDate: { precision: 'year', dateIso: '2024' },
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        {
          url: 'https://img/single.jpg',
          purpose: 'cover' as const,
          width: 300,
        },
      ],
    },
    source: testSource('single-1'),
  },
  {
    title: 'Collected Works',
    releaseType: 'compilation',
    releaseDate: { precision: 'year', dateIso: '2022' },
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    source: testSource('compilation-1'),
  },
  {
    title: 'Live at Test Hall',
    releaseType: 'live',
    releaseDate: { precision: 'year', dateIso: '2023' },
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    source: testSource('live-1'),
  },
];

export const TOP_TRACKS_BEATLES: TrackRef[] = [
  {
    title: 'Hello Goodbye',
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        {
          url: 'https://img/single.jpg',
          purpose: 'thumbnail' as const,
          width: 64,
        },
      ],
    },
    source: testSource('single-track'),
  },
  {
    title: 'Smells Like Cheap Spirit',
    artists: [{ name: 'Test Artist', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        {
          url: 'https://img/track.jpg',
          purpose: 'thumbnail' as const,
          width: 64,
        },
      ],
    },
    source: testSource('track-1'),
  },
];

export const TOP_TRACKS_DEADMAU5: TrackRef[] = [
  {
    title: 'Strobe',
    artists: [{ name: 'Deadmau5', source: testSource(TEST_ARTIST_ID) }],
    artwork: {
      items: [
        {
          url: 'https://img/track.jpg',
          purpose: 'thumbnail' as const,
          width: 64,
        },
      ],
    },
    source: testSource('track-1'),
  },
];

export const PLAYLISTS_DEADMAU5: PlaylistRef[] = [
  {
    id: 'playlist-1',
    name: 'mau5trap selects',
    artwork: {
      items: [
        {
          url: 'https://img/playlist1.jpg',
          purpose: 'cover' as const,
          width: 300,
        },
      ],
    },
    source: testSource('playlist-1'),
  },
];

export const RELATED_ARTISTS_BEATLES: ArtistRef[] = [
  {
    name: 'John Lennon',
    artwork: {
      items: [
        {
          url: 'https://img/similar1.jpg',
          purpose: 'avatar' as const,
          width: 64,
        },
      ],
    },
    source: testSource('artist-2'),
  },
  {
    name: 'Kurt Cobain',
    artwork: {
      items: [
        {
          url: 'https://img/similar2.jpg',
          purpose: 'avatar' as const,
          width: 64,
        },
      ],
    },
    source: testSource('artist-3'),
  },
];

export const RELATED_ARTISTS_DEADMAU5: ArtistRef[] = [
  {
    name: 'Skrillex',
    artwork: {
      items: [
        {
          url: 'https://img/similar1.jpg',
          purpose: 'avatar' as const,
          width: 64,
        },
      ],
    },
    source: testSource('artist-2'),
  },
];
