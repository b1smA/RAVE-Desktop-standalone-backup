import { createLazyFileRoute } from '@tanstack/react-router';

import { FavoriteTracks } from '../../views/Favorites';

export const Route = createLazyFileRoute('/favorites/tracks')({
  component: FavoriteTracks,
});
