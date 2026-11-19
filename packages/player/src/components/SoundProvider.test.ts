import { isTruncatedStream } from './SoundProvider';

describe('stream duration validation', () => {
  it('rejects a 30 second preview for a full-length track', () => {
    expect(isTruncatedStream(244, 30)).toBe(true);
  });

  it('accepts small metadata differences and genuinely short tracks', () => {
    expect(isTruncatedStream(244, 238)).toBe(false);
    expect(isTruncatedStream(45, 30)).toBe(false);
  });
});
