/**
 * Unified Collection Hook
 *
 * Single hook for managing collection data with:
 * - Server-side pagination
 * - Memoized caching via React Query
 * - Optimistic mutations (add/edit/delete)
 * - Filter and search capabilities
 * - Statistics computation
 *
 * Unified hook for collection data management
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { collectionApi, CollectionApiParams, CollectionItemCreate, CollectionItemUpdate } from '@/lib/api/collection';
import { collectionKeys } from '@/lib/query-keys/collection';
import { CollectionItem, CollectionGroup, CollectionStats } from '../types';
import { useVisibleCollectionItems, PlacementStats } from './useVisibleCollectionItems';
import { useEasterEggSpotlight } from '../utils/easterEgg';

// Curator milestone thresholds - gamification levels based on items ranked
// Level 1: Novice (10 items), Level 2: Apprentice (25 items), Level 3: Curator (50 items),
// Level 4: Expert (100 items), Level 5: Master (250 items)
const CURATOR_MILESTONES = [10, 25, 50, 100, 250];

/**
 * Calculate curator level and items to next level based on ranked items count
 */
function calculateCuratorLevel(rankedItemsCount: number): { curatorLevel: number; itemsToNextLevel: number } {
  let curatorLevel = 0;
  let itemsToNextLevel = CURATOR_MILESTONES[0];

  for (let i = 0; i < CURATOR_MILESTONES.length; i++) {
    if (rankedItemsCount >= CURATOR_MILESTONES[i]) {
      curatorLevel = i + 1;
      // Calculate items to next level (if not at max level)
      if (i < CURATOR_MILESTONES.length - 1) {
        itemsToNextLevel = CURATOR_MILESTONES[i + 1] - rankedItemsCount;
      } else {
        itemsToNextLevel = 0; // At max level
      }
    } else {
      // Haven't reached this milestone yet
      itemsToNextLevel = CURATOR_MILESTONES[i] - rankedItemsCount;
      break;
    }
  }

  return { curatorLevel, itemsToNextLevel };
}

export interface UseCollectionOptions {
  category?: string;
  subcategory?: string;
  initialSearchTerm?: string;
  initialSelectedGroupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  enablePagination?: boolean;
  enableInfiniteScroll?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export interface UseCollectionResult {
  // Data
  groups: CollectionGroup[];
  items: CollectionItem[];
  filteredItems: CollectionItem[];
  selectedGroups: CollectionGroup[];
  stats: CollectionStats;

  // Derived placement state (first-class relationship with Grid)
  placementStats: PlacementStats;
  /** Check if a specific item is placed in the grid */
  isItemPlaced: (itemId: string) => boolean;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;

  // Pagination
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextPage: () => void;
    prevPage: () => void;
    goToPage: (page: number) => void;
  };

  // Infinite scroll (alternative to pagination)
  infiniteScroll?: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };

  // Filter controls
  filter: {
    searchTerm: string;
    selectedGroupIds: Set<string>;
    sortBy: 'name' | 'date' | 'popularity' | 'ranking';
    sortOrder: 'asc' | 'desc';
  };

  // Filter actions
  setSearchTerm: (term: string) => void;
  toggleGroup: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  setSortBy: (sortBy: 'name' | 'date' | 'popularity' | 'ranking') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Easter egg state
  spotlightItemId: string | null;

  // Mutations
  mutations: {
    addItem: {
      mutate: (item: CollectionItemCreate) => void;
      isLoading: boolean;
      isError: boolean;
      error: Error | null;
    };
    updateItem: {
      mutate: (item: CollectionItemUpdate) => void;
      isLoading: boolean;
      isError: boolean;
      error: Error | null;
    };
    deleteItem: {
      mutate: (itemId: string) => void;
      isLoading: boolean;
      isError: boolean;
      error: Error | null;
    };
  };

  // Utility
  refetch: () => void;
  invalidateCache: () => void;
}

export function useCollection(options: UseCollectionOptions = {}): UseCollectionResult {
  const {
    category,
    subcategory,
    initialSearchTerm = '',
    initialSelectedGroupIds = [],
    sortBy: initialSortBy = 'ranking', // Default to ranking sort
    sortOrder: initialSortOrder = 'desc', // Descending (highest ranking first)
    pageSize = 50,
    enablePagination = false,
    enableInfiniteScroll = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000 // 10 minutes
  } = options;

  const queryClient = useQueryClient();

  // Local filter state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(initialSelectedGroupIds)
  );
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(1);

  // Track if we've initialized selected groups to prevent infinite loops
  const hasInitializedGroupsRef = useRef(false);

  // Fetch groups
  const {
    data: groupsDataRaw = [],
    isLoading: isLoadingGroups,
    isError: isErrorGroups,
    error: errorGroups,
    refetch: refetchGroups
  } = useQuery({
    queryKey: collectionKeys.groupsList({ category, subcategory }),
    queryFn: () => collectionApi.getGroups({ category, subcategory }),
    staleTime,
    gcTime: cacheTime
  });

  // Filter groups to exclude empty groups
  // Sort groups alphabetically by name (ascending)
  // Note: API returns groups with item_count, not items array
  const groupsData = useMemo(() => {
    console.log('📦 Raw groups from API:', groupsDataRaw.length);
    const filtered = groupsDataRaw
      .filter(group => (group.item_count || 0) > 0) // Hide groups with no items
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort groups by name (asc)
    console.log('📦 Filtered groups (with items):', filtered.length);
    return filtered;
  }, [groupsDataRaw]);

  // Initialize selected groups when groups load (only once)
  useEffect(() => {
    if (!hasInitializedGroupsRef.current && groupsData.length > 0 && selectedGroupIds.size === 0) {
      console.log('🔄 Initializing selected groups:', groupsData.length, 'groups');
      hasInitializedGroupsRef.current = true;
      setSelectedGroupIds(new Set(groupsData.map(g => g.id)));
    }
  }, [groupsData, selectedGroupIds.size]);

  // Build query params
  const queryParams: CollectionApiParams = useMemo(() => ({
    category,
    subcategory,
    searchTerm: searchTerm || undefined,
    sortBy,
    sortOrder,
    page: enablePagination ? currentPage : undefined,
    pageSize: enablePagination ? pageSize : undefined
  }), [category, subcategory, searchTerm, sortBy, sortOrder, currentPage, enablePagination, pageSize]);

  // Fetch items with pagination
  const {
    data: paginatedData,
    isLoading: isLoadingItems,
    isError: isErrorItems,
    error: errorItems,
    isFetching,
    refetch: refetchItems
  } = useQuery({
    queryKey: collectionKeys.itemsPaginated(queryParams),
    queryFn: () => collectionApi.getItemsPaginated(queryParams),
    enabled: !enableInfiniteScroll,
    staleTime,
    gcTime: cacheTime
  });

  // Infinite scroll query (alternative to pagination)
  const infiniteQuery = useInfiniteQuery({
    queryKey: collectionKeys.itemsInfinite(queryParams),
    queryFn: ({ pageParam = 0 }) =>
      collectionApi.getItemsPaginated({ ...queryParams, offset: pageParam, limit: pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: enableInfiniteScroll,
    staleTime,
    gcTime: cacheTime
  });

  // Extract raw items from query results (before placement filtering)
  const rawItems = useMemo(() => {
    let items: CollectionItem[] = [];
    if (enableInfiniteScroll && infiniteQuery.data) {
      items = infiniteQuery.data.pages.flatMap(page => page.data);
    } else {
      items = paginatedData?.data || [];
    }
    console.log('📊 Items from API:', items.length);
    if (items.length > 0) {
      console.log('📊 Sample item:', items[0]);
    }
    return items;
  }, [enableInfiniteScroll, infiniteQuery.data, paginatedData]);

  // Use the derived-state hook for Collection-Grid relationship
  // This makes the relationship first-class: VisibleItems = AllItems - GridPlacedItems
  const {
    visibleItems: allItems,
    placedItemIds,
    placementStats,
    isItemPlaced,
  } = useVisibleCollectionItems({
    items: rawItems,
    maxGridSize: pageSize, // Use page size as proxy for grid size
  });

  console.log('📊 Available items after placement filtering:', allItems.length, 'placed:', placementStats.placedCount);

  // Client-side filtering by selected groups and sorting
  const filteredItems = useMemo(() => {
    console.log('🔍 Filtering items - selectedGroupIds:', selectedGroupIds.size, 'allItems:', allItems.length);

    if (selectedGroupIds.size === 0) {
      console.log('⚠️  No groups selected, returning empty array');
      return [];
    }

    let items = allItems.filter(item => {
      const itemGroupId = item.metadata?.group_id;
      if (!itemGroupId) return true; // Include items without group
      return selectedGroupIds.has(itemGroupId);
    });

    console.log('✅ Filtered to', items.length, 'items');

    // Apply client-side sorting
    items = [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'ranking':
          const rankA = a.ranking ?? 0;
          const rankB = b.ranking ?? 0;
          comparison = rankB - rankA; // Higher rankings first by default
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          const dateA = a.metadata?.created_at ? new Date(a.metadata.created_at as string).getTime() : 0;
          const dateB = b.metadata?.created_at ? new Date(b.metadata.created_at as string).getTime() : 0;
          comparison = dateB - dateA;
          break;
        case 'popularity':
          const popA = a.metadata?.popularity ?? 0;
          const popB = b.metadata?.popularity ?? 0;
          comparison = popB - popA;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return items;
  }, [allItems, selectedGroupIds, sortBy, sortOrder]);

  // Get selected groups
  const selectedGroups = useMemo(() => {
    return groupsData.filter(g => selectedGroupIds.has(g.id));
  }, [groupsData, selectedGroupIds]);

  // Easter egg spotlight effect - highlights random item when magic keywords are searched
  const { spotlightItemId } = useEasterEggSpotlight(searchTerm, filteredItems);

  // Calculate statistics with first-class placement state
  const stats: CollectionStats = useMemo(() => {
    const totalItems = groupsData.reduce((sum, g) => sum + (g.item_count || 0), 0);
    const selectedItems = selectedGroups.reduce((sum, g) => sum + (g.item_count || 0), 0);

    // Calculate average ranking from filtered items
    const rankedItems = filteredItems.filter(item => item.ranking !== undefined && item.ranking > 0);
    const averageRanking = rankedItems.length > 0
      ? rankedItems.reduce((sum, item) => sum + (item.ranking || 0), 0) / rankedItems.length
      : undefined;

    // Derive placement state from the dedicated hook
    const hiddenInGridCount = placementStats.placedCount;

    // Calculate curator level based on placed items (gamification)
    const { curatorLevel, itemsToNextLevel } = calculateCuratorLevel(placementStats.placedCount);

    return {
      totalItems,
      selectedItems,
      visibleGroups: selectedGroups.length,
      totalGroups: groupsData.length,
      averageRanking,
      rankedItems: rankedItems.length,
      curatorLevel,
      itemsToNextLevel,
      hiddenInGridCount,
      // First-class derived placement state
      placedCount: placementStats.placedCount,
      remainingToRank: placementStats.remainingCount,
      completionPercentage: placementStats.completionPercentage,
    };
  }, [groupsData, selectedGroups, filteredItems, placementStats]);

  // Filter actions
  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const selectAllGroups = useCallback(() => {
    setSelectedGroupIds(new Set(groupsData.map(g => g.id)));
  }, [groupsData]);

  const deselectAllGroups = useCallback(() => {
    setSelectedGroupIds(new Set());
  }, []);

  // Pagination controls
  const nextPage = useCallback(() => {
    if (paginatedData?.hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [paginatedData?.hasMore]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const goToPage = useCallback((page: number) => {
    if (paginatedData) {
      setCurrentPage(Math.max(1, Math.min(page, paginatedData.totalPages)));
    }
  }, [paginatedData]);

  // Optimistic mutation: Add item
  const addItemMutation = useMutation({
    mutationFn: (item: CollectionItemCreate) => collectionApi.createItem(item),
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: collectionKeys.groups() });
      await queryClient.cancelQueries({ queryKey: collectionKeys.items() });

      // Snapshot previous values
      const previousGroups = queryClient.getQueryData(collectionKeys.groupsList({ category, subcategory }));

      // Optimistically update cache
      const optimisticItem: CollectionItem = {
        id: `temp-${Date.now()}`,
        title: newItem.title,
        image_url: newItem.image_url,
        description: newItem.description,
        category: newItem.category,
        subcategory: newItem.subcategory,
        tags: newItem.tags,
        metadata: newItem.metadata
      };

      queryClient.setQueryData(
        collectionKeys.itemsPaginated(queryParams),
        (old: any) => old ? { ...old, data: [optimisticItem, ...old.data] } : old
      );

      return { previousGroups };
    },
    onError: (err, newItem, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(
          collectionKeys.groupsList({ category, subcategory }),
          context.previousGroups
        );
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: collectionKeys.groups() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.items() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.stats() });
    }
  });

  // Optimistic mutation: Update item
  const updateItemMutation = useMutation({
    mutationFn: (item: CollectionItemUpdate) => collectionApi.updateItem(item),
    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey: collectionKeys.items() });

      const previousData = queryClient.getQueryData(collectionKeys.itemsPaginated(queryParams));

      // Optimistically update
      queryClient.setQueryData(
        collectionKeys.itemsPaginated(queryParams),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item: CollectionItem) =>
              item.id === updatedItem.id ? { ...item, ...updatedItem } : item
            )
          };
        }
      );

      return { previousData };
    },
    onError: (err, updatedItem, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(collectionKeys.itemsPaginated(queryParams), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.items() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.groups() });
    }
  });

  // Optimistic mutation: Delete item
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => collectionApi.deleteItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: collectionKeys.items() });

      const previousData = queryClient.getQueryData(collectionKeys.itemsPaginated(queryParams));

      // Optimistically remove item
      queryClient.setQueryData(
        collectionKeys.itemsPaginated(queryParams),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((item: CollectionItem) => item.id !== itemId)
          };
        }
      );

      return { previousData };
    },
    onError: (err, itemId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(collectionKeys.itemsPaginated(queryParams), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.items() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.groups() });
      queryClient.invalidateQueries({ queryKey: collectionKeys.stats() });
    }
  });

  // Global refetch
  const refetch = useCallback(() => {
    refetchGroups();
    refetchItems();
  }, [refetchGroups, refetchItems]);

  // Invalidate all collection cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: collectionKeys.all });
  }, [queryClient]);

  return {
    // Data
    groups: groupsData,
    items: allItems,
    filteredItems,
    selectedGroups,
    stats,

    // Derived placement state (first-class relationship with Grid)
    placementStats,
    isItemPlaced,

    // Loading states
    isLoading: isLoadingGroups || isLoadingItems || (enableInfiniteScroll && infiniteQuery.isLoading),
    isError: isErrorGroups || isErrorItems || (enableInfiniteScroll && infiniteQuery.isError),
    error: (errorGroups || errorItems || (enableInfiniteScroll && infiniteQuery.error)) as Error | null,
    isFetching: isFetching || (enableInfiniteScroll && infiniteQuery.isFetching),

    // Pagination
    pagination: {
      page: currentPage,
      pageSize,
      total: paginatedData?.total || 0,
      totalPages: paginatedData?.totalPages || 0,
      hasMore: paginatedData?.hasMore || false,
      nextPage,
      prevPage,
      goToPage
    },

    // Infinite scroll
    infiniteScroll: enableInfiniteScroll ? {
      hasNextPage: infiniteQuery.hasNextPage || false,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      fetchNextPage: infiniteQuery.fetchNextPage
    } : undefined,

    // Filter
    filter: {
      searchTerm,
      selectedGroupIds,
      sortBy,
      sortOrder
    },

    // Filter actions
    setSearchTerm,
    toggleGroup,
    selectAllGroups,
    deselectAllGroups,
    setSortBy,
    setSortOrder,

    // Easter egg state
    spotlightItemId,

    // Mutations
    mutations: {
      addItem: {
        mutate: addItemMutation.mutate,
        isLoading: addItemMutation.isPending,
        isError: addItemMutation.isError,
        error: addItemMutation.error
      },
      updateItem: {
        mutate: updateItemMutation.mutate,
        isLoading: updateItemMutation.isPending,
        isError: updateItemMutation.isError,
        error: updateItemMutation.error
      },
      deleteItem: {
        mutate: deleteItemMutation.mutate,
        isLoading: deleteItemMutation.isPending,
        isError: deleteItemMutation.isError,
        error: deleteItemMutation.error
      }
    },

    // Utility
    refetch,
    invalidateCache
  };
}
