import { LazyStore } from '@tauri-apps/plugin-store';

import type { Track } from '@nuclearplayer/model';

import { trackIdentity } from './rave/trackIdentity';
import { streamingHost } from './streamingHost';

const TARGET_LOUDNESS_DB = -18;
const MAX_GAIN_DB = 12;
const MIN_GAIN_DB = -18;
const SILENCE_FLOOR = 1e-9;
const CACHE_KEY = 'loudness.entries';
const store = new LazyStore('loudness-analysis.json');

export type LoudnessAnalysis = {
  gainDb: number;
  loudnessDb: number;
  peakDb: number;
  analyzedAtIso: string;
};

let entries: Record<string, LoudnessAnalysis> = {};

const linearToDb = (value: number): number =>
  20 * Math.log10(Math.max(value, SILENCE_FLOOR));

export const calculateReplayGain = (
  channels: Float32Array[],
): Omit<LoudnessAnalysis, 'analyzedAtIso'> => {
  if (
    channels.length === 0 ||
    channels.every((channel) => channel.length === 0)
  ) {
    throw new Error('Decoded audio has no audio channels');
  }

  let squareSum = 0;
  let sampleCount = 0;
  let peak = 0;
  channels.forEach((channel) => {
    channel.forEach((sample) => {
      squareSum += sample * sample;
      sampleCount += 1;
      peak = Math.max(peak, Math.abs(sample));
    });
  });

  const loudnessDb = linearToDb(Math.sqrt(squareSum / sampleCount));
  const peakDb = linearToDb(peak);
  const clippingSafeGain = -peakDb;
  const gainDb = Math.max(
    MIN_GAIN_DB,
    Math.min(MAX_GAIN_DB, clippingSafeGain, TARGET_LOUDNESS_DB - loudnessDb),
  );

  return { gainDb, loudnessDb, peakDb };
};

export const initializeLoudnessAnalysis = async (): Promise<void> => {
  entries =
    (await store.get<Record<string, LoudnessAnalysis>>(CACHE_KEY)) ?? {};
};

export const getReplayGainDb = (track?: Track): number =>
  track ? (entries[trackIdentity(track)]?.gainDb ?? 0) : 0;

const persist = async (): Promise<void> => {
  await store.set(CACHE_KEY, entries);
  await store.save();
};

export const analyzeTrackLoudness = async (
  track: Track,
): Promise<LoudnessAnalysis> => {
  const candidatesResult = await streamingHost.resolveCandidatesForTrack(track);
  if (!candidatesResult.success || candidatesResult.candidates.length === 0) {
    throw new Error('No audio source is available for loudness analysis');
  }
  const candidate = await streamingHost.resolveStreamForCandidate(
    candidatesResult.candidates[0],
  );
  if (!candidate?.stream?.url) {
    throw new Error('The audio source could not be resolved');
  }

  const response = await fetch(candidate.stream.url);
  if (!response.ok) {
    throw new Error(`Audio analysis request failed (${response.status})`);
  }
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await response.arrayBuffer());
    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, index) => decoded.getChannelData(index),
    );
    const analysis = {
      ...calculateReplayGain(channels),
      analyzedAtIso: new Date().toISOString(),
    };
    entries = { ...entries, [trackIdentity(track)]: analysis };
    await persist();
    return analysis;
  } finally {
    await context.close();
  }
};

export const getLoudnessAnalysisCount = (): number =>
  Object.keys(entries).length;
