import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { goatApi } from '@/lib/api';
import { topListsKeys } from '@/lib/query-keys/top-lists';
import { ListWithItems } from '@/types/top-lists';

interface ListPreviewData {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  itemCount: number;
  averageRanking?: number;
  timePeriod?: string;
  createdAt: string;
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
    queryKey: topListsKeys.list(listId, true),
    queryFn: () => goatApi.lists.get(listId, true),
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

  // Transform API response to preview data
  const previewData: ListPreviewData | null = data
    ? {
        title: data.title,
        category: data.category,
        subcategory: data.subcategory,
        size: data.size,
        itemCount: data.items?.length || 0,
        averageRanking: calculateAverageRanking(data.items),
        timePeriod: data.time_period,
        createdAt: data.created_at,
      }
    : null;

  return {
    previewData,
    isLoading: shouldFetch && isLoading,
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
        queryKey: topListsKeys.list(listId, true),
        queryFn: () => goatApi.lists.get(listId, true),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );
}
