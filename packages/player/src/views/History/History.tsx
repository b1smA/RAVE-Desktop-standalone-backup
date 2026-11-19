import { useNavigate } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { FC, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Tabs, ViewShell } from '@nuclearplayer/ui';

import { buildReplayTracks } from '../../services/rave/replay/raveReplay';
import { commands } from '../../services/tauri/bindings';
import { unwrapResult } from '../../services/tauri/results';
import { usePlaylistStore } from '../../stores/playlistStore';
import { HistoryList } from './components/HistoryList';
import { HistoryStats } from './components/HistoryStats';
import { RaveWeekly } from './components/RaveWeekly';

export const History: FC = () => {
  const { t } = useTranslation('history');
  const [selectedTab, setSelectedTab] = useState(0);
  const [creatingReplay, setCreatingReplay] = useState(false);
  const navigate = useNavigate();

  const createReplay = async () => {
    setCreatingReplay(true);
    try {
      const page = unwrapResult(
        await commands.historyFetch({ limit: 500, offset: 0 }),
      );
      const tracks = buildReplayTracks(page.items);
      if (tracks.length === 0) {
        return;
      }
      const playlistId = await usePlaylistStore
        .getState()
        .createSmartPlaylist(t('replay.playlistName'), tracks, [
          'rave:smart',
          'rave:replay',
        ]);
      navigate({ to: '/playlists/$playlistId', params: { playlistId } });
    } finally {
      setCreatingReplay(false);
    }
  };

  return (
    <ViewShell data-testid="history-view" title={t('title')}>
      <RaveWeekly />
      <Button className="mb-4" disabled={creatingReplay} onClick={createReplay}>
        <Sparkles />
        {t('replay.createPlaylist')}
      </Button>
      <Tabs
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
        className="flex flex-1 flex-col overflow-hidden"
        panelsClassName="flex-1 overflow-hidden"
        panelClassName="flex flex-1 overflow-hidden"
        items={[
          {
            id: 'stats',
            label: t('tabs.stats'),
            content: <HistoryStats />,
          },
          {
            id: 'listening-history',
            label: t('tabs.listeningHistory'),
            content: <HistoryList />,
          },
        ]}
      />
    </ViewShell>
  );
};
