import { FC, FormEvent, PropsWithChildren, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';

import {
  clearSessionToken,
  getSessionToken,
  sessionFetch,
  setSessionToken,
} from './sessionClient';

type GateState = 'checking' | 'pairing' | 'joined';

export const SessionGate: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation('remote');
  const [state, setState] = useState<GateState>('checking');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!getSessionToken()) {
        setState('pairing');
        return;
      }
      const response = await sessionFetch('/api/session');
      if (response.ok) {
        setState('joined');
      } else {
        clearSessionToken();
        setState('pairing');
      }
    };
    check().catch(() => setState('pairing'));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(false);
    const response = await fetch('/api/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code }),
    });
    if (!response.ok) {
      setError(true);
      return;
    }
    const result = (await response.json()) as { token: string };
    setSessionToken(result.token);
    setState('joined');
  };

  if (state === 'joined') {
    return children;
  }

  if (state === 'checking') {
    return (
      <main className="bg-background text-foreground grid min-h-screen place-items-center">
        <p>{t('session.checking')}</p>
      </main>
    );
  }

  return (
    <main className="bg-background text-foreground grid min-h-screen place-items-center p-6">
      <form
        className="border-foreground bg-background flex w-full max-w-sm flex-col gap-4 border-2 p-6"
        onSubmit={submit}
      >
        <div>
          <h1 className="text-2xl font-black">{t('session.title')}</h1>
          <p className="text-foreground/70 mt-1 text-sm">
            {t('session.subtitle')}
          </p>
        </div>
        <label className="flex flex-col gap-1 font-bold">
          {t('session.name')}
          <input
            className="border-foreground bg-background border-2 p-3"
            value={name}
            maxLength={40}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          {t('session.code')}
          <input
            className="border-foreground bg-background border-2 p-3 text-center font-mono text-2xl tracking-[0.35em]"
            value={code}
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </label>
        {error && (
          <p role="alert" className="text-accent-red font-bold">
            {t('session.invalidCode')}
          </p>
        )}
        <button
          className="border-foreground bg-primary text-primary-foreground border-2 p-3 font-black"
          type="submit"
        >
          {t('session.join')}
        </button>
      </form>
    </main>
  );
};
