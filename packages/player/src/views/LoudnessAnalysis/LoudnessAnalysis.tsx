import { ActivityIcon } from 'lucide-react';
import { useState, type FC } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, ViewShell } from '@nuclearplayer/ui';

import {
  analyzeTrackLoudness,
  getLoudnessAnalysisCount,
} from '../../services/loudnessAnalysis';
import { useFavoritesStore } from '../../stores/favoritesStore';
import { errorMessage } from '../../utils/errorMessage';

export const LoudnessAnalysis: FC = () => {
  const { t } = useTranslation('preferences');
  const tracks = useFavoritesStore((state) => state.tracks);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(getLoudnessAnalysisCount());

  const analyze = async (): Promise<void> => {
    setBusy(true);
    let analyzed = 0;
    let failed = 0;
    for (const entry of tracks) {
      try {
        await analyzeTrackLoudness(entry.ref);
        analyzed += 1;
        setCompleted(getLoudnessAnalysisCount());
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    if (failed > 0) {
      toast.warning(t('loudnessAnalysis.partial', { analyzed, failed }));
      return;
    }
    toast.success(t('loudnessAnalysis.complete', { analyzed }));
  };

  return (
    <ViewShell title={t('loudnessAnalysis.title')}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
        <p className="text-foreground/70 text-sm">
          {t('loudnessAnalysis.description')}
        </p>
        <div className="surface-card border-border rounded-lg border-(length:--border-width) p-4 text-sm">
          {t('loudnessAnalysis.status', {
            analyzed: completed,
            total: tracks.length,
          })}
        </div>
        <Button
          data-testid="analyze-library-loudness"
          className="justify-center gap-2"
          disabled={busy || tracks.length === 0}
          onClick={() =>
            void analyze().catch((error) => toast.error(errorMessage(error)))
          }
        >
          <ActivityIcon size={18} />
          {busy ? t('loudnessAnalysis.running') : t('loudnessAnalysis.start')}
        </Button>
      </div>
    </ViewShell>
  );
};
