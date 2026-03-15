import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { goatApi, ItemStatsParams } from '@/lib/api';

// Cache time constants
const DEFAULT_STALE_TIME_MS = 2 * 60 * 1000; // 2 minutes

// Common query options type
interface QueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

// Helper to build common query config
const buildQueryConfig = (options?: QueryOptions, defaultEnabled = true) => ({
  staleTime: options?.staleTime ?? DEFAULT_STALE_TIME_MS,
  refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  enabled: options?.enabled ?? defaultEnabled,
});

// Query Keys
export const itemStatsKeys = {
  all: ['item-stats'] as const,
  lists: () => [...itemStatsKeys.all, 'list'] as const,
  list: (params: ItemStatsParams) => [...itemStatsKeys.lists(), params] as const,
  item: (itemId: string) => [...itemStatsKeys.all, 'item', itemId] as const,
};

/**
 * Hook to fetch stats for multiple items
 * Returns average ranking, selection count, and percentile data
 */
export function useItemStats(params?: ItemStatsParams, options?: QueryOptions) {
  return useQuery({
    queryKey: itemStatsKeys.list(params || {}),
    queryFn: () => goatApi.items.getStats(params),
    ...buildQueryConfig(options),
  });
}

/**
 * Hook to fetch stats for a single item
 */
export function useItemStat(itemId: string, options?: QueryOptions) {
  return useQuery({
    queryKey: itemStatsKeys.item(itemId),
    queryFn: () => goatApi.items.getStat(itemId),
    ...buildQueryConfig(options, !!itemId),
  });
}

/**
 * Hook to batch-prefetch stats for multiple items in a single request.
 * Seeds the individual item query caches so child useItemStat hooks
 * find data already available without making per-item requests.
 */
export function useItemStatsBatch(itemIds: string[], options?: QueryOptions) {
  const queryClient = useQueryClient();
  const prevKeyRef = useRef('');

  const stableKey = itemIds.slice().sort().join(',');
  const enabled = (options?.enabled ?? true) && itemIds.length > 0;

  const query = useQuery({
    queryKey: itemStatsKeys.list({ item_ids: itemIds }),
    queryFn: () => goatApi.items.getStats({ item_ids: itemIds }),
    ...buildQueryConfig(options, enabled),
  });

  // Seed individual item caches when batch data arrives
  useEffect(() => {
    if (!query.data?.stats || stableKey === prevKeyRef.current) return;
    prevKeyRef.current = stableKey;

    for (const stat of query.data.stats) {
      queryClient.setQueryData(
        itemStatsKeys.item(stat.item_id),
        stat,
      );
    }
  }, [query.data, stableKey, queryClient]);

  return query;
}
