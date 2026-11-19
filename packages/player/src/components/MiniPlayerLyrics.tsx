import { ScrollTextIcon, XIcon } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import type { LyricsResult, Track } from '@nuclearplayer/plugin-sdk';
import { Button } from '@nuclearplayer/ui';

import { lyricsHost } from '../services/lyricsHost';
import { useSoundStore } from '../stores/soundStore';

type MiniPlayerLyricsProps = {
  track?: Track;
};

export const MiniPlayerLyrics: FC<MiniPlayerLyricsProps> = ({ track }) => {
  const { t } = useTranslation('playerBar');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsResult | undefined>();
  const seekMs = useSoundStore((state) => state.seek * 1000);
  const currentLine = useMemo(() => {
    const lines = lyrics?.syncedLines ?? [];
    return lines.reduce(
      (selected, line, index) => (line.startMs <= seekMs ? index : selected),
      -1,
    );
  }, [lyrics, seekMs]);

  const toggle = async (): Promise<void> => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || !track || lyrics || loading) {
      return;
    }
    setLoading(true);
    try {
      setLyrics(
        await lyricsHost.getLyrics({
          artist: track.artists.map((artist) => artist.name).join(', '),
          title: track.title,
          album: track.album?.title,
          durationMs: track.durationMs,
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        data-testid="mini-player-lyrics-button"
        size="xs"
        variant="text"
        title={t('miniPlayer.lyrics')}
        disabled={!track}
        onClick={() => void toggle()}
      >
        <ScrollTextIcon size={18} />
      </Button>
      {open && (
        <section
          data-testid="mini-player-lyrics"
          className="surface-background border-border absolute inset-10 z-20 flex flex-col overflow-hidden rounded-lg border-(length:--border-width) shadow-lg"
        >
          <header className="border-border flex items-center justify-between border-b px-3 py-2">
            <h2 className="font-bold">{t('miniPlayer.lyrics')}</h2>
            <Button
              size="xs"
              variant="text"
              title={t('miniPlayer.closeLyrics')}
              onClick={() => setOpen(false)}
            >
              <XIcon size={16} />
            </Button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm whitespace-pre-wrap">
            {loading && t('miniPlayer.lyricsLoading')}
            {!loading && !lyrics && t('miniPlayer.lyricsUnavailable')}
            {!loading && lyrics?.syncedLines?.length
              ? lyrics.syncedLines.map((line, index) => (
                  <p
                    key={`${line.startMs}:${index}`}
                    data-active={index === currentLine}
                    className="data-[active=true]:text-primary py-1 data-[active=true]:font-bold"
                  >
                    {line.text}
                  </p>
                ))
              : null}
            {!loading && !lyrics?.syncedLines?.length && lyrics?.plainText}
          </div>
        </section>
      )}
    </>
  );
};
