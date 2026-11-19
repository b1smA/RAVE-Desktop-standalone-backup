import { GaugeIcon } from 'lucide-react';
import { FC, useMemo } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Popover } from '@nuclearplayer/ui';

import { useCurrentQueueItem } from '../../hooks/useCurrentQueueItem';
import { useQueueActions } from '../../hooks/useQueueActions';
import {
  buildSourceDiagnosticReport,
  sourceDiagnosticsForItem,
} from '../../services/rave/smartSource/sourceDiagnostics';

const percent = (value: number): string => `${Math.round(value * 100)}%`;

export const ConnectedSourceInspector: FC = () => {
  const { t } = useTranslation('queue');
  const item = useCurrentQueueItem();
  const { selectCandidate } = useQueueActions();
  const diagnostics = useMemo(
    () => (item ? sourceDiagnosticsForItem(item) : []),
    [item],
  );
  const selected = diagnostics.find((diagnostic) => diagnostic.selected);

  if (!item || diagnostics.length === 0) {
    return null;
  }

  const copyDiagnostics = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildSourceDiagnosticReport(item));
      toast.success(t('sourceInspector.copied'));
    } catch {
      toast.error(t('sourceInspector.copyFailed'));
    }
  };

  return (
    <Popover
      className="relative"
      anchor="top end"
      panelClassName="w-96 p-0"
      trigger={
        <Button
          data-testid="source-inspector-button"
          size="xs"
          variant="text"
          title={t('sourceInspector.title')}
          className="gap-1 px-2"
        >
          <GaugeIcon size={18} />
          <span className="max-w-24 truncate text-xs font-bold">
            {selected?.candidate.stream?.bitrateKbps
              ? `${selected.candidate.stream.bitrateKbps} kbps`
              : (selected?.candidate.stream?.qualityLabel ??
                percent(selected?.total ?? 0))}
          </span>
        </Button>
      }
    >
      <div data-testid="source-inspector" className="flex flex-col">
        <div className="border-border border-b px-4 py-3">
          <div className="font-bold">{t('sourceInspector.title')}</div>
          {selected && (
            <div className="text-foreground/60 mt-1 text-xs">
              {t('sourceInspector.selected', {
                provider: selected.candidate.source.provider,
                score: percent(selected.total),
              })}
            </div>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {diagnostics.map((diagnostic) => {
            const { candidate } = diagnostic;
            return (
              <button
                type="button"
                key={`${candidate.source.provider}:${candidate.id}`}
                data-testid="source-inspector-candidate"
                data-selected={diagnostic.selected}
                disabled={candidate.failed}
                onClick={() => selectCandidate(item.id, candidate.id)}
                className="hover:bg-background disabled:text-foreground/40 border-border flex w-full flex-col gap-1 border-b px-4 py-3 text-left disabled:cursor-not-allowed"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold">
                    {candidate.title}
                  </span>
                  <span className="text-xs">{percent(diagnostic.total)}</span>
                </div>
                <div className="text-foreground/60 flex flex-wrap gap-x-3 text-xs">
                  <span>{candidate.source.provider}</span>
                  {candidate.stream?.qualityLabel && (
                    <span>{candidate.stream.qualityLabel}</span>
                  )}
                  {candidate.stream?.bitrateKbps && (
                    <span>{candidate.stream.bitrateKbps} kbps</span>
                  )}
                  {candidate.stream?.codec && (
                    <span>{candidate.stream.codec}</span>
                  )}
                </div>
                <div className="text-foreground/50 text-xs">
                  {t('sourceInspector.factors', {
                    title: percent(diagnostic.titleMatch),
                    duration: percent(diagnostic.durationMatch),
                    quality: percent(diagnostic.quality),
                    speed: percent(diagnostic.speed),
                    reliability: percent(diagnostic.reliability),
                  })}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3">
          <Button
            data-testid="copy-source-diagnostics"
            size="xs"
            variant="secondary"
            className="w-full justify-center"
            onClick={copyDiagnostics}
          >
            {t('sourceInspector.copyDiagnostics')}
          </Button>
        </div>
      </div>
    </Popover>
  );
};
