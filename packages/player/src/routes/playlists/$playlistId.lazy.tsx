import { createLazyFileRoute } from '@tanstack/react-router';

import { PlaylistDetailView } from '../../views/PlaylistDetail';

export const Route = createLazyFileRoute('/playlists/$playlistId')({
  component: PlaylistDetailView,
});
