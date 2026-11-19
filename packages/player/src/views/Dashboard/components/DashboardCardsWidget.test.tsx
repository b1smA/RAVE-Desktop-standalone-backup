import { render, screen } from '@testing-library/react';

import type { AttributedResult } from '@nuclearplayer/plugin-sdk';

import { DashboardCardsWidget } from './DashboardCardsWidget';

type ResultItem = {
  id: string;
  name: string;
};

const result: AttributedResult<ResultItem> = {
  providerId: 'listenbrainz.dashboard',
  providerName: 'ListenBrainz',
  items: [
    { id: 'BTS', name: 'BTS' },
    { id: 'BTS', name: 'BTS' },
  ],
};

describe('DashboardCardsWidget', () => {
  it('renders duplicate provider items only once', () => {
    render(
      <DashboardCardsWidget
        results={[result]}
        isLoading={false}
        title="Top artists"
        labels={{ filterPlaceholder: 'Filter', nothingFound: 'Nothing found' }}
        mapItem={(item, attributedResult) => ({
          id: `${attributedResult.providerId}-${item.id}`,
          title: item.name,
        })}
      />,
    );

    expect(screen.getAllByText('BTS')).toHaveLength(1);
  });
});
