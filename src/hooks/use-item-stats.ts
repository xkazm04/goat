import { useQuery } from '@tanstack/react-query';
import { itemStatsApi, ItemStatsParams } from '@/lib/api/item-stats';

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
    queryFn: () => itemStatsApi.getItemStats(params),
    ...buildQueryConfig(options),
  });
}

/**
 * Hook to fetch stats for a single item
 */
export function useItemStat(itemId: string, options?: QueryOptions) {
  return useQuery({
    queryKey: itemStatsKeys.item(itemId),
    queryFn: () => itemStatsApi.getItemStat(itemId),
    ...buildQueryConfig(options, !!itemId),
  });
}
