import { createLazyFileRoute } from '@tanstack/react-router';

import { FavoriteArtists } from '../../views/Favorites';

export const Route = createLazyFileRoute('/favorites/artists')({
  component: FavoriteArtists,
});
