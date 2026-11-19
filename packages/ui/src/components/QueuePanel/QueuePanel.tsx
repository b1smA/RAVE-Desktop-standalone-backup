import { DragEndEvent } from '@dnd-kit/core';
import { Music } from 'lucide-react';
import { FC, useMemo } from 'react';

import type { QueueItem as QueueItemType } from '@nuclearplayer/model';

import { cn } from '../../utils';
import { type QueueItemLabels } from '../QueueItem/types';
import { ScrollableArea } from '../ScrollableArea';
import { QueueReorderLayer } from './QueueReorderLayer';
import { ReorderableQueueItem } from './ReorderableQueueItem';

export type QueuePanelProps = {
  items: QueueItemType[];
  currentItemId?: string;
  isCollapsed?: boolean;
  reorderable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onSelectItem?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onSelectCandidate?: (itemId: string, candidateId: string) => void;
  labels: QueueItemLabels & {
    emptyTitle?: string;
    emptySubtitle?: string;
    noCandidates?: string;
    candidateFailed?: string;
    history?: string;
    nowPlaying?: string;
    upNext?: string;
  };
  classes?: {
    root?: string;
    list?: string;
    empty?: string;
  };
};

export const QueuePanel: FC<QueuePanelProps> = ({
  items,
  currentItemId,
  isCollapsed = false,
  reorderable = true,
  onReorder,
  onSelectItem,
  onRemoveItem,
  onSelectCandidate,
  labels,
  classes,
}) => {
  const itemLabels = useMemo(
    () => ({
      removeButton: labels.removeButton,
      playbackError: labels.playbackError,
      noCandidates: labels.noCandidates,
      candidateFailed: labels.candidateFailed,
    }),
    [
      labels.candidateFailed,
      labels.noCandidates,
      labels.playbackError,
      labels.removeButton,
    ],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) {
      return;
    }

    const fromIndex = items.findIndex((item) => item.id === active.id);
    const toIndex = items.findIndex((item) => item.id === over.id);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    onReorder(fromIndex, toIndex);
  };

  if (items.length === 0) {
    return (
      <div
        data-testid="queue-empty-state"
        className={cn(
          'flex h-full flex-col items-center justify-center gap-4 p-8 text-center transition-opacity duration-150',
          {
            'opacity-0': isCollapsed,
            'opacity-100': !isCollapsed,
          },
          classes?.empty,
        )}
      >
        <Music size={64} className="opacity-50" />
        {(labels?.emptyTitle || labels?.emptySubtitle) && (
          <div>
            {labels?.emptyTitle && (
              <div className="text-lg font-bold">{labels.emptyTitle}</div>
            )}
            {labels?.emptySubtitle && (
              <div className="mt-2 text-sm opacity-70">
                {labels.emptySubtitle}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const itemIds = items.map((item) => item.id);
  const currentIndex = items.findIndex((item) => item.id === currentItemId);
  const historyItems = currentIndex > 0 ? items.slice(0, currentIndex) : [];
  const currentItems = currentIndex >= 0 ? [items[currentIndex]] : [];
  const nextItems = currentIndex >= 0 ? items.slice(currentIndex + 1) : items;

  const renderSection = (
    section: 'history' | 'current' | 'next',
    sectionItems: QueueItemType[],
    label: string | undefined,
  ) => {
    if (sectionItems.length === 0) {
      return null;
    }

    return (
      <section
        className="flex flex-col gap-1"
        data-testid={`queue-section-${section}`}
      >
        {!isCollapsed && label && (
          <div className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-semibold tracking-wide uppercase">
            {label}
          </div>
        )}
        {sectionItems.map((item) => (
          <ReorderableQueueItem
            key={item.id}
            item={item}
            isCurrent={item.id === currentItemId}
            isCollapsed={isCollapsed}
            isReorderable={reorderable && section === 'next'}
            onSelect={onSelectItem}
            onRemove={onRemoveItem}
            onSelectCandidate={onSelectCandidate}
            labels={itemLabels}
          />
        ))}
      </section>
    );
  };

  return (
    <div
      data-testid="queue-panel"
      className={cn('flex h-full flex-col', classes?.root)}
    >
      <ScrollableArea>
        <QueueReorderLayer
          enabled={reorderable}
          items={itemIds}
          onDragEnd={handleDragEnd}
        >
          <div
            className={cn(
              'flex flex-col',
              isCollapsed ? 'items-center gap-1 px-1' : 'gap-1',
              classes?.list,
            )}
          >
            {renderSection('history', historyItems, labels.history)}
            {renderSection('current', currentItems, labels.nowPlaying)}
            {renderSection('next', nextItems, labels.upNext)}
          </div>
        </QueueReorderLayer>
      </ScrollableArea>
    </div>
  );
};
