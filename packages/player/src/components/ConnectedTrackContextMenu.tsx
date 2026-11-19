import {
  Ban,
  BookmarkPlus,
  BrainCircuit,
  Clock3,
  Heart,
  ListEnd,
  ListMusicIcon,
  ListStart,
  MessageSquareWarning,
  Play,
  Radio,
  Sparkles,
  Tags,
  UserRoundX,
} from 'lucide-react';
import { FC, ReactNode, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { pickArtwork, Track } from '@nuclearplayer/model';
import {
  Button,
  Dialog,
  Input,
  Textarea,
  TrackContextMenu,
} from '@nuclearplayer/ui';

import { usePlaylistSubmenu } from '../hooks/usePlaylistSubmenu';
import { useProviders } from '../hooks/useProviders';
import { useTrackActions } from '../hooks/useTrackActions';
import { trackIdentity } from '../services/rave/trackIdentity';
import { useRaveLibraryStore } from '../stores/raveLibraryStore';
import { useSettingsStore } from '../stores/settingsStore';

type ConnectedTrackContextMenuProps = {
  track: Track;
  children: ReactNode;
};

export const ConnectedTrackContextMenu: FC<ConnectedTrackContextMenuProps> = ({
  track,
  children,
}) => {
  const { t } = useTranslation('track');
  const { t: tPlaylists } = useTranslation('playlists');
  const trackActions = useTrackActions();
  const playlistSubmenu = usePlaylistSubmenu();
  useSettingsStore((state) => state.values['core.playback.blockedArtists']);
  const trackProfiles = useRaveLibraryStore((state) => state.trackProfiles);
  const trackProfile = trackProfiles[trackIdentity(track)] ?? {};
  const hasDiscoveryProvider = useProviders('discovery').length > 0;

  const isFavorite = trackActions.isFavorite(track);
  const isArtistBlocked = trackActions.isArtistBlocked(track);
  const thumbnail = pickArtwork(track.artwork, 'thumbnail', 64)?.url;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const sourceCandidates = track.streamCandidates ?? [];
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [tags, setTags] = useState(trackProfile.tags?.join(', ') ?? '');
  const [note, setNote] = useState(trackProfile.note ?? '');

  const saveProfile = async () => {
    await useRaveLibraryStore.getState().updateTrackProfile(track, {
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      note: note.trim(),
    });
    setProfileDialogOpen(false);
  };

  return (
    <>
      <TrackContextMenu>
        <TrackContextMenu.Trigger>{children}</TrackContextMenu.Trigger>
        <TrackContextMenu.Content>
          <TrackContextMenu.Header
            title={track.title}
            subtitle={artistNames}
            coverUrl={thumbnail}
          />
          <TrackContextMenu.Action
            icon={<Play size={16} />}
            onClick={() => trackActions.playNow(track)}
          >
            {t('actions.playNow')}
          </TrackContextMenu.Action>
          {sourceCandidates.length > 1 && (
            <TrackContextMenu.Submenu>
              <TrackContextMenu.Submenu.Trigger icon={<Sparkles size={16} />}>
                {t('actions.changeSource')}
              </TrackContextMenu.Submenu.Trigger>
              <TrackContextMenu.Submenu.Content>
                {sourceCandidates.map((candidate) => (
                  <TrackContextMenu.Action
                    key={`${candidate.source.provider}:${candidate.id}`}
                    onClick={() =>
                      trackActions.playNow({
                        ...track,
                        streamCandidates: [
                          candidate,
                          ...sourceCandidates.filter(
                            (sourceCandidate) =>
                              sourceCandidate.id !== candidate.id,
                          ),
                        ],
                      })
                    }
                  >
                    {candidate.source.provider} · {candidate.title}
                  </TrackContextMenu.Action>
                ))}
              </TrackContextMenu.Submenu.Content>
            </TrackContextMenu.Submenu>
          )}
          {sourceCandidates.length > 0 && (
            <TrackContextMenu.Action
              icon={<MessageSquareWarning size={16} />}
              onClick={() => setFeedbackDialogOpen(true)}
            >
              {t('actions.wrongVersion')}
            </TrackContextMenu.Action>
          )}
          <TrackContextMenu.Action
            icon={<BookmarkPlus size={16} />}
            onClick={() => trackActions.addToListenLater(track)}
            data-testid="listen-later-action"
          >
            {t('actions.listenLater')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Action
            icon={<Ban size={16} />}
            onClick={() => trackActions.toggleTrackBlocked(track)}
            data-testid="toggle-track-blocked-action"
          >
            {trackProfile.blocked
              ? t('actions.allowTrackRecommendations')
              : t('actions.blockTrackRecommendations')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Submenu>
            <TrackContextMenu.Submenu.Trigger icon={<Clock3 size={16} />}>
              {t('actions.snoozeRecommendations')}
            </TrackContextMenu.Submenu.Trigger>
            <TrackContextMenu.Submenu.Content>
              {([7, 30, 90] as const).map((days) => (
                <TrackContextMenu.Action
                  key={days}
                  data-testid={`snooze-recommendations-${days}`}
                  onClick={() =>
                    trackActions.snoozeRecommendations(track, days)
                  }
                >
                  {t('actions.snoozeDays', { count: days })}
                </TrackContextMenu.Action>
              ))}
              {trackProfile.snoozedUntilIso && (
                <TrackContextMenu.Action
                  data-testid="clear-recommendation-snooze"
                  onClick={() => trackActions.clearRecommendationSnooze(track)}
                >
                  {t('actions.clearSnooze')}
                </TrackContextMenu.Action>
              )}
            </TrackContextMenu.Submenu.Content>
          </TrackContextMenu.Submenu>
          <TrackContextMenu.Action
            icon={<BrainCircuit size={16} />}
            data-testid="toggle-taste-exclusion"
            onClick={() => trackActions.toggleTasteExclusion(track)}
          >
            {trackProfile.excludedFromTaste
              ? t('actions.includeInTasteProfile')
              : t('actions.excludeFromTasteProfile')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Submenu>
            <TrackContextMenu.Submenu.Trigger icon={<Sparkles size={16} />}>
              {t('actions.setMood')}
            </TrackContextMenu.Submenu.Trigger>
            <TrackContextMenu.Submenu.Content>
              {(['focus', 'calm', 'energy', 'sleep', 'party'] as const).map(
                (mood) => (
                  <TrackContextMenu.Action
                    key={mood}
                    onClick={() => trackActions.setMood(track, mood)}
                  >
                    {t(`moods.${mood}`)}
                  </TrackContextMenu.Action>
                ),
              )}
            </TrackContextMenu.Submenu.Content>
          </TrackContextMenu.Submenu>
          <TrackContextMenu.Action
            icon={<Tags size={16} />}
            onClick={() => setProfileDialogOpen(true)}
          >
            {t('actions.editTagsAndNote')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Action
            icon={<UserRoundX size={16} />}
            onClick={() => trackActions.toggleArtistBlocked(track)}
            data-testid="toggle-artist-blocked-action"
          >
            {isArtistBlocked
              ? t('actions.allowArtistRecommendations')
              : t('actions.blockArtistRecommendations')}
          </TrackContextMenu.Action>
          {hasDiscoveryProvider && (
            <TrackContextMenu.Action
              icon={<Radio size={16} />}
              onClick={() => trackActions.startRadio(track)}
              data-testid="start-track-radio-action"
            >
              {t('actions.startRadio')}
            </TrackContextMenu.Action>
          )}
          <TrackContextMenu.Action
            icon={<ListStart size={16} />}
            onClick={() => trackActions.addNext(track)}
          >
            {t('actions.playNext')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Action
            icon={<ListEnd size={16} />}
            onClick={() => trackActions.addToQueue(track)}
          >
            {t('actions.addToQueue')}
          </TrackContextMenu.Action>
          <TrackContextMenu.Action
            icon={
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            }
            onClick={() => trackActions.toggleFavorite(track)}
          >
            {isFavorite
              ? t('actions.removeFromFavorites')
              : t('actions.addToFavorites')}
          </TrackContextMenu.Action>
          {playlistSubmenu.hasPlaylists && (
            <TrackContextMenu.Submenu>
              <TrackContextMenu.Submenu.Trigger
                icon={<ListMusicIcon size={16} />}
              >
                {tPlaylists('addToPlaylist')}
              </TrackContextMenu.Submenu.Trigger>
              <TrackContextMenu.Submenu.Content>
                {playlistSubmenu.showFilter && (
                  <div onKeyDown={(event) => event.stopPropagation()}>
                    <Input
                      size="sm"
                      variant="borderless"
                      placeholder={tPlaylists('filterPlaylists')}
                      value={playlistSubmenu.filterText}
                      onChange={(event) =>
                        playlistSubmenu.setFilterText(event.target.value)
                      }
                      data-testid="playlist-filter-input"
                    />
                  </div>
                )}
                {playlistSubmenu.playlists.map((entry) => (
                  <TrackContextMenu.Action
                    key={entry.id}
                    onClick={() => playlistSubmenu.addTracks(entry.id, [track])}
                    data-testid="playlist-submenu-item"
                  >
                    {entry.name}
                  </TrackContextMenu.Action>
                ))}
              </TrackContextMenu.Submenu.Content>
            </TrackContextMenu.Submenu>
          )}
        </TrackContextMenu.Content>
      </TrackContextMenu>
      <Dialog.Root
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      >
        <Dialog.Title>{t('profile.title')}</Dialog.Title>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label={t('profile.tags')}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={t('profile.tagsPlaceholder')}
          />
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('profile.notePlaceholder')}
          />
        </div>
        <Dialog.Actions>
          <Dialog.Close>{t('common:actions.cancel')}</Dialog.Close>
          <Button onClick={saveProfile}>{t('common:actions.save')}</Button>
        </Dialog.Actions>
      </Dialog.Root>
      <Dialog.Root
        isOpen={feedbackDialogOpen}
        onClose={() => setFeedbackDialogOpen(false)}
      >
        <Dialog.Title>{t('sourceFeedback.title')}</Dialog.Title>
        <p className="text-foreground/70 mt-2 text-sm">
          {t('sourceFeedback.description')}
        </p>
        <div className="mt-4 grid gap-2">
          {(
            [
              'wrongArtist',
              'live',
              'remix',
              'slowed',
              'truncated',
              'insertions',
              'poorQuality',
            ] as const
          ).map((reason) => (
            <Button
              key={reason}
              variant="noShadow"
              className="justify-start"
              onClick={() => {
                void trackActions.reportWrongVersion(track, reason);
                setFeedbackDialogOpen(false);
              }}
              data-testid={`source-feedback-${reason}`}
            >
              {t(`sourceFeedback.${reason}`)}
            </Button>
          ))}
        </div>
        <Dialog.Actions>
          <Dialog.Close>{t('common:actions.cancel')}</Dialog.Close>
        </Dialog.Actions>
      </Dialog.Root>
    </>
  );
};
