import { DownloadIcon, RefreshCwIcon } from 'lucide-react';
import { useState, type FC } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Input, ViewShell } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../hooks/useCoreSetting';
import {
  fetchLanSyncSnapshot,
  importLanSyncSnapshot,
  type LanSyncSnapshot,
} from '../../services/lanSyncService';
import { errorMessage } from '../../utils/errorMessage';

export const LanSync: FC = () => {
  const { t } = useTranslation('preferences');
  const [sourceUrl, setSourceUrl] = useCoreSetting<string>(
    'integrations.lanSync.sourceUrl',
  );
  const [pairingCode, setPairingCode] = useState('');
  const [snapshot, setSnapshot] = useState<LanSyncSnapshot>();
  const [busy, setBusy] = useState(false);

  const preview = async (): Promise<void> => {
    setBusy(true);
    try {
      setSnapshot(await fetchLanSyncSnapshot(sourceUrl ?? '', pairingCode));
    } catch (error) {
      toast.error(
        t('lanSync.connectionFailed', { error: errorMessage(error) }),
      );
    } finally {
      setBusy(false);
    }
  };

  const importSnapshot = async (): Promise<void> => {
    if (!snapshot) {
      return;
    }
    setBusy(true);
    try {
      const result = await importLanSyncSnapshot(snapshot);
      toast.success(t('lanSync.importComplete', result));
      setSnapshot(undefined);
    } catch (error) {
      toast.error(t('lanSync.importFailed', { error: errorMessage(error) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ViewShell title={t('lanSync.title')}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
        <p className="text-foreground/70 text-sm">{t('lanSync.description')}</p>
        <Input
          data-testid="lan-sync-url"
          label={t('lanSync.sourceUrl')}
          value={sourceUrl ?? ''}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="http://192.168.1.20:4120"
        />
        <Input
          data-testid="lan-sync-code"
          label={t('lanSync.pairingCode')}
          value={pairingCode}
          onChange={(event) => setPairingCode(event.target.value)}
          placeholder="000000"
        />
        <Button
          data-testid="lan-sync-preview"
          className="justify-center gap-2"
          disabled={busy || !sourceUrl}
          onClick={() => void preview()}
        >
          <RefreshCwIcon size={18} />
          {t('lanSync.preview')}
        </Button>

        {snapshot && (
          <section
            data-testid="lan-sync-preview-result"
            className="surface-card border-border rounded-lg border-(length:--border-width) p-4"
          >
            <h2 className="font-bold">{t('lanSync.previewTitle')}</h2>
            <p className="mt-2 text-sm">
              {t('lanSync.previewCounts', {
                playlists: snapshot.playlists.length,
                history: snapshot.history.length,
                settings: Object.keys(snapshot.settings).length,
              })}
            </p>
            <Button
              data-testid="lan-sync-import"
              className="mt-4 justify-center gap-2"
              disabled={busy}
              onClick={() => void importSnapshot()}
            >
              <DownloadIcon size={18} />
              {t('lanSync.import')}
            </Button>
          </section>
        )}
      </div>
    </ViewShell>
  );
};
