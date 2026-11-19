import { render, screen } from '@testing-library/react';

import { useFavoritesStore } from '../../stores/favoritesStore';
import { LoudnessAnalysis } from './LoudnessAnalysis';

describe('LoudnessAnalysis', () => {
  it('shows an empty library and disables analysis', () => {
    useFavoritesStore.setState({ tracks: [], loaded: true });

    render(<LoudnessAnalysis />);

    expect(
      screen.getByText('0 cached analyses; 0 favorite tracks in the library.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('analyze-library-loudness')).toBeDisabled();
  });
});
