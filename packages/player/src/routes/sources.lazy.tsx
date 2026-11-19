import { createLazyFileRoute } from '@tanstack/react-router';

import { Sources } from '../views/Sources';

export const Route = createLazyFileRoute('/sources')({ component: Sources });
