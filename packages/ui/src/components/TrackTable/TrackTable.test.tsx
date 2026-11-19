import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Track } from '@nuclearplayer/model';

import { TrackTable, TrackTableLabels } from '.';

const labels: TrackTableLabels = {
  headers: {
    artist: 'Artist',
    title: 'Title',
    album: 'Album',
    duration: 'Duration',
  },
  favorite: 'Add to favorites',
  unfavorite: 'Remove from favorites',
  playAll: 'Play all',
  addAllToQueue: 'Add all to queue',
  playSelected: 'Play selected',
  addSelectedToQueue: 'Add selected to queue',
  addSelectedToPlaylist: 'Add selected to playlist',
  selectAll: 'Select all tracks',
  selectTrack: 'Select track',
  addToQueue: 'Add to queue',
  trackOptions: 'Track options',
  remove: 'Remove from list',
  filterPlaceholder: 'Filter tracks',
};

const TEST_ROW_HEIGHT = 42;
const TEST_MAX_VISIBLE = 20;
const TEST_CONTAINER_HEIGHT = 400;

vi.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: (opts: { count: number }) => {
      const count = Math.max(0, Number(opts?.count ?? 0));
      const len = Math.min(count, TEST_MAX_VISIBLE);
      return {
        getVirtualItems: () =>
          Array.from({ length: len }).map((_, i) => ({
            index: i,
            start: i * TEST_ROW_HEIGHT,
            end: (i + 1) * TEST_ROW_HEIGHT,
            key: i,
            size: TEST_ROW_HEIGHT,
          })),
        getTotalSize: () => count * TEST_ROW_HEIGHT,
      } as const;
    },
  } as const;
});

function makeTracks(count: number): Track[] {
  return Array.from({ length: count }).map((_, i) => ({
    trackNumber: i + 1,
    artwork: { items: [{ url: 'https://i.imgur.com/4euOws2.jpg' }] },
    title: `Track ${i + 1}`,
    artists: [{ name: 'Frank Zappa', roles: [] }],
    album: {
      title: 'Album',
      artists: [
        { name: 'Frank Zappa', source: { provider: 'local', id: 'a' } },
      ],
      source: { provider: 'local', id: 'a' },
    },
    source: { provider: 'local', id: `t-${i + 1}` },
    durationMs: ((i % 300) + 30) * 1000,
  }));
}

describe('TrackTable', () => {
  it('(Snapshot) Basic', async () => {
    const { asFragment, findByText } = render(
      <TrackTable
        tracks={makeTracks(3)}
        labels={labels}
        display={{
          displayPosition: true,
          displayThumbnail: true,
          displayArtist: true,
          displayAlbum: true,
          displayDuration: true,
        }}
      />,
    );
    await findByText('Track 1');
    expect(asFragment()).toMatchSnapshot();
  });

  it('(Snapshot) DragAndDrop', async () => {
    const { asFragment, findByText } = render(
      <TrackTable
        tracks={makeTracks(5)}
        labels={labels}
        features={{ reorderable: true }}
        display={{
          displayPosition: true,
          displayThumbnail: true,
          displayArtist: true,
          displayAlbum: true,
          displayDuration: true,
        }}
      />,
    );
    await findByText('Track 1');
    expect(asFragment()).toMatchSnapshot();
  });

  it('(Snapshot) Filtering', async () => {
    const { asFragment, findByPlaceholderText } = render(
      <TrackTable
        tracks={makeTracks(5)}
        labels={labels}
        features={{ filterable: true }}
        display={{
          displayPosition: true,
          displayThumbnail: true,
          displayArtist: true,
          displayAlbum: true,
          displayDuration: true,
        }}
      />,
    );
    await findByPlaceholderText('Filter tracks');
    expect(asFragment()).toMatchSnapshot();
  });

  it('(Snapshot) LargeDataset', async () => {
    const { asFragment, findByText } = render(
      <div style={{ height: TEST_CONTAINER_HEIGHT }}>
        <TrackTable
          tracks={makeTracks(500)}
          labels={labels}
          display={{
            displayPosition: true,
            displayThumbnail: true,
            displayArtist: true,
            displayAlbum: true,
            displayDuration: true,
          }}
        />
      </div>,
    );
    await findByText('Track 1');
    expect(asFragment()).toMatchSnapshot();
  });

  it('(Snapshot) Toolbar', async () => {
    const { asFragment, findByTestId } = render(
      <TrackTable
        tracks={makeTracks(3)}
        labels={labels}
        features={{ playAll: true, addAllToQueue: true, filterable: true }}
        display={{
          displayPosition: true,
          displayThumbnail: true,
          displayArtist: true,
          displayAlbum: true,
          displayDuration: true,
        }}
        actions={{ onPlayAll: vi.fn(), onAddAllToQueue: vi.fn() }}
      />,
    );
    await findByTestId('add-all-to-queue-button');
    expect(asFragment()).toMatchSnapshot();
  });

  it('runs a bulk action with selected tracks', async () => {
    const onPlaySelected = vi.fn();
    const tracks = makeTracks(3);
    const { getByLabelText, getByText } = render(
      <TrackTable
        tracks={tracks}
        labels={labels}
        features={{ selectable: true }}
        actions={{ onPlaySelected }}
      />,
    );

    await userEvent.click(getByLabelText('Select track: Track 2'));
    await userEvent.click(getByText('Play selected (1)'));

    expect(onPlaySelected).toHaveBeenCalledWith([tracks[1]]);
  });

  it('plays a track on row double click', async () => {
    const onPlayNow = vi.fn();
    const tracks = makeTracks(2);
    const { findAllByTestId } = render(
      <TrackTable tracks={tracks} labels={labels} actions={{ onPlayNow }} />,
    );

    const rows = await findAllByTestId('track-row');
    await userEvent.dblClick(rows[1]);

    expect(onPlayNow).toHaveBeenCalledWith(tracks[1]);
  });
});
