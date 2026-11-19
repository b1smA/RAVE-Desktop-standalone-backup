import { PinIcon } from 'lucide-react';
import { type FC, type MouseEvent } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { PlaylistIndexEntry } from '@nuclearplayer/model';
import { Card, CardGrid } from '@nuclearplayer/ui';

import { PlaylistArtwork } from './PlaylistArtwork';

type PlaylistCardGridProps = {
  playlists: PlaylistIndexEntry[];
  onCardClick: (id: string) => void;
  pinnedIds?: string[];
  onTogglePinned?: (id: string) => void;
};

export const PlaylistCardGrid: FC<PlaylistCardGridProps> = ({
  playlists,
  onCardClick,
  pinnedIds = [],
  onTogglePinned,
}) => {
  const { t } = useTranslation('playlists');

  return (
    <CardGrid>
      {playlists.map((playlist) => {
        const isPinned = pinnedIds.includes(playlist.id);
        const handlePin = (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          onTogglePinned?.(playlist.id);
        };
        return (
          <div key={playlist.id} className="relative">
            <Card
              image={
                <PlaylistArtwork
                  name={playlist.name}
                  thumbnails={playlist.thumbnails}
                />
              }
              title={playlist.name}
              subtitle={t('trackCount', { count: playlist.itemCount })}
              onClick={() => onCardClick(playlist.id)}
            />
            <button
              type="button"
              className="surface-background border-border absolute top-2 right-2 z-10 flex size-8 cursor-pointer items-center justify-center rounded-md border-(length:--border-width)"
              aria-label={isPinned ? t('unpin') : t('pin')}
              aria-pressed={isPinned}
              data-testid="pin-playlist-button"
              onClick={handlePin}
            >
              <PinIcon size={16} fill={isPinned ? 'currentColor' : 'none'} />
            </button>
          </div>
        );
      })}
    </CardGrid>
  );
};
