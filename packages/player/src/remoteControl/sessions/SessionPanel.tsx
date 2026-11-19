import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Queue } from '@nuclearplayer/model';

import { sessionFetch, SessionSnapshot } from './sessionClient';

const loadSession = async () => {
  const response = await sessionFetch('/api/session');
  if (!response.ok) {
    throw new Error('Session unavailable');
  }
  return response.json() as Promise<SessionSnapshot>;
};

export const SessionPanel: FC<{ items: Queue['items'] }> = ({ items }) => {
  const { t } = useTranslation('remote');
  const { data, refetch } = useQuery({
    queryKey: ['rave-session'],
    queryFn: loadSession,
    refetchInterval: 2000,
  });
  if (!data) {
    return null;
  }

  const vote = async (itemId: string, value: number) => {
    await sessionFetch('/api/session/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, value }),
    });
    await refetch();
  };

  return (
    <section
      className="border-foreground mb-4 border-2 p-4"
      data-testid="session-panel"
    >
      <div className="mb-3 flex items-center gap-2 font-black">
        <Users size={18} />
        {t('session.participants', { count: data.participants.length })}
      </div>
      {data.permissions.canVote && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div className="flex items-center gap-2 text-sm" key={item.id}>
              <span className="min-w-0 flex-1 truncate">
                {item.track.title}
              </span>
              <button
                aria-label={t('session.downvote')}
                className="border-foreground border px-2 py-1"
                onClick={() => vote(item.id, -1)}
              >
                −
              </button>
              <strong className="w-6 text-center">
                {data.votes[item.id] ?? 0}
              </strong>
              <button
                aria-label={t('session.upvote')}
                className="border-foreground border px-2 py-1"
                onClick={() => vote(item.id, 1)}
              >
                +
              </button>
            </div>
          ))}
        </div>
      )}
      {data.activity.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-bold">
            {t('session.history')}
          </summary>
          <ul className="mt-2 space-y-1">
            {data.activity.slice(0, 10).map((item) => (
              <li key={item.id}>
                <strong>{item.participantName}</strong> ·{' '}
                {t(`session.actions.${item.action}`, {
                  defaultValue: item.action,
                })}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
