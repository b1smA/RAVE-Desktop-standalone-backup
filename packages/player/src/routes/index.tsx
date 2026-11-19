import { createFileRoute, redirect } from '@tanstack/react-router';

import { getSetting } from '../stores/settingsStore';

const getStartPage = () => {
  switch (getSetting('core.general.startPage')) {
    case 'favorites':
      return '/favorites/tracks' as const;
    case 'playlists':
      return '/playlists' as const;
    case 'history':
      return '/history' as const;
    case 'sources':
      return '/sources' as const;
    default:
      return '/dashboard' as const;
  }
};

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: getStartPage(),
    });
  },
});
