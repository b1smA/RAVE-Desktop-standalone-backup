import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/search')({
  validateSearch: z.object({
    q: z.string().min(1).max(100).default(''),
  }),
});
