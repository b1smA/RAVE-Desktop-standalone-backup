import { describe, expect, it } from 'vitest';

import { CORE_SETTINGS } from './coreSettings';

const getDefault = (id: string) =>
  CORE_SETTINGS.find((setting) => setting.id === id)?.default;

describe('RAVE privacy defaults', () => {
  it('keeps local stream verification enabled without enabling remote sharing', () => {
    expect(getDefault('playback.streamVerification')).toBe(true);
    expect(getDefault('playback.streamVerificationService')).toBe(false);
  });

  it('keeps optional network integrations disabled', () => {
    expect(getDefault('integrations.jam.enabled')).toBe(false);
    expect(getDefault('integrations.mcp.enabled')).toBe(false);
    expect(getDefault('integrations.mpd.enabled')).toBe(false);
    expect(getDefault('integrations.discord.enabled')).toBe(false);
  });

  it('keeps RAVE queue policies opt-in to preserve Nuclear behavior', () => {
    expect(getDefault('playback.preventQueueDuplicates')).toBe(false);
    expect(getDefault('playback.autoCleanQueue')).toBe(false);
    expect(getDefault('playback.familyMode')).toBe(false);
  });
});
