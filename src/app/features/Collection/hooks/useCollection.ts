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
 * Replaces: useCollectionFilters, useCollectionStats, and ad-hoc fetch logic
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useState } from 'react';
import { collectionApi, CollectionApiParams, CollectionItemCreate, CollectionItemUpdate } from '@/lib/api/collection';
import { collectionKeys } from '@/lib/query-keys/collection';
import { CollectionItem, CollectionGroup, CollectionStats } from '../types';

export interface UseCollectionOptions {
  category?: string;
  subcategory?: string;
  initialSearchTerm?: string;
  initialSelectedGroupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity';
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
    sortBy: 'name' | 'date' | 'popularity';
    sortOrder: 'asc' | 'desc';
  };

  // Filter actions
  setSearchTerm: (term: string) => void;
  toggleGroup: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  setSortBy: (sortBy: 'name' | 'date' | 'popularity') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

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
    sortBy: initialSortBy = 'name',
    sortOrder: initialSortOrder = 'asc',
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

  // Fetch groups
  const {
    data: groupsData = [],
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

  // Initialize selected groups when groups load
  useMemo(() => {
    if (groupsData.length > 0 && selectedGroupIds.size === 0) {
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

  // Extract items from query results
  const allItems = useMemo(() => {
    if (enableInfiniteScroll && infiniteQuery.data) {
      return infiniteQuery.data.pages.flatMap(page => page.data);
    }
    return paginatedData?.data || [];
  }, [enableInfiniteScroll, infiniteQuery.data, paginatedData]);

  // Client-side filtering by selected groups
  const filteredItems = useMemo(() => {
    if (selectedGroupIds.size === 0) return [];

    return allItems.filter(item => {
      const itemGroup = item.metadata?.group;
      if (!itemGroup) return true; // Include items without group
      return selectedGroupIds.has(itemGroup);
    });
  }, [allItems, selectedGroupIds]);

  // Get selected groups
  const selectedGroups = useMemo(() => {
    return groupsData.filter(g => selectedGroupIds.has(g.id));
  }, [groupsData, selectedGroupIds]);

  // Calculate statistics
  const stats: CollectionStats = useMemo(() => {
    const totalItems = groupsData.reduce((sum, g) => sum + (g.items?.length || 0), 0);
    const selectedItems = selectedGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

    return {
      totalItems,
      selectedItems,
      visibleGroups: selectedGroups.length,
      totalGroups: groupsData.length
    };
  }, [groupsData, selectedGroups]);

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
