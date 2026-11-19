import type { AlbumRef } from '@nuclearplayer/model';

import { filterRecentReleases } from './releaseRadar';

const release = (id: string, dateIso?: string): AlbumRef => ({
  title: id,
  source: { provider: 'test', id },
  releaseDate: dateIso ? { precision: 'day', dateIso } : undefined,
});

describe('Release Radar', () => {
  it('keeps recent and near-future releases and removes duplicates', () => {
    const result = filterRecentReleases(
      [
        release('recent', '2026-11-01'),
        release('recent', '2026-11-01'),
        release('upcoming', '2026-12-01'),
        release('old', '2025-01-01'),
        release('unknown'),
      ],
      new Date('2026-11-18T00:00:00.000Z'),
    );

    expect(result.map((album) => album.title)).toEqual(['upcoming', 'recent']);
  });
});
