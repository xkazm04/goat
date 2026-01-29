import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goatApi, GroupSearchParams, GroupCreateRequest } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { GridItemType as OriginalGridItemType, BacklogItemType as OriginalBacklogItemType, BacklogGroupType as OriginalBacklogGroupType } from '@/types/match';
import { BacklogGroup as ApiBacklogGroup, BacklogItem as ApiBacklogItem } from '@/types/backlog-groups';
import { CACHE_TTL_MS, GC_TIME_MS } from '@/lib/cache/unified-cache';

// Unified cache time constants - imported from unified-cache.ts
const CACHE_TIMES = {
  SHORT: CACHE_TTL_MS.SHORT,     // 1 minute - for user-specific/detailed data
  STANDARD: CACHE_TTL_MS.STANDARD, // 5 minutes - default cache duration
  LONG: CACHE_TTL_MS.LONG,       // 15 minutes - for reference data
} as const;

// Retry configuration
const RETRY_CONFIG = {
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

// Common query options type
interface BaseQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

// Helper to build common query config
const buildQueryConfig = (options?: BaseQueryOptions, defaultEnabled = true) => ({
  staleTime: options?.staleTime ?? CACHE_TIMES.STANDARD,
  refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  enabled: options?.enabled ?? defaultEnabled,
});

// Query key parameter types
interface CategoryParams {
  category: string;
  subcategory?: string;
  search?: string;
}

interface DetailParams {
  id: string;
  includeItems: boolean;
}

interface GroupItemsParams {
  groupId: string;
  limit?: number;
  offset?: number;
}

interface SuggestionParams {
  query: string;
  category?: string;
  subcategory?: string;
}

// Enriched types for store usage, combining API structure with UI state
export interface StoredBacklogItem extends ApiBacklogItem {
  // API fields: id, name, title, description, category, subcategory, item_year, image_url, created_at, tags
  matched?: boolean;      // UI state: is this item matched to a grid slot?
  matchedWith?: string; // UI state: ID of the grid slot it's matched with (e.g., 'grid-0')
}

export interface StoredBacklogGroup extends ApiBacklogGroup {
  // API fields: id, name, description, category, subcategory, image_url, item_count, created_at, updated_at
  items: StoredBacklogItem[]; // Items are now directly part of the group in the store
  isOpen?: boolean;           // UI state: is this group expanded in the UI?
}

// Use original GridItemType for grid display, it's mostly UI-specific
export type GridItem = OriginalGridItemType;

export interface ListSession {
  id: string; // session-listId
  listId: string; // original listId
  listSize: number;
  gridItems: GridItem[];
  backlogGroups: StoredBacklogGroup[]; // Use the new self-contained group type
  selectedBacklogItem: string | null;  // ID of StoredBacklogItem
  selectedGridItem: string | null;     // ID of GridItem
  // compareList can use StoredBacklogItem if comparison involves full item details
  compareList: StoredBacklogItem[]; 
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  // Store category/subcategory context for which these backlogGroups were loaded
  loadedContext?: {
    category: string;
    subcategory?: string;
  };
}

export interface SessionProgress {
  matchedCount: number;
  totalSize: number;
  percentage: number;
  isComplete: boolean;
}

export interface ComparisonState {
  isOpen: boolean;
  items: StoredBacklogItem[]; // Use StoredBacklogItem for comparison
  selectedForComparison: string[];
  comparisonMode: 'side-by-side' | 'grid' | 'list';
}

// Query Keys
export const itemGroupsKeys = {
  all: ['item-groups'] as const,
  lists: () => [...itemGroupsKeys.all, 'list'] as const,
  list: (filters: GroupSearchParams) => [...itemGroupsKeys.lists(), { filters }] as const,
  categories: () => [...itemGroupsKeys.all, 'categories'] as const,
  category: (category: string, subcategory?: string, search?: string) => {
    const params: CategoryParams = { category };
    if (subcategory) params.subcategory = subcategory;
    if (search && search.trim()) params.search = search.trim();
    return [...itemGroupsKeys.categories(), params] as const;
  },
  details: () => [...itemGroupsKeys.all, 'detail'] as const,
  detail: (id: string, includeItems: boolean = true): readonly [...readonly ['item-groups', 'detail'], DetailParams] =>
    [...itemGroupsKeys.details(), { id, includeItems }] as const,
  items: () => [...itemGroupsKeys.all, 'items'] as const,
  groupItems: (groupId: string, limit?: number, offset?: number): readonly [...readonly ['item-groups', 'items'], GroupItemsParams] =>
    [...itemGroupsKeys.items(), { groupId, limit, offset }] as const,
  suggestions: () => [...itemGroupsKeys.all, 'suggestions'] as const,
  suggestion: (query: string, category?: string, subcategory?: string) => {
    const params: SuggestionParams = { query: query.trim() };
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    return [...itemGroupsKeys.suggestions(), params] as const;
  },
};

// Hook to get item groups with search/filter
export function useItemGroups(params?: GroupSearchParams, options?: BaseQueryOptions) {
  return useQuery({
    queryKey: itemGroupsKeys.list(params || {}),
    queryFn: () => goatApi.groups.search(params),
    ...buildQueryConfig(options),
  });
}

// OPTIMIZED: Hook to get groups by category with better caching
export function useGroupsByCategory(
  category: string,
  subcategory?: string,
  search?: string,
  options?: BaseQueryOptions & {
    sortByItemCount?: boolean;
    minItemCount?: number;
  }
) {
  const cleanSearch = search && search.trim() ? search.trim() : undefined;
  const minItemCount = options?.minItemCount ?? 1;

  return useQuery({
    queryKey: itemGroupsKeys.category(category, subcategory, cleanSearch),
    queryFn: async () => {
      const groups = await goatApi.groups.getByCategory(
        category,
        {
          subcategory,
          search: cleanSearch,
          limit: 100, // Higher limit
          minItemCount, // Filter empty groups at API level
        }
      );

      if (options?.sortByItemCount !== false) {
        return groups.sort((a, b) => (b.item_count || 0) - (a.item_count || 0));
      }

      return groups;
    },
    ...buildQueryConfig(options),
    ...RETRY_CONFIG,
  });
}

// OPTIMIZED: Single group hook with better error handling
export function useItemGroup(groupId: string, options?: {
  enabled?: boolean;
  includeItems?: boolean;
}) {
  const includeItems = options?.includeItems ?? true;

  return useQuery({
    queryKey: itemGroupsKeys.detail(groupId, includeItems),
    queryFn: async () => {
      const group = await goatApi.groups.get(groupId, includeItems);
      return group;
    },
    enabled: options?.enabled ?? !!groupId,
    staleTime: CACHE_TIMES.SHORT,
    ...RETRY_CONFIG,
  });
}

// Hook to get items in a specific group - now can use single group endpoint instead
export function useGroupItems(
  groupId: string,
  limit: number = 150,
  offset: number = 0,
  options?: {
    enabled?: boolean;
    preferSingleEndpoint?: boolean; // Use single group endpoint instead of items endpoint
  }
) {
  const preferSingleEndpoint = options?.preferSingleEndpoint ?? true;
  
  return useQuery({
    queryKey: itemGroupsKeys.groupItems(groupId, limit, offset),
    queryFn: () => {
      if (preferSingleEndpoint && offset === 0) {
        return goatApi.groups.get(groupId, true).then(group => ({
          group_id: groupId,
          items: group.items.slice(0, limit),
          count: group.items.length
        }));
      } else {
        // Fallback to legacy items endpoint for pagination
        return goatApi.groups.getItems(groupId, { limit, offset });
      }
    },
    enabled: options?.enabled ?? !!groupId,
  });
}

// Mutation hook to create new group
export function useCreateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GroupCreateRequest) => goatApi.groups.create(data),
    onSuccess: (newGroup) => {
      toast({
        title: "Group Created",
        description: `"${newGroup.name}" has been created successfully.`,
      });

    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create group",
      });
    },
  });
}

// Future: Add sync operations here
export function useSyncBacklogData() {
  // TODO: Implement sync functionality later
  return {
    syncGroups: async () => console.log('Sync groups - to be implemented'),
    syncItems: async () => console.log('Sync items - to be implemented'),
  };
}