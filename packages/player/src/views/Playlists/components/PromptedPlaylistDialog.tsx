import { SparklesIcon } from 'lucide-react';
import { useMemo, useState, type FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, Dialog, Input, Textarea } from '@nuclearplayer/ui';

import {
  applyPromptedPlaylistRules,
  parsePromptedPlaylist,
} from '../../../services/rave/promptedPlaylist/promptedPlaylist';
import { trackIdentity } from '../../../services/rave/trackIdentity';
import { useFavoritesStore } from '../../../stores/favoritesStore';
import { usePlaylistStore } from '../../../stores/playlistStore';
import { useRaveLibraryStore } from '../../../stores/raveLibraryStore';

type PromptedPlaylistDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const PromptedPlaylistDialog: FC<PromptedPlaylistDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation('playlists');
  const [name, setName] = useState('RAVE Prompt');
  const [prompt, setPrompt] = useState('');
  const favorites = useFavoritesStore((state) => state.tracks);
  const listenLater = useRaveLibraryStore((state) => state.listenLater);
  const profiles = useRaveLibraryStore((state) => state.trackProfiles);
  const createSmartPlaylist = usePlaylistStore(
    (state) => state.createSmartPlaylist,
  );
  const rules = useMemo(() => parsePromptedPlaylist(prompt), [prompt]);
  const library = useMemo(() => {
    const unique = new Map(
      [...favorites.map((entry) => entry.ref), ...listenLater].map((track) => [
        trackIdentity(track),
        track,
      ]),
    );
    return [...unique.values()];
  }, [favorites, listenLater]);
  const tracks = useMemo(
    () => applyPromptedPlaylistRules(library, profiles, rules),
    [library, profiles, rules],
  );
  const ruleLabels = [
    rules.mood && t('prompted.rules.mood', { value: rules.mood }),
    rules.offlineOnly && t('prompted.rules.offline'),
    rules.yearFrom &&
      rules.yearTo &&
      t('prompted.rules.years', { from: rules.yearFrom, to: rules.yearTo }),
    rules.targetDurationMinutes &&
      t('prompted.rules.duration', { count: rules.targetDurationMinutes }),
    ...rules.excludedArtists.map((artist) =>
      t('prompted.rules.exclude', { artist }),
    ),
  ].filter(Boolean) as string[];

  const create = async (): Promise<void> => {
    await createSmartPlaylist(name.trim(), tracks, [
      'rave:smart',
      'rave:prompted',
      `rave:prompt:${prompt.trim()}`,
    ]);
    onClose();
  };

  return (
    <Dialog.Root isOpen={isOpen} onClose={onClose}>
      <Dialog.Title>{t('prompted.title')}</Dialog.Title>
      <div className="mt-4 flex flex-col gap-3">
        <Input
          data-testid="prompted-playlist-name"
          label={t('prompted.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          data-testid="prompted-playlist-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={t('prompted.placeholder')}
        />
        <div
          data-testid="prompted-playlist-rules"
          className="flex flex-wrap gap-2"
        >
          {ruleLabels.length > 0
            ? ruleLabels.map((label) => (
                <span
                  key={label}
                  className="surface-secondary rounded-full px-3 py-1 text-xs"
                >
                  {label}
                </span>
              ))
            : t('prompted.noRules')}
        </div>
        <p className="text-foreground/70 text-sm">
          {t('prompted.preview', { count: tracks.length })}
        </p>
      </div>
      <Dialog.Actions>
        <Dialog.Close>{t('common:actions.cancel')}</Dialog.Close>
        <Button
          data-testid="create-prompted-playlist"
          disabled={!name.trim() || !prompt.trim() || tracks.length === 0}
          onClick={() => void create()}
        >
          <SparklesIcon size={16} />
          {t('prompted.create')}
        </Button>
      </Dialog.Actions>
    </Dialog.Root>
  );
};
