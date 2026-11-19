import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Select } from '@nuclearplayer/ui';

import type { FavoriteSortBy, FavoriteSortDirection } from './useFavoriteSort';

type FavoriteSortSelectProps = {
  sortBy: FavoriteSortBy;
  onSortByChange: (sortBy: FavoriteSortBy) => void;
  sortDirection: FavoriteSortDirection;
  onToggleSortDirection: () => void;
};

export const FavoriteSortSelect: FC<FavoriteSortSelectProps> = ({
  sortBy,
  onSortByChange,
  sortDirection,
  onToggleSortDirection,
}) => {
  const { t } = useTranslation('favorites');

  return (
    <div className="border-border mb-3 inline-flex w-fit items-stretch overflow-hidden rounded-md border-(length:--border-width)">
      <div className="w-48">
        <Select
          className="rounded-none border-0"
          options={[
            { id: 'dateAdded', label: t('sort.dateAdded') },
            { id: 'name', label: t('sort.name') },
          ]}
          value={sortBy}
          onValueChange={(value) => onSortByChange(value as FavoriteSortBy)}
        />
      </div>
      <Button
        variant="noShadow"
        size="flexible"
        onClick={onToggleSortDirection}
        aria-label={t('sort.direction')}
        className="border-border rounded-none border-0 border-l-(length:--border-width) px-3"
      >
        {sortDirection === 'asc' ? (
          <ArrowUpNarrowWide size={16} />
        ) : (
          <ArrowDownWideNarrow size={16} />
        )}
      </Button>
    </div>
  );
};
