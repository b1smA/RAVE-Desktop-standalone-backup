import {
  GripVerticalIcon,
  Maximize2Icon,
  MinusIcon,
  Music2Icon,
  XIcon,
} from 'lucide-react';
import { type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork } from '@nuclearplayer/model';
import { Button } from '@nuclearplayer/ui';

import {
  closeMiniPlayer,
  exitMiniPlayer,
  minimizeMiniPlayer,
} from '../services/miniPlayerWindow';
import { useQueueStore } from '../stores/queueStore';
import { ConnectedMiniPlayerControls } from './ConnectedMiniPlayerControls';

export const ConnectedMiniPlayer: FC = () => {
  const { t } = useTranslation('playerBar');
  const currentItem = useQueueStore((state) => state.getCurrentItem());
  const track = currentItem?.track;
  const artwork = pickArtwork(track?.artwork, 'cover', 512);

  return (
    <main
      data-testid="mini-player"
      className="group bg-background text-foreground relative flex h-full min-h-0 w-full flex-1 items-center overflow-hidden"
    >
      <div className="from-primary/10 via-background to-background pointer-events-none absolute inset-0 bg-linear-to-r" />
      <div className="bg-background/90 absolute top-1 right-1 z-20 flex rounded-full opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          size="xs"
          variant="text"
          title={t('miniPlayer.minimize')}
          className="text-foreground/60 hover:text-primary rounded-full"
          onClick={() => void minimizeMiniPlayer()}
        >
          <MinusIcon size={13} />
        </Button>
        <Button
          data-testid="exit-mini-player"
          size="xs"
          variant="text"
          title={t('miniPlayer.exit')}
          className="text-foreground/60 hover:text-primary rounded-full"
          onClick={() => void exitMiniPlayer()}
        >
          <Maximize2Icon size={12} />
        </Button>
        <Button
          size="xs"
          variant="text"
          title={t('miniPlayer.close')}
          className="text-foreground/60 rounded-full hover:bg-red-500/70 hover:text-white"
          onClick={() => void closeMiniPlayer()}
        >
          <XIcon size={13} />
        </Button>
      </div>

      <div className="relative z-10 flex h-full w-full items-center gap-2 px-2 py-2.5">
        <div
          data-tauri-drag-region
          className="text-foreground/35 flex h-11 w-3 shrink-0 cursor-grab items-center justify-center"
        >
          <GripVerticalIcon size={14} />
        </div>
        <div className="border-primary/20 bg-muted flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {artwork ? (
            <img src={artwork.url} alt="" className="size-full object-cover" />
          ) : (
            <Music2Icon size={20} className="text-foreground/30" />
          )}
        </div>
        <div data-tauri-drag-region className="min-w-0 flex-1 cursor-grab">
          <h1 className="text-foreground truncate text-sm leading-tight font-bold">
            {track?.title ?? t('noTrackPlaying')}
          </h1>
          <p className="text-foreground/55 mt-1 truncate text-xs">
            {track?.artists.map((artist) => artist.name).join(', ')}
          </p>
        </div>
        <ConnectedMiniPlayerControls />
      </div>
    </main>
  );
};
