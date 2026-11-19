import { useMemo, useState } from 'react';

import type { FavoriteEntry } from '../../stores/favoritesStore';

export type FavoriteSortBy = 'dateAdded' | 'name';
export type FavoriteSortDirection = 'asc' | 'desc';

export const useFavoriteSort = <T>(
  entries: FavoriteEntry<T>[],
  getName: (ref: T) => string,
) => {
  const [sortBy, setSortBy] = useState<FavoriteSortBy>('dateAdded');
  const [sortDirection, setSortDirection] =
    useState<FavoriteSortDirection>('desc');

  const sortedEntries = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...entries].sort((left, right) => {
      const comparison =
        sortBy === 'name'
          ? getName(left.ref).localeCompare(getName(right.ref))
          : left.addedAtIso.localeCompare(right.addedAtIso);
      return comparison * direction;
    });
  }, [entries, getName, sortBy, sortDirection]);

  return {
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection: () =>
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc')),
    sortedEntries,
  };
};
