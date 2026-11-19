import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';

import { ConnectedTrackTable } from '../../../components/ConnectedTrackTable';
import { useRecentHistory } from '../../../hooks/useRecentHistory';
import { selectForgottenFavorites } from '../../../services/rave/forgottenFavorites/forgottenFavorites';
import { useFavoritesStore } from '../../../stores/favoritesStore';

const DISPLAY_LIMIT = 12;

export const ForgottenFavorites: FC = () => {
  const { t } = useTranslation('dashboard');
  const favorites = useFavoritesStore((state) => state.tracks);
  const { data: history } = useRecentHistory(favorites.length > 0);
  const data = history
    ? selectForgottenFavorites(favorites, history).slice(0, DISPLAY_LIMIT)
    : undefined;

  if (!data?.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3" data-testid="forgotten-favorites">
      <h2 className="text-xl font-black">{t('forgottenFavorites')}</h2>
      <ConnectedTrackTable
        tracks={data}
        features={{ selectable: true, playAll: true, addAllToQueue: true }}
      />
    </section>
  );
};
