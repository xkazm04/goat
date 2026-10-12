import { queryOptions } from '@tanstack/react-query';

import { goatApi } from '@/lib/api';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';
import { topListsKeys } from '@/lib/query-keys/top-lists';

/**
 * Shared query definitions for top lists.
 *
 * Each factory is the single place that binds a question's key to its fetcher.
 * It is a plain function returning a plain value, so it can be called from a
 * component, a prefetch, a route loader or a server render alike — anywhere a
 * hook cannot go.
 *
 * Only what is invariant across consumers belongs here: the key and the
 * fetcher, plus a default lifetime. Per-screen options (a different staleTime,
 * `enabled`, `select`) are spread on top at the call site.
 */

/** Read one list. `includeItems` is part of the identity, not an option. */
export const listOptions = (listId: string, includeItems: boolean = true) =>
  queryOptions({
    queryKey: topListsKeys.list(listId, includeItems),
    queryFn: () => goatApi.lists.get(listId, includeItems),
    staleTime: CACHE_TTL_MS.STANDARD,
  });
