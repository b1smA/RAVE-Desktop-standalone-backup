import { waitFor } from '@testing-library/react';

import { SessionGateWrapper } from './SessionGate.test-wrapper';

describe('RAVE Session pairing', () => {
  it('asks the guest for a name and pairing code', async () => {
    SessionGateWrapper.mount();
    expect(await waitFor(() => SessionGateWrapper.title)).toBeInTheDocument();
  });

  it('shows an error when pairing is rejected', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false } as Response);
    SessionGateWrapper.mount();
    await SessionGateWrapper.form.submit('Guest', '123456');
    expect(SessionGateWrapper.error).toBeInTheDocument();
  });

  it('opens the session after successful pairing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'guest-token' }),
    } as Response);
    SessionGateWrapper.mount();
    await SessionGateWrapper.form.submit('Guest', '123456');
    expect(SessionGateWrapper.content).toBeInTheDocument();
  });
});
