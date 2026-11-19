import { PictureInPicture2Icon } from 'lucide-react';
import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, PlayerBar } from '@nuclearplayer/ui';

import { enterMiniPlayer } from '../../services/miniPlayerWindow';
import { ConnectedControls } from './ConnectedControls';
import { ConnectedNowPlaying } from './ConnectedNowPlaying';
import { ConnectedSeekBar } from './ConnectedSeekBar';
import { ConnectedSourceInspector } from './ConnectedSourceInspector';
import { ConnectedVolume } from './ConnectedVolume';

export const ConnectedPlayerBar: FC = () => {
  const { t } = useTranslation('playerBar');
  return (
    <>
      <ConnectedSeekBar />
      <PlayerBar
        left={<ConnectedNowPlaying />}
        center={<ConnectedControls />}
        right={
          <div className="flex items-center gap-2">
            <Button
              data-testid="enter-mini-player"
              size="xs"
              variant="text"
              title={t('miniPlayer.enter')}
              onClick={() => void enterMiniPlayer()}
            >
              <PictureInPicture2Icon size={18} />
            </Button>
            <ConnectedSourceInspector />
            <ConnectedVolume />
          </div>
        }
      />
    </>
  );
};
