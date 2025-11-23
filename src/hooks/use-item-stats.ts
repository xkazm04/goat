import { useQuery } from '@tanstack/react-query';
import { itemStatsApi, ItemStatsParams } from '@/lib/api/item-stats';

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
export function useItemStats(
  params?: ItemStatsParams,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: itemStatsKeys.list(params || {}),
    queryFn: () => itemStatsApi.getItemStats(params),
    staleTime: options?.staleTime || 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook to fetch stats for a single item
 */
export function useItemStat(
  itemId: string,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: itemStatsKeys.item(itemId),
    queryFn: () => itemStatsApi.getItemStat(itemId),
    staleTime: options?.staleTime || 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? !!itemId,
  });
}
