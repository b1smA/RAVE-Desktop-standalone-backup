import { createLazyFileRoute } from '@tanstack/react-router';

import { FavoriteAlbums } from '../../views/Favorites';

export const Route = createLazyFileRoute('/favorites/albums')({
  component: FavoriteAlbums,
});
