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
};

// Main hook to get item groups 
export function useItemGroups(
  category?: string,
  subcategory?: string, 
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  }
) {
  // Build proper search params object
  const searchParams: ItemGroupSearchParams = {};
  
  if (category) {
    searchParams.category = category;
  }
  
  if (subcategory) {
    searchParams.subcategory = subcategory;
  }

  return useQuery({
    queryKey: itemGroupsKeys.list(searchParams),
    queryFn: () => itemGroupsApi.getItemGroups(searchParams),
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