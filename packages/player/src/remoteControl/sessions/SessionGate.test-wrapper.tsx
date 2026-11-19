import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { clearSessionToken } from './sessionClient';
import { SessionGate } from './SessionGate';

export const SessionGateWrapper = {
  mount() {
    clearSessionToken();
    return render(
      <SessionGate>
        <div>Session content</div>
      </SessionGate>,
    );
  },

  get title() {
    return screen.getByRole('heading', { name: 'Join the RAVE Session' });
  },

  get error() {
    return screen.getByRole('alert');
  },

  get content() {
    return screen.getByText('Session content');
  },

  form: {
    async submit(name: string, code: string) {
      await userEvent.type(screen.getByLabelText('Your name'), name);
      await userEvent.type(screen.getByLabelText('Pairing code'), code);
      await userEvent.click(
        screen.getByRole('button', { name: 'Join session' }),
      );
    },
  },
};
