import { join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@nuclearplayer/i18n';
import type { Track } from '@nuclearplayer/model';

import { downloadFile } from '../services/tauri/commands';
import { reportError } from '../utils/logging';

const safeFilename = (value: string): string =>
  [...value]
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
        ? '_'
        : character,
    )
    .join('')
    .trim();

export const useTrackDownloads = (tracks: Track[]) => {
  const { t } = useTranslation('downloads');
  const [downloading, setDownloading] = useState(false);

  const downloadTracks = useCallback(async () => {
    const directory = await open({ directory: true, multiple: false });
    if (!directory || Array.isArray(directory)) {
      return;
    }

    setDownloading(true);
    let downloaded = 0;
    try {
      for (const track of tracks) {
        const candidate = track.streamCandidates?.find(
          (streamCandidate) =>
            !streamCandidate.failed && streamCandidate.stream?.url,
        );
        if (!candidate?.stream?.url) {
          continue;
        }
        const artist = track.artists.map((item) => item.name).join(', ');
        const extension = safeFilename(
          candidate.stream.codec?.toLocaleLowerCase() || 'audio',
        );
        const destination = await join(
          directory,
          `${safeFilename(`${artist} - ${track.title}`)}.${extension}`,
        );
        await downloadFile(candidate.stream.url, destination);
        downloaded += 1;
      }
      toast.success(t('complete', { count: downloaded }));
    } catch (error) {
      await reportError('playback', {
        userMessage: t('failed'),
        error,
      });
    } finally {
      setDownloading(false);
    }
  }, [t, tracks]);

  return { downloadTracks, downloading };
};
