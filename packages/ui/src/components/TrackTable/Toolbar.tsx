import { FilterIcon, PlayIcon, PlusIcon } from 'lucide-react';

import type { Track } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { Button } from '../Button';
import { Input } from '../Input';
import { Tooltip } from '../Tooltip';
import { useTrackTableContext } from './TrackTableContext';

type ToolbarProps = {
  filterValue: string;
  onFilterChange: (value: string) => void;
  className?: string;
  selectedTracks: Track[];
};

export function Toolbar({
  filterValue,
  onFilterChange,
  className,
  selectedTracks,
}: ToolbarProps) {
  const { features, actions, labels } = useTrackTableContext();

  if (
    !features.playAll &&
    !features.addAllToQueue &&
    !features.filterable &&
    !features.selectable
  ) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {selectedTracks.length > 0 && (
        <>
          <Button
            size="sm"
            onClick={() => actions.onPlaySelected?.(selectedTracks)}
          >
            <PlayIcon size={16} strokeWidth={3} />
            {labels.playSelected} ({selectedTracks.length})
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => actions.onAddSelectedToQueue?.(selectedTracks)}
          >
            <PlusIcon size={16} strokeWidth={3} />
            {labels.addSelectedToQueue}
          </Button>
          {actions.onAddSelectedToPlaylist && (
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => actions.onAddSelectedToPlaylist?.(selectedTracks)}
            >
              <PlusIcon size={16} strokeWidth={3} />
              {labels.addSelectedToPlaylist}
            </Button>
          )}
        </>
      )}
      {features.playAll && (
        <Tooltip content={labels.playAll} side="bottom">
          <Button
            size="icon"
            onClick={actions.onPlayAll}
            data-testid="play-all-button"
          >
            <PlayIcon size={16} strokeWidth={3} />
          </Button>
        </Tooltip>
      )}
      {features.addAllToQueue && (
        <Tooltip content={labels.addAllToQueue} side="bottom">
          <Button
            variant="tertiary"
            size="icon"
            onClick={actions.onAddAllToQueue}
            data-testid="add-all-to-queue-button"
          >
            <PlusIcon size={16} strokeWidth={3} />
          </Button>
        </Tooltip>
      )}
      {features.filterable && (
        <div className="ml-auto inline-flex w-full max-w-sm items-stretch">
          <Input
            size="sm"
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder={labels.filterPlaceholder}
            endAddon={
              <FilterIcon
                className="h-4 w-4"
                aria-hidden="true"
                strokeWidth={3}
              />
            }
          />
        </div>
      )}
    </div>
  );
}
