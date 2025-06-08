import {
  useQuery,
  useInfiniteQuery,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { topItemsApi, TopItem, ItemSearchParams, ItemGroup, GroupedItemsResponse } from '@/app/lib/api/top-items';
import { topItemsKeys } from '@/app/lib/query-keys/top-items';
import React from 'react';
// Basic items search hook
export const useTopItems = (
  params?: ItemSearchParams,
  options?: UseQueryOptions<TopItem[], Error>
) => {
  return useQuery({
    queryKey: topItemsKeys.itemsSearch(params || {}),
    queryFn: () => topItemsApi.searchItems(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Hook for getting items grouped by category
export const useTopItemsGrouped = (
  params?: ItemSearchParams,
  options?: UseQueryOptions<GroupedItemsResponse, Error>
) => {
  return useQuery({
    queryKey: topItemsKeys.itemsGrouped(params || {}),
    queryFn: () => topItemsApi.getItemsGrouped(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

// Hook for category-specific items
export const useCategoryItems = (
  category: string,
  subcategory?: string,
  options?: UseQueryOptions<TopItem[], Error>
) => {
  const params: ItemSearchParams = {
    category,
    subcategory,
    sort_by: 'popularity',
    limit: 30, 
  };

  return useQuery({
    queryKey: topItemsKeys.categoryItems(category, subcategory),
    queryFn: () => topItemsApi.searchItems(params),
    enabled: !!category,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};



// Single item hook
export const useTopItem = (
  itemId: string,
  options?: UseQueryOptions<TopItem, Error>
) => {
  return useQuery({
    queryKey: topItemsKeys.item(itemId),
    queryFn: () => topItemsApi.getItem(itemId),
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Trending items hook
export const useTrendingItems = (
  category?: string,
  limit: number = 20,
  options?: UseQueryOptions<TopItem[], Error>
) => {
  return useQuery({
    queryKey: topItemsKeys.trending(category, limit),
    queryFn: () => topItemsApi.getTrendingItems(category, limit),
    staleTime: 1 * 60 * 1000, // 1 minute (trending changes frequently)
    ...options,
  });
};

// Utility hook for transforming items into BacklogGroupType format
export const useBacklogGroups = (
  category: string,
  subcategory?: string,
  searchTerm?: string
) => {
  const { data: items, isLoading, error } = useCategoryItems(category, subcategory);

  const backlogGroups = React.useMemo(() => {
    if (!items) return [];

    // Filter by search term if provided
    const filteredItems = searchTerm
      ? items.filter(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : items;

    // Group items by their group field
    const grouped = filteredItems.reduce((acc, item) => {
      const groupName = item.group || 'General';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push({
        id: item.id,
        title: item.name,
        description: item.description,
        matched: false,
        tags: item.tags || [],
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Convert to BacklogGroupType format
    return Object.entries(grouped).map(([groupName, items], index) => ({
      id: `group-${groupName.toLowerCase().replace(/\s+/g, '-')}`,
      title: groupName,
      isOpen: index < 3, // Keep first 3 groups open by default
      items,
    }));
  }, [items, searchTerm]);

  return {
    backlogGroups,
    isLoading,
    error,
    totalItems: items?.length || 0,
  };
};