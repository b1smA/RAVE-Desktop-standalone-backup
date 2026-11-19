import { render, screen } from '@testing-library/react';

import { providersHost } from '../services/providersHost';
import { useQueueStore } from '../stores/queueStore';
import { useSoundStore } from '../stores/soundStore';
import { createMockTrack } from '../test/utils/mockTrack';
import { ConnectedMiniPlayer } from './ConnectedMiniPlayer';

describe('ConnectedMiniPlayer', () => {
  beforeEach(() => providersHost.clear());

  it('shows only essential track information in the compact view', () => {
    const current = createMockTrack('Current Track');
    current.streamCandidates = [
      {
        id: 'current-source',
        title: current.title,
        failed: false,
        source: { provider: 'youtube', id: 'current-source' },
        stream: {
          url: 'https://example.com/audio',
          protocol: 'https',
          bitrateKbps: 320,
          source: { provider: 'youtube', id: 'current-source' },
        },
      },
    ];
    useQueueStore.setState({
      currentIndex: 0,
      items: [
        { id: 'current', track: current, status: 'ready', addedAtIso: '' },
        {
          id: 'next',
          track: createMockTrack('Next Track'),
          status: 'idle',
          addedAtIso: '',
        },
      ],
    });
    useSoundStore.setState({ status: 'paused', seek: 30, duration: 200 });

    render(<ConnectedMiniPlayer />);

    expect(screen.getByTestId('mini-player')).toHaveTextContent(
      'Current Track',
    );
    expect(screen.queryByTestId('mini-player-source')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mini-player-queue-item'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('player-play-button')).toBeInTheDocument();
    expect(screen.getByTestId('mini-player-volume')).toBeInTheDocument();
  });
});
