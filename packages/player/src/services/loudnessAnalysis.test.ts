import { calculateReplayGain } from './loudnessAnalysis';

describe('calculateReplayGain', () => {
  it('attenuates loud material to the configured target without clipping', () => {
    const result = calculateReplayGain([
      new Float32Array([0.5, -0.5, 0.5, -0.5]),
    ]);

    expect(result.gainDb).toBeLessThan(0);
    expect(result.peakDb).toBeCloseTo(-6.02, 1);
  });

  it('limits positive gain so the measured peak cannot clip', () => {
    const result = calculateReplayGain([
      new Float32Array([0.1, -0.1, 0.1, -0.1]),
    ]);

    expect(result.gainDb).toBeLessThanOrEqual(-result.peakDb);
  });

  it('rejects empty decoded audio', () => {
    expect(() => calculateReplayGain([])).toThrow('audio channels');
  });
});
