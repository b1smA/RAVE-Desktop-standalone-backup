import type { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';

import { useRecentHistory } from '../../../hooks/useRecentHistory';
import { buildWeeklyReport } from '../../../services/rave/weekly/raveWeekly';

export const RaveWeekly: FC = () => {
  const { t } = useTranslation('history');
  const { data: history } = useRecentHistory();
  const data = history ? buildWeeklyReport(history) : undefined;

  if (!data || data.listenCount === 0) {
    return null;
  }

  const stats = [
    ['minutes', data.minutesListened],
    ['tracks', data.uniqueTracks],
    ['artists', data.uniqueArtists],
    ['newArtists', data.newArtists],
  ] as const;

  return (
    <section
      data-testid="rave-weekly"
      className="surface-card border-border mb-4 rounded-lg border-(length:--border-width) p-4"
    >
      <h2 className="font-heading text-xl font-bold">{t('weekly.title')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {stats.map(([key, value]) => (
          <div key={key} className="surface-secondary rounded-md p-3">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-foreground/60 text-xs">
              {t(`weekly.${key}`)}
            </div>
          </div>
        ))}
      </div>
      {data.topArtist && (
        <p className="text-foreground/70 mt-3 text-sm">
          {t('weekly.topArtist', { artist: data.topArtist })}
        </p>
      )}
    </section>
  );
};
