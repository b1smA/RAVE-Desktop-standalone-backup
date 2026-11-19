import { createLazyFileRoute } from '@tanstack/react-router';

import { PlaylistImport } from '../../views/PlaylistImport/PlaylistImport';

export const Route = createLazyFileRoute('/playlists/import/$providerId')({
  component: PlaylistImport,
});
