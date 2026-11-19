import { useSettingsStore } from '../stores/settingsStore';
import { dataSaverMaxBitrate, stripArtworkForDataSaver } from './dataSaver';

describe('data saver', () => {
  it('removes nested artwork and returns the configured bitrate cap', () => {
    useSettingsStore.setState({
      values: {
        'core.playback.dataSaver': true,
        'core.playback.dataSaverMaxBitrate': 96,
      },
    });

    expect(dataSaverMaxBitrate()).toBe(96);
    expect(
      stripArtworkForDataSaver({
        title: 'Track',
        artwork: { items: [{ url: 'https://example.com/cover.jpg' }] },
        album: {
          title: 'Album',
          artwork: { items: [{ url: 'https://example.com/album.jpg' }] },
        },
      }),
    ).toEqual({ title: 'Track', album: { title: 'Album' } });
  });
});
