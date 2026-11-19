import { render, waitFor } from '@testing-library/react';
import Hls from 'hls.js';

import { Sound } from '../Sound';
import { AudioSource } from '../types';
import { setupAudioContextMock } from './test-utils';

const hlsSource: AudioSource = {
  url: 'https://example.com/stream.m3u8',
  protocol: 'hls',
};

const httpSource: AudioSource = { url: '/a.mp3', protocol: 'http' };

describe('useHlsSource', () => {
  it('uses hls.js when Hls.isSupported() is true, even when native HLS is also available', async () => {
    const { restore } = setupAudioContextMock();
    const isSupported = vi.spyOn(Hls, 'isSupported').mockReturnValue(true);
    vi.spyOn(HTMLAudioElement.prototype, 'canPlayType').mockImplementation(
      (type: string) =>
        type === 'application/vnd.apple.mpegurl' ? 'probably' : '',
    );

    render(<Sound src={hlsSource} status="playing" />);

    const audio = document.querySelector('audio') as HTMLAudioElement;
    await waitFor(() => expect(isSupported).toHaveBeenCalled());
    expect(audio.src).not.toContain('stream.m3u8');

    vi.restoreAllMocks();
    restore();
  });

  it('falls back to native HLS when Hls.isSupported() is false', async () => {
    const { restore } = setupAudioContextMock();
    const isSupported = vi.spyOn(Hls, 'isSupported').mockReturnValue(false);
    vi.spyOn(HTMLAudioElement.prototype, 'canPlayType').mockImplementation(
      (type: string) =>
        type === 'application/vnd.apple.mpegurl' ? 'probably' : '',
    );

    render(<Sound src={hlsSource} status="playing" />);

    const audio = document.querySelector('audio') as HTMLAudioElement;
    await waitFor(() => {
      expect(isSupported).toHaveBeenCalled();
      expect(audio.src).toContain('stream.m3u8');
    });

    vi.restoreAllMocks();
    restore();
  });

  it('does not interfere with non-HLS sources', () => {
    const { restore } = setupAudioContextMock();

    render(<Sound src={httpSource} status="playing" />);

    const audio = document.querySelector('audio') as HTMLAudioElement;
    expect(audio.src).not.toContain('m3u8');

    restore();
  });
});
