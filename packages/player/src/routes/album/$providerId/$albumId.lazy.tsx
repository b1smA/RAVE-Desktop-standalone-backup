import { createLazyFileRoute } from '@tanstack/react-router';

import { Album } from '../../../views/Album/Album';

export const Route = createLazyFileRoute('/album/$providerId/$albumId')({
  component: Album,
});
