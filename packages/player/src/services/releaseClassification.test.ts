import {
  classifyReleaseFormat,
  isCompilationRelease,
  needsReleaseClassificationMetrics,
} from './releaseClassification';

const MINUTE_MS = 60 * 1000;

describe('classifyReleaseFormat', () => {
  it.each([
    [{ trackCount: 1, totalDurationMs: 3 * MINUTE_MS }, 'single'],
    [
      {
        trackCount: 3,
        totalDurationMs: 20 * MINUTE_MS,
        longestTrackDurationMs: 9 * MINUTE_MS,
      },
      'single',
    ],
    [
      {
        trackCount: 1,
        totalDurationMs: 10 * MINUTE_MS,
        longestTrackDurationMs: 10 * MINUTE_MS,
      },
      'ep',
    ],
    [
      {
        trackCount: 3,
        totalDurationMs: 30 * MINUTE_MS,
        longestTrackDurationMs: 10 * MINUTE_MS,
      },
      'ep',
    ],
    [{ trackCount: 4, totalDurationMs: 18 * MINUTE_MS }, 'ep'],
    [{ trackCount: 6, totalDurationMs: 30 * MINUTE_MS }, 'ep'],
    [{ trackCount: 7, totalDurationMs: 20 * MINUTE_MS }, 'album'],
    [{ trackCount: 2, totalDurationMs: 30 * MINUTE_MS + 1 }, 'album'],
  ] as const)('classifies %o as %s', (release, expectedFormat) => {
    expect(classifyReleaseFormat(release)).toBe(expectedFormat);
  });

  it('treats a release with a track over ten minutes as an EP', () => {
    expect(
      classifyReleaseFormat({
        trackCount: 2,
        totalDurationMs: 15 * MINUTE_MS,
        longestTrackDurationMs: 11 * MINUTE_MS,
      }),
    ).toBe('ep');
  });

  it.each([
    [{ title: 'Release', releaseType: 'compilation' }],
    [{ title: 'Original Motion Picture Soundtrack' }],
    [
      {
        title: 'Collaborative Release',
        artists: [
          { name: 'One', source: { provider: 'test', id: '1' } },
          { name: 'Two', source: { provider: 'test', id: '2' } },
          { name: 'Three', source: { provider: 'test', id: '3' } },
          { name: 'Four', source: { provider: 'test', id: '4' } },
        ],
      },
    ],
    [{ title: 'Across the Years', trackReleaseYears: [1998, 2004] }],
  ])('recognizes %o as a compilation', (release) => {
    expect(isCompilationRelease(release)).toBe(true);
  });

  it('uses the provider type only when track metrics are unavailable', () => {
    expect(classifyReleaseFormat({ releaseType: 'ep' })).toBe('ep');
    expect(classifyReleaseFormat({ releaseType: 'single' })).toBe('single');
    expect(classifyReleaseFormat({ releaseType: 'album' })).toBe('album');
  });
});

describe('needsReleaseClassificationMetrics', () => {
  it.each([
    [{ releaseType: 'album' }, true],
    [{ trackCount: 1 }, true],
    [{ trackCount: 1, totalDurationMs: 4 * MINUTE_MS }, true],
    [
      {
        trackCount: 1,
        totalDurationMs: 4 * MINUTE_MS,
        longestTrackDurationMs: 4 * MINUTE_MS,
      },
      false,
    ],
    [{ trackCount: 4 }, true],
    [{ trackCount: 4, totalDurationMs: 20 * MINUTE_MS }, false],
    [{ trackCount: 7 }, false],
    [{ releaseType: 'compilation' }, false],
    [{ releaseType: 'live' }, false],
  ] as const)('returns %s for %o', (release, expectedResult) => {
    expect(needsReleaseClassificationMetrics(release)).toBe(expectedResult);
  });
});
