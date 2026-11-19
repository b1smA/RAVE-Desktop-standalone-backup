import { createMockTrack } from '../../../test/utils/mockTrack';
import { trackIdentity } from '../trackIdentity';
import {
  applyPromptedPlaylistRules,
  parsePromptedPlaylist,
} from './promptedPlaylist';

describe('prompted playlists', () => {
  it('parses transparent local rules from Russian text', () => {
    expect(
      parsePromptedPlaylist(
        'Энергичное офлайн с 2000 по 2010, без Artist, на 60 минут',
      ),
    ).toMatchObject({
      mood: 'energy',
      offlineOnly: true,
      yearFrom: 2000,
      yearTo: 2010,
      targetDurationMinutes: 60,
      excludedArtists: ['artist'],
    });
  });

  it('applies parsed rules without hidden ranking', () => {
    const matching = {
      ...createMockTrack('Match'),
      durationMs: 180_000,
      localFile: { fileUri: 'file:///match.flac' },
    };
    const online = createMockTrack('Online');
    const rules = parsePromptedPlaylist('energy offline');

    expect(
      applyPromptedPlaylistRules(
        [matching, online],
        { [trackIdentity(matching)]: { mood: 'energy' } },
        rules,
      ),
    ).toEqual([matching]);
  });
});
