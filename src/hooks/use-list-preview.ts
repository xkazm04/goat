import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

import { topListsKeys } from '@/lib/query-keys/top-lists';
import { listOptions } from '@/lib/query-options/top-lists';
import { ListWithItems, TopList } from '@/types/top-lists';

interface ListPreviewData {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  /** Undefined while only a summary is known: unknown, not zero. */
  itemCount?: number;
  averageRanking?: number;
  timePeriod?: string;
  createdAt: string;
}

/**
 * The freshest summary of this list that any listing in the family already
 * holds. Found by the list's id, not by the key of the listing the card came
 * from: the same list is cached under several listing keys (landing section,
 * command palette), and a lookup that names one of them misses silently the
 * day that listing's parameters change. Only listing entries (arrays) are
 * read; a detail entry or the featured bundle is not a summary of this list.
 */
function findListSummary(queryClient: QueryClient, listId: string): TopList | undefined {
  const listings = queryClient
    .getQueryCache()
    .findAll({ queryKey: topListsKeys.lists() })
    .filter((q) => Array.isArray(q.state.data))
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
  for (const q of listings) {
    const hit = (q.state.data as TopList[]).find((l) => l?.id === listId);
    if (hit) return hit;
  }
  return undefined;
}

interface UseListPreviewOptions {
  /** Delay in ms before fetching on hover (default: 200ms) */
  hoverDelay?: number;
  /** Stale time in ms for cached data (default: 5 minutes) */
  staleTime?: number;
}

/**
 * Hook for lazy-loading list preview data on hover.
 * Caches results to avoid repeated network calls.
 */
export function useListPreview(
  listId: string,
  options: UseListPreviewOptions = {}
) {
  const { hoverDelay = 200, staleTime = 5 * 60 * 1000 } = options;
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    ...listOptions(listId),
    enabled: shouldFetch && !!listId,
    staleTime,
  });

  const startHover = useCallback(() => {
    // Check if data is already in cache
    const cachedData = queryClient.getQueryData<ListWithItems>(
      topListsKeys.list(listId, true)
    );

    if (cachedData) {
      // Data is cached, enable fetch immediately (will use cache)
      setShouldFetch(true);
      return;
    }

    // Delay fetch to avoid unnecessary requests on quick mouse movements
    const timeout = setTimeout(() => {
      setShouldFetch(true);
    }, hoverDelay);

    setHoverTimeout(timeout);
  }, [listId, hoverDelay, queryClient]);

  const endHover = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Keep shouldFetch true to preserve cache access
  }, [hoverTimeout]);

  // Until the detail lands, the card's own summary can paint what it carries.
  // It carries no items, so everything derived from items stays unknown.
  const summary = data ? undefined : findListSummary(queryClient, listId);
  const known = data ?? summary;

  // Transform API response to preview data
  const previewData: ListPreviewData | null = known
    ? {
        title: known.title,
        category: known.category,
        subcategory: known.subcategory,
        size: known.size,
        itemCount: data ? data.items?.length || 0 : undefined,
        averageRanking: data ? calculateAverageRanking(data.items) : undefined,
        timePeriod: known.time_period,
        createdAt: known.created_at,
      }
    : null;

  return {
    previewData,
    isLoading: shouldFetch && isLoading && !summary,
    isPartial: !data && !!summary,
    error,
    startHover,
    endHover,
    isCached: !!queryClient.getQueryData(topListsKeys.list(listId, true)),
  };
}

/**
 * Calculate average ranking from list items.
 * Returns undefined if no items have rankings.
 */
function calculateAverageRanking(
  items?: Array<{ ranking?: number; position?: number }>
): number | undefined {
  if (!items || items.length === 0) return undefined;

  const rankings = items
    .map((item) => item.position ?? item.ranking)
    .filter((r): r is number => r !== undefined && r !== null);

  if (rankings.length === 0) return undefined;

  const sum = rankings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / rankings.length) * 10) / 10; // Round to 1 decimal
}

/**
 * Prefetch list preview data for a list.
 * Useful for prefetching on focus or keyboard navigation.
 */
export function usePrefetchListPreview() {
  const queryClient = useQueryClient();

  return useCallback(
    (listId: string) => {
      queryClient.prefetchQuery({
        ...listOptions(listId),
      });
    },
    [queryClient]
  );
}
