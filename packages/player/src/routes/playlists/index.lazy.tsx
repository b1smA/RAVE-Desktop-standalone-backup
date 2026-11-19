import { createLazyFileRoute } from '@tanstack/react-router';

import { PlaylistsView } from '../../views/Playlists';

export const Route = createLazyFileRoute('/playlists/')({
  component: PlaylistsView,
});
