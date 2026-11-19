import isEmpty from 'lodash-es/isEmpty';
import { FC, useMemo } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { DashboardProvider } from '@nuclearplayer/plugin-sdk';
import { ViewShell } from '@nuclearplayer/ui';

import { ConnectedTrackTable } from '../../components/ConnectedTrackTable';
import { useProviders } from '../../hooks/useProviders';
import { rankTracksForTaste } from '../../services/rave/mix/raveMix';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { useRaveLibraryStore } from '../../stores/raveLibraryStore';
import { useStartupStore } from '../../stores/startupStore';
import { DashboardEmptyState } from './components/DashboardEmptyState';
import { DashboardStartupSkeleton } from './components/DashboardStartupSkeleton';
import { ForgottenFavorites } from './components/ForgottenFavorites';
import { ReleaseRadar } from './components/ReleaseRadar';
import { DASHBOARD_WIDGETS, DashboardWidgetEntry } from './dashboardWidgets';

const DashboardContent: FC<{
  isStartingUp: boolean;
  activeWidgets: DashboardWidgetEntry[];
  personalizedTracks: ReturnType<typeof rankTracksForTaste>;
}> = ({ isStartingUp, activeWidgets, personalizedTracks }) => {
  const { t } = useTranslation('dashboard');
  if (isStartingUp) {
    return <DashboardStartupSkeleton />;
  }

  if (isEmpty(activeWidgets) && personalizedTracks.length === 0) {
    return <DashboardEmptyState />;
  }

  return (
    <>
      {personalizedTracks.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="rave-for-you">
          <h2 className="text-xl font-black">{t('forYou')}</h2>
          <ConnectedTrackTable
            tracks={personalizedTracks}
            features={{ selectable: true, playAll: true, addAllToQueue: true }}
          />
        </section>
      )}
      <ForgottenFavorites />
      <ReleaseRadar />
      {activeWidgets.map(({ capability, component: Widget }) => (
        <Widget key={capability} />
      ))}
    </>
  );
};

export const Dashboard: FC = () => {
  const { t } = useTranslation('dashboard');
  const isStartingUp = useStartupStore((state) => state.isStartingUp);
  const providers = useProviders('dashboard') as DashboardProvider[];
  const favoriteTracks = useFavoritesStore((state) => state.tracks);
  const artistTaste = useRaveLibraryStore((state) => state.taste.artists);
  const personalizedTracks = useMemo(
    () =>
      rankTracksForTaste(
        favoriteTracks.map((entry) => entry.ref),
        artistTaste,
        'focus',
      ).slice(0, 12),
    [artistTaste, favoriteTracks],
  );

  const activeWidgets = useMemo(() => {
    const capabilities = new Set(
      providers.flatMap((provider) => provider.capabilities),
    );

    return DASHBOARD_WIDGETS.filter((widget) =>
      capabilities.has(widget.capability),
    );
  }, [providers]);

  return (
    <ViewShell data-testid="dashboard-view" title={t('title')}>
      <DashboardContent
        isStartingUp={isStartingUp}
        activeWidgets={activeWidgets}
        personalizedTracks={personalizedTracks}
      />
    </ViewShell>
  );
};
