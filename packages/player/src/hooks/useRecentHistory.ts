import { useQuery } from '@tanstack/react-query';

import { commands } from '../services/tauri/bindings';
import { unwrapResult } from '../services/tauri/results';

const HISTORY_LIMIT = 5_000;
const HISTORY_STALE_TIME_MS = 5 * 60 * 1_000;

export const useRecentHistory = (enabled = true) =>
  useQuery({
    queryKey: ['history', 'recent', HISTORY_LIMIT],
    queryFn: async () =>
      unwrapResult(
        await commands.historyFetch({ limit: HISTORY_LIMIT, offset: 0 }),
      ).items,
    staleTime: HISTORY_STALE_TIME_MS,
    enabled,
  });
