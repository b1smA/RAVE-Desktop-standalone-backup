import { createLazyFileRoute } from '@tanstack/react-router';

import { Artist } from '../../../views/Artist/Artist';

export const Route = createLazyFileRoute('/artist/$providerId/$artistId')({
  component: Artist,
});
