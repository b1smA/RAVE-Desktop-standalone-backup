import { useNavigate } from '@tanstack/react-router';
import { FC, useMemo, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import type { AlbumRef } from '@nuclearplayer/model';
import type { MetadataProvider } from '@nuclearplayer/plugin-sdk';
import {
  Button,
  Card,
  CardGrid,
  FilterChips,
  Popover,
  Select,
} from '@nuclearplayer/ui';

import { providersHost } from '../../../services/providersHost';
import {
  classifyReleaseFormat,
  isCompilationRelease,
} from '../../../services/releaseClassification';
import { useArtistAlbums } from '../hooks/useArtistAlbums';
import { useArtistTopTracks } from '../hooks/useArtistTopTracks';

type ArtistAlbumsGridProps = {
  providerId: string;
  artistId: string;
  'data-testid'?: string;
};

const SINGLE_TITLE_PATTERN = /(?:\s[-–—]\s*)?(?:single|ep)$/i;
const LIVE_TITLE_PATTERN = /\b(?:live|concert|unplugged)\b/i;

type ReleaseCategory = 'album' | 'single' | 'compilation' | 'live';
type DiscographyFilter = 'all' | ReleaseCategory;
type DiscographySort = 'titleAsc' | 'titleDesc' | 'yearDesc' | 'yearAsc';
type ReleaseGroup = {
  representative: AlbumRef;
  variants: AlbumRef[];
};

const normalizeReleaseTitle = (title: string): string =>
  title
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const isSingleRelease = (
  album: AlbumRef,
  topTrackTitles: ReadonlySet<string> = new Set(),
): boolean =>
  classifyReleaseFormat(album) !== 'album' ||
  (album.trackCount === undefined &&
    album.releaseType === undefined &&
    (SINGLE_TITLE_PATTERN.test(album.title) ||
      topTrackTitles.has(normalizeReleaseTitle(album.title))));

const getReleaseCategory = (
  release: AlbumRef,
  topTrackTitles: ReadonlySet<string>,
): ReleaseCategory => {
  if (isCompilationRelease(release)) {
    return 'compilation';
  }
  if (isSingleRelease(release, topTrackTitles)) {
    return 'single';
  }
  if (
    release.releaseType === 'live' ||
    (release.releaseType === undefined &&
      LIVE_TITLE_PATTERN.test(release.title))
  ) {
    return 'live';
  }
  return 'album';
};

const getReleaseYear = (release: AlbumRef): number | undefined => {
  const year = Number.parseInt(release.releaseDate?.dateIso.slice(0, 4) ?? '');
  return Number.isFinite(year) ? year : undefined;
};

const getReleaseTimestamp = (release: AlbumRef): number | undefined => {
  if (!release.releaseDate?.dateIso) {
    return undefined;
  }
  const timestamp = Date.parse(release.releaseDate.dateIso);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const compareReleaseTitles = (
  firstRelease: AlbumRef,
  secondRelease: AlbumRef,
  collator: Intl.Collator,
): number => {
  const titleComparison = collator.compare(
    firstRelease.title.trim(),
    secondRelease.title.trim(),
  );
  if (titleComparison !== 0) {
    return titleComparison;
  }
  return firstRelease.source.id.localeCompare(secondRelease.source.id);
};

const normalizeArtistNames = (release: AlbumRef): string =>
  (release.artists ?? [])
    .map((artist) => normalizeReleaseTitle(artist.name))
    .sort()
    .join('|');

const hasSharedIdentifier = (
  firstRelease: AlbumRef,
  secondRelease: AlbumRef,
): boolean =>
  Object.entries(firstRelease.identifiers ?? {}).some(
    ([identifier, value]) => secondRelease.identifiers?.[identifier] === value,
  );

const metadataDoesNotConflict = (
  firstValue: number | undefined,
  secondValue: number | undefined,
): boolean =>
  firstValue === undefined ||
  secondValue === undefined ||
  firstValue === secondValue;

const releasesMatch = (
  firstRelease: AlbumRef,
  secondRelease: AlbumRef,
  topTrackTitles: ReadonlySet<string>,
): boolean =>
  hasSharedIdentifier(firstRelease, secondRelease) ||
  (normalizeReleaseTitle(firstRelease.title) ===
    normalizeReleaseTitle(secondRelease.title) &&
    normalizeArtistNames(firstRelease) ===
      normalizeArtistNames(secondRelease) &&
    getReleaseCategory(firstRelease, topTrackTitles) ===
      getReleaseCategory(secondRelease, topTrackTitles) &&
    metadataDoesNotConflict(
      getReleaseYear(firstRelease),
      getReleaseYear(secondRelease),
    ) &&
    metadataDoesNotConflict(firstRelease.trackCount, secondRelease.trackCount));

const releaseMetadataScore = (release: AlbumRef): number => {
  const artworkWidth = Math.max(
    0,
    ...(release.artwork?.items.map((artwork) => artwork.width ?? 0) ?? []),
  );
  return (
    Object.keys(release.identifiers ?? {}).length * 4 +
    (release.releaseDate ? 2 : 0) +
    (release.trackCount ? 1 : 0) +
    artworkWidth / 10_000
  );
};

const groupDuplicateReleases = (
  releases: AlbumRef[],
  topTrackTitles: ReadonlySet<string>,
): ReleaseGroup[] => {
  const groups: ReleaseGroup[] = [];
  releases.forEach((release) => {
    const group = groups.find((candidate) =>
      releasesMatch(candidate.representative, release, topTrackTitles),
    );
    if (!group) {
      groups.push({ representative: release, variants: [release] });
      return;
    }
    group.variants.push(release);
    if (
      releaseMetadataScore(release) > releaseMetadataScore(group.representative)
    ) {
      group.representative = release;
    }
  });
  return groups;
};

const sortReleases = (
  releases: AlbumRef[],
  sort: DiscographySort,
  collator: Intl.Collator,
): AlbumRef[] =>
  [...releases].sort((firstRelease, secondRelease) => {
    if (sort === 'titleAsc' || sort === 'titleDesc') {
      const comparison = compareReleaseTitles(
        firstRelease,
        secondRelease,
        collator,
      );
      return sort === 'titleAsc' ? comparison : -comparison;
    }

    const firstTimestamp = getReleaseTimestamp(firstRelease);
    const secondTimestamp = getReleaseTimestamp(secondRelease);
    if (firstTimestamp === undefined && secondTimestamp === undefined) {
      return compareReleaseTitles(firstRelease, secondRelease, collator);
    }
    if (firstTimestamp === undefined) {
      return 1;
    }
    if (secondTimestamp === undefined) {
      return -1;
    }
    const dateComparison =
      sort === 'yearDesc'
        ? secondTimestamp - firstTimestamp
        : firstTimestamp - secondTimestamp;
    return (
      dateComparison ||
      compareReleaseTitles(firstRelease, secondRelease, collator)
    );
  });

type ReleaseGridProps = {
  releaseGroups: ReleaseGroup[];
  providerId: string;
};

const ReleaseGrid: FC<ReleaseGridProps> = ({ releaseGroups, providerId }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('artist');

  if (releaseGroups.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3" data-testid="artist-discography">
      <CardGrid className="grid-cols-[repeat(auto-fill,minmax(10rem,10.5rem))]">
        {releaseGroups.map(({ representative: album, variants }) => (
          <div
            key={`${album.source.provider}:${album.source.id}`}
            className="relative w-42"
          >
            <Card
              className="w-full"
              title={album.title}
              subtitle={album.artists?.map((artist) => artist.name).join(', ')}
              src={pickArtwork(album.artwork, 'cover', 300)?.url}
              onClick={() =>
                navigate({
                  to: `/album/${album.source.provider || providerId}/${album.source.id}`,
                })
              }
            />
            {variants.length > 1 && (
              <Popover
                className="absolute top-3 right-3"
                anchor="bottom end"
                trigger={
                  <Button
                    size="flexible"
                    className="bg-background/90 px-2 py-1 text-xs backdrop-blur"
                  >
                    {t('versions', { count: variants.length })}
                  </Button>
                }
              >
                <Popover.Menu>
                  {variants.map((variant, index) => (
                    <Popover.Item
                      key={`${variant.source.provider}:${variant.source.id}`}
                      onClick={() =>
                        navigate({
                          to: `/album/${variant.source.provider}/${variant.source.id}`,
                        })
                      }
                    >
                      {t('versionLabel', {
                        number: index + 1,
                        provider: variant.source.provider,
                        year: getReleaseYear(variant) ?? t('unknownYear'),
                      })}
                    </Popover.Item>
                  ))}
                </Popover.Menu>
              </Popover>
            )}
          </div>
        ))}
      </CardGrid>
    </section>
  );
};

export const ArtistAlbumsGrid: FC<ArtistAlbumsGridProps> = ({
  providerId,
  artistId,
  'data-testid': dataTestId,
}) => {
  const { t, i18n } = useTranslation('artist');
  const [filter, setFilter] = useState<DiscographyFilter>('all');
  const [sort, setSort] = useState<DiscographySort>('yearDesc');
  const {
    data: albums,
    isLoading,
    isError,
  } = useArtistAlbums(providerId, artistId);
  const provider = providersHost.get<MetadataProvider>(providerId, 'metadata');
  const canFetchTopTracks =
    provider?.artistMetadataCapabilities?.includes('artistTopTracks') ?? false;
  const { data: topTracks, isLoading: areTopTracksLoading } =
    useArtistTopTracks(providerId, artistId, canFetchTopTracks);

  const visibleReleaseGroups = useMemo(() => {
    const releases = albums ?? [];
    const topTrackTitles = new Set(
      (topTracks ?? []).map((track) => normalizeReleaseTitle(track.title)),
    );
    const groups = groupDuplicateReleases(releases, topTrackTitles);
    const filtered =
      filter === 'all'
        ? groups
        : groups.filter(
            ({ representative }) =>
              getReleaseCategory(representative, topTrackTitles) === filter,
          );
    const sorted = sortReleases(
      filtered.map(({ representative }) => representative),
      sort,
      new Intl.Collator(i18n.resolvedLanguage?.replace('_', '-'), {
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true,
      }),
    );
    return sorted.flatMap((release) =>
      filtered.filter(({ representative }) => representative === release),
    );
  }, [albums, filter, i18n.resolvedLanguage, sort, topTracks]);

  if (isLoading || (canFetchTopTracks && areTopTracksLoading)) {
    return (
      <CardGrid.Skeleton
        data-testid={dataTestId ?? 'artist-albums-skeleton'}
        className="mx-4"
      />
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-start gap-3 p-8"
        data-testid={dataTestId}
      >
        <div className="text-accent-red">{t('errors.failedToLoadAlbums')}</div>
      </div>
    );
  }

  return (
    <div
      className="mx-4 flex flex-col gap-4"
      data-testid={dataTestId ?? 'artist-discography-container'}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-black">{t('discography')}</h2>
          <FilterChips
            items={[
              { id: 'all', label: t('filters.all') },
              { id: 'album', label: t('albums') },
              { id: 'single', label: t('singlesAndEps') },
              { id: 'compilation', label: t('filters.compilations') },
              { id: 'live', label: t('filters.live') },
            ]}
            selected={filter}
            onChange={(value) => setFilter(value as DiscographyFilter)}
          />
        </div>
        <div className="w-52" data-testid="artist-discography-sort">
          <Select
            options={[
              { id: 'yearDesc', label: t('sort.yearDesc') },
              { id: 'yearAsc', label: t('sort.yearAsc') },
              { id: 'titleAsc', label: t('sort.titleAsc') },
              { id: 'titleDesc', label: t('sort.titleDesc') },
            ]}
            value={sort}
            onValueChange={(value) => setSort(value as DiscographySort)}
          />
        </div>
      </div>
      <ReleaseGrid
        releaseGroups={visibleReleaseGroups}
        providerId={providerId}
      />
    </div>
  );
};
