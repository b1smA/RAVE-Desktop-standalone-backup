import { createLazyFileRoute } from '@tanstack/react-router';

import { History } from '../views/History';

export const Route = createLazyFileRoute('/history')({ component: History });
