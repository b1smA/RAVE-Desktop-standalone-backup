import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { QueueItem as QueueItemType } from '@nuclearplayer/model';

import { QueuePanel } from './QueuePanel';

const createMockItem = (
  id: string,
  title: string,
  artist: string,
  durationMs?: number,
  status: 'idle' | 'loading' | 'error' = 'idle',
): QueueItemType => ({
  id,
  track: {
    title,
    artists: [{ name: artist, roles: ['primary'] }],
    durationMs,
    source: { provider: 'test', id },
    artwork: {
      items: [
        {
          url: `https://picsum.photos/seed/${id}/300`,
          width: 300,
          height: 300,
          purpose: 'thumbnail',
        },
      ],
    },
  },
  status,
  addedAtIso: new Date().toISOString(),
});

const mockItems: QueueItemType[] = [
  createMockItem('1', 'Bohemian Rhapsody', 'Queen', 354000),
  createMockItem('2', 'Stairway to Heaven', 'Led Zeppelin', 482000),
  createMockItem('3', 'Hotel California', 'Eagles', 391000, 'loading'),
];

const mockLabels = {
  emptyTitle: 'Your queue is empty',
  emptySubtitle: 'Add some tracks to get started',
  removeButton: 'Remove from queue',
  playbackError: 'Playback error',
};

describe('QueuePanel', () => {
  it('groups tracks into history, current, and up next sections', () => {
    render(
      <QueuePanel
        items={mockItems}
        currentItemId="2"
        labels={{
          ...mockLabels,
          history: 'History',
          nowPlaying: 'Now playing',
          upNext: 'Up next',
        }}
      />,
    );

    expect(
      within(screen.getByTestId('queue-section-history')).getByText(
        'Bohemian Rhapsody',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('queue-section-current')).getByText(
        'Stairway to Heaven',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('queue-section-next')).getByText(
        'Hotel California',
      ),
    ).toBeInTheDocument();
  });

  it('(Snapshot) renders default state', () => {
    const { container } = render(
      <QueuePanel
        items={mockItems}
        currentItemId="1"
        onReorder={vi.fn()}
        onSelectItem={vi.fn()}
        onRemoveItem={vi.fn()}
        labels={mockLabels}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('(Snapshot) renders empty state', () => {
    const { container } = render(<QueuePanel items={[]} labels={mockLabels} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('(Snapshot) renders empty state with labels', () => {
    const { container } = render(
      <QueuePanel
        items={[]}
        labels={{
          emptyTitle: 'Nothing to play',
          emptySubtitle: 'Add some tracks',
        }}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('(Snapshot) renders collapsed empty state', () => {
    const { container } = render(
      <QueuePanel items={[]} isCollapsed={true} labels={mockLabels} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('(Snapshot) renders collapsed state', () => {
    const { container } = render(
      <QueuePanel
        items={mockItems}
        currentItemId="1"
        isCollapsed={true}
        onReorder={vi.fn()}
        onSelectItem={vi.fn()}
        onRemoveItem={vi.fn()}
        labels={mockLabels}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
