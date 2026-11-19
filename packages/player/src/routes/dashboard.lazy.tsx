import { createLazyFileRoute } from '@tanstack/react-router';

import { Dashboard } from '../views/Dashboard';

export const Route = createLazyFileRoute('/dashboard')({
  component: Dashboard,
});
