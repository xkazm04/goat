import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemGroupsApi, ItemGroupSearchParams, ItemGroupCreate } from '@/app/lib/api/item-groups';
import { toast } from '@/app/hooks/use-toast';

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

// Hook to get groups by category
export function useGroupsByCategory(
  category: string,
  subcategory?: string,
  search?: string,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  }
) {
  const cleanSearch = search && search.trim() ? search.trim() : undefined;
  
  return useQuery({
    queryKey: itemGroupsKeys.category(category, subcategory, cleanSearch),
    queryFn: () => itemGroupsApi.getGroupsByCategory(category, subcategory, cleanSearch),
    staleTime: options?.staleTime || 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    enabled: options?.enabled ?? true,
  });
}

// Hook to get single group details WITH ITEMS - This is the key fix!
export function useItemGroup(groupId: string, options?: {
  enabled?: boolean;
  includeItems?: boolean;
}) {
  const includeItems = options?.includeItems ?? true; // Default to true
  
  return useQuery({
    queryKey: itemGroupsKeys.detail(groupId, includeItems),
    queryFn: () => itemGroupsApi.getGroup(groupId, includeItems),
    enabled: options?.enabled ?? !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes for detailed group data
  });
}

// Hook to get items in a specific group - now can use single group endpoint instead
export function useGroupItems(
  groupId: string,
  limit: number = 50,
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
        // Use single group endpoint for better performance
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
      // Invalidate and refetch groups
      queryClient.invalidateQueries({ queryKey: itemGroupsKeys.all });
      
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

// Hook to prefetch group items using the single endpoint
export function usePrefetchGroupItems() {
  const queryClient = useQueryClient();

  return (groupId: string) => {
    queryClient.prefetchQuery({
      queryKey: itemGroupsKeys.detail(groupId, true),
      queryFn: () => itemGroupsApi.getGroup(groupId, true),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };
}