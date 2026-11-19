import { useRaveLibraryStore } from '../../../stores/raveLibraryStore';
import { createMockTrack } from '../../../test/utils/mockTrack';
import {
  clearRecommendationSnooze,
  isRecommendationSnoozed,
  snoozeRecommendations,
} from './recommendationSnooze';

describe('recommendation snooze', () => {
  const track = createMockTrack('Temporary break');

  beforeEach(() => {
    useRaveLibraryStore.setState({ trackProfiles: {} });
  });

  it('temporarily excludes a track for the chosen number of days', async () => {
    const now = new Date('2026-11-18T12:00:00.000Z');

    await snoozeRecommendations(track, 30, now);

    expect(isRecommendationSnoozed(track, now)).toBe(true);
    expect(
      isRecommendationSnoozed(track, new Date('2026-12-19T12:00:00.000Z')),
    ).toBe(false);
  });

  it('can restore recommendations immediately', async () => {
    await snoozeRecommendations(track, 7);
    await clearRecommendationSnooze(track);

    expect(isRecommendationSnoozed(track)).toBe(false);
  });
});
