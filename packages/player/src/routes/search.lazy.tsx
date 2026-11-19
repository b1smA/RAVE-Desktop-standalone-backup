import { createLazyFileRoute } from '@tanstack/react-router';

import { Search } from '../views/Search/Search';

export const Route = createLazyFileRoute('/search')({ component: Search });
