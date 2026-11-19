import type { QueueItem, StreamCandidate } from '@nuclearplayer/model';

import { providersHost } from '../../providersHost';
import { providerPerformanceTracker } from './providerPerformanceTracker';
import {
  CandidateScore,
  rankCandidates,
  scoreCandidate,
} from './smartSourceRanker';
import { getSmartSourcePreferences } from './smartSourceSettings';

export type SourceDiagnostic = CandidateScore & {
  selected: boolean;
};

const candidateKey = (candidate: StreamCandidate): string =>
  `${candidate.source.provider}:${candidate.id}`;

export const sourceDiagnosticsForItem = (
  item: QueueItem,
): SourceDiagnostic[] => {
  const candidates = item.track.streamCandidates ?? [];
  const selected = candidates.find((candidate) => !candidate.failed);
  const preferences = getSmartSourcePreferences(
    providersHost.getActive('streaming'),
    item.track,
  );
  const performance = providerPerformanceTracker.snapshot();
  const scores = rankCandidates(
    item.track,
    candidates,
    preferences,
    performance,
  );

  return scores.map((score) => ({
    ...score,
    selected:
      selected !== undefined &&
      candidateKey(score.candidate) === candidateKey(selected),
  }));
};

const optionalValue = (value: string | number | undefined): string =>
  value === undefined || value === '' ? 'unknown' : String(value);

export const buildSourceDiagnosticReport = (item: QueueItem): string => {
  const diagnostics = sourceDiagnosticsForItem(item);
  const lines = [
    'RAVE source diagnostics',
    `Generated: ${new Date().toISOString()}`,
    `Track: ${item.track.artists.map((artist) => artist.name).join(', ')} - ${item.track.title}`,
    `Expected duration: ${optionalValue(item.track.durationMs)}`,
    `Candidates: ${diagnostics.length}`,
  ];

  diagnostics.forEach(({ candidate, selected, ...score }) => {
    lines.push(
      '',
      `${selected ? '[selected] ' : ''}${candidate.source.provider}:${candidate.id}`,
      `Title: ${candidate.title}`,
      `Duration: ${optionalValue(candidate.durationMs)}`,
      `Quality: ${optionalValue(candidate.stream?.qualityLabel)}`,
      `Bitrate: ${optionalValue(candidate.stream?.bitrateKbps)}`,
      `Codec: ${optionalValue(candidate.stream?.codec)}`,
      `Status: ${candidate.failed ? 'failed' : 'available'}`,
      `Score: ${score.total.toFixed(3)}`,
      `Factors: availability=${score.availability.toFixed(2)}, title=${score.titleMatch.toFixed(2)}, duration=${score.durationMatch.toFixed(2)}, quality=${score.quality.toFixed(2)}, speed=${score.speed.toFixed(2)}, reliability=${score.reliability.toFixed(2)}, preference=${score.preference.toFixed(2)}`,
      `Penalties: unwantedVersion=${score.unwantedVersionPenalty.toFixed(2)}, preview=${score.previewStreamPenalty.toFixed(2)}, userFeedback=${score.userFeedbackPenalty.toFixed(2)}`,
    );
  });

  return lines.join('\n');
};

export const scoreForCandidate = (
  item: QueueItem,
  candidate: StreamCandidate,
): CandidateScore =>
  scoreCandidate(
    item.track,
    candidate,
    getSmartSourcePreferences(providersHost.getActive('streaming'), item.track),
    providerPerformanceTracker.snapshot().get(candidate.source.provider),
  );
