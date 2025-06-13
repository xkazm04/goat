import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemGroupsApi, ItemGroupSearchParams, ItemGroupCreate } from '@/app/lib/api/item-groups';
import { toast } from '@/app/hooks/use-toast';
import { GridItemType as OriginalGridItemType, BacklogItemType as OriginalBacklogItemType, BacklogGroupType as OriginalBacklogGroupType } from '@/app/types/match';
import { BacklogGroup as ApiBacklogGroup, BacklogItem as ApiBacklogItem } from '@/app/types/backlog-groups';

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
  list: (filters: ItemGroupSearchParams) => [...itemGroupsKeys.lists(), { filters }] as const,
  categories: () => [...itemGroupsKeys.all, 'categories'] as const,
  category: (category: string, subcategory?: string, search?: string) => {
    const params: any = { category };
    if (subcategory) params.subcategory = subcategory;
    if (search && search.trim()) params.search = search.trim();
    return [...itemGroupsKeys.categories(), params] as const;
  },
  details: () => [...itemGroupsKeys.all, 'detail'] as const,
  detail: (id: string, includeItems: boolean = true) => [...itemGroupsKeys.details(), { id, includeItems }] as const,
  items: () => [...itemGroupsKeys.all, 'items'] as const,
  groupItems: (groupId: string, limit?: number, offset?: number) => 
    [...itemGroupsKeys.items(), { groupId, limit, offset }] as const,
  suggestions: () => [...itemGroupsKeys.all, 'suggestions'] as const,
  suggestion: (query: string, category?: string, subcategory?: string) => {
    const params: any = { query: query.trim() };
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    return [...itemGroupsKeys.suggestions(), params] as const;
  },
};

// Hook to get item groups with search/filter
export function useItemGroups(params?: ItemGroupSearchParams, options?: {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: itemGroupsKeys.list(params || {}),
    queryFn: () => itemGroupsApi.getItemGroups(params),
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  });
}

// OPTIMIZED: Hook to get groups by category with better caching
export function useGroupsByCategory(
  category: string,
  subcategory?: string,
  search?: string,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    sortByItemCount?: boolean;
    minItemCount?: number;
  }
) {
  const cleanSearch = search && search.trim() ? search.trim() : undefined;
  const minItemCount = options?.minItemCount ?? 1;
  
  return useQuery({
    queryKey: itemGroupsKeys.category(category, subcategory, cleanSearch),
    queryFn: async () => {
      console.log(`🔄 API: Fetching groups for ${category}/${subcategory || 'none'}`);
      const startTime = Date.now();
      
      const groups = await itemGroupsApi.getGroupsByCategory(
        category, 
        subcategory, 
        cleanSearch,
        100, // Higher limit
        minItemCount // Filter empty groups at API level
      );
      
      const endTime = Date.now();
      console.log(`✅ API: Fetched ${groups.length} groups in ${endTime - startTime}ms`);
      
      if (options?.sortByItemCount !== false) {
        return groups.sort((a, b) => (b.item_count || 0) - (a.item_count || 0));
      }
      
      return groups;
    },
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes - longer cache
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
    // CRITICAL: Add retry configuration to avoid hanging
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      console.log(`🔄 API: Fetching group ${groupId} with items=${includeItems}`);
      const startTime = Date.now();
      
      const group = await itemGroupsApi.getGroup(groupId, includeItems);
      
      const endTime = Date.now();
      console.log(`✅ API: Fetched group ${groupId} with ${group.items?.length || 0} items in ${endTime - startTime}ms`);
      
      return group;
    },
    enabled: options?.enabled ?? !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes for detailed group data
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
        return itemGroupsApi.getGroup(groupId, true).then(group => ({
          group_id: groupId,
          items: group.items.slice(0, limit),
          count: group.items.length
        }));
      } else {
        // Fallback to legacy items endpoint for pagination
        return itemGroupsApi.getGroupItems(groupId, limit, offset);
      }
    },
    enabled: options?.enabled ?? !!groupId,
  });
}

// Mutation hook to create new group
export function useCreateItemGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ItemGroupCreate) => itemGroupsApi.createGroup(data),
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
        variant: "destructive",
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