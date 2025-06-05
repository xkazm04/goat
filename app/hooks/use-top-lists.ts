import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from './use-toast';
import { topListsApi } from '@/app/lib/api/top-lists';
import { topListsKeys } from '@/app/lib/query-keys/top-lists';
import {
  TopList,
  ListWithItems,
  ListAnalytics,
  CreateListRequest,
  UpdateListRequest,
  CloneListRequest,
  SearchListsParams,
  VersionComparison,
  ListCreationResponse, // Import new type
} from '@/app/types/top-lists';

// Query Hooks
export const useTopLists = (
  params?: SearchListsParams,
  options?: UseQueryOptions<TopList[], Error>
) => {
  return useQuery({
    queryKey: topListsKeys.listSearch(params || {}),
    queryFn: () => topListsApi.getLists(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useTopList = (
  listId: string,
  includeItems: boolean = true,
  options?: UseQueryOptions<ListWithItems, Error>
) => {
  return useQuery({
    queryKey: topListsKeys.list(listId, includeItems),
    queryFn: () => topListsApi.getList(listId, includeItems),
    enabled: !!listId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useUserLists = (
  userId: string,
  params?: Omit<SearchListsParams, 'user_id'>,
  options?: UseQueryOptions<TopList[], Error>
) => {
  return useQuery({
    queryKey: topListsKeys.userLists(userId, params),
    queryFn: () => topListsApi.getUserLists(userId, params),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    ...options,
  });
};

export const usePredefinedLists = (
  category?: string,
  subcategory?: string,
  options?: UseQueryOptions<TopList[], Error>
) => {
  return useQuery({
    queryKey: topListsKeys.predefinedLists(category, subcategory),
    queryFn: () => topListsApi.getPredefinedLists(category, subcategory),
    staleTime: 10 * 60 * 1000, // 10 minutes (predefined lists change less frequently)
    ...options,
  });
};

export const useListAnalytics = (
  listId: string,
  options?: UseQueryOptions<ListAnalytics, Error>
) => {
  return useQuery({
    queryKey: topListsKeys.analytics(listId),
    queryFn: () => topListsApi.getListAnalytics(listId),
    enabled: !!listId,
    staleTime: 1 * 60 * 1000, // 1 minute (analytics change frequently)
    ...options,
  });
};

export const useVersionComparison = (
  listId: string,
  version1: number,
  version2: number,
  options?: UseQueryOptions<VersionComparison, Error>
) => {
  return useQuery({
    queryKey: topListsKeys.versions(listId, version1, version2),
    queryFn: () => topListsApi.compareVersions(listId, version1, version2),
    enabled: !!listId && version1 > 0 && version2 > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes (version comparisons don't change)
    ...options,
  });
};

// Mutation Hooks
export const useCreateListWithUser = (
  options?: UseMutationOptions<ListCreationResponse, Error, CreateListRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: topListsApi.createListWithUser,
    onSuccess: (data, variables) => {
      // Invalidate and refetch lists
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });
      
      // Invalidate user lists for the created user
      queryClient.invalidateQueries({ 
        queryKey: topListsKeys.userLists(data.user.id) 
      });

      // Pre-populate the cache with the new list data
      queryClient.setQueryData(
        topListsKeys.list(data.list.id, true),
        {
          ...data.list,
          items: [],
          total_items: 0
        }
      );

      // Show success toast
      toast({
        title: "List Created! 🎉",
        description: `"${data.list.title}" is ready for ranking!`,
      });

      // Log for debugging
      console.log('List created with user:', {
        listId: data.list.id,
        userId: data.user.id,
        isNewUser: data.is_new_user,
        isTemporaryUser: data.user.is_temporary
      });
    },
    onError: (error, variables) => {
      console.error('Failed to create list with user:', error);
      
      toast({
        title: "Creation Failed",
        description: `Failed to create list: ${error.message}`,
        variant: "destructive",
      });
    },
    ...options,
  });
};

export const useCreateList = (
  options?: UseMutationOptions<TopList, Error, CreateListRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: topListsApi.createList,
    onSuccess: (data, variables) => {
      // Invalidate and refetch lists
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });
      
      // If user_id is provided, invalidate user lists
      if (variables.user_id) {
        queryClient.invalidateQueries({ 
          queryKey: topListsKeys.userLists(variables.user_id) 
        });
      }

      toast({
        title: "Success",
        description: `List "${data.title}" created successfully!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create list: ${error.message}`,
        variant: "destructive",
      });
    },
    ...options,
  });
};

export const useUpdateList = (
  options?: UseMutationOptions<TopList, Error, { listId: string; data: UpdateListRequest }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }) => topListsApi.updateList(listId, data),
    onSuccess: (data, variables) => {
      // Update the specific list cache
      queryClient.setQueryData(
        topListsKeys.list(variables.listId),
        (old: ListWithItems | undefined) => {
          if (old) {
            return { ...old, ...data };
          }
          return old;
        }
      );

      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      toast({
        title: "Success",
        description: `List "${data.title}" updated successfully!`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update list: ${error.message}`,
        variant: "destructive",
      });
    },
    ...options,
  });
};

export const useDeleteList = (
  options?: UseMutationOptions<{ message: string }, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: topListsApi.deleteList,
    onSuccess: (data, listId) => {
      // Remove the specific list from cache
      queryClient.removeQueries({ queryKey: topListsKeys.list(listId) });
      
      // Invalidate all lists queries
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      toast({
        title: "Success",
        description: "List deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete list: ${error.message}`,
        variant: "destructive",
      });
    },
    ...options,
  });
};

export const useCloneList = (
  options?: UseMutationOptions<
    { message: string; new_list_id: string }, 
    Error, 
    { listId: string; userId: string; modifications: CloneListRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, userId, modifications }) => 
      topListsApi.cloneList(listId, userId, modifications),
    onSuccess: (data, variables) => {
      // Invalidate lists to show the new cloned list
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });
      
      // Invalidate user lists
      queryClient.invalidateQueries({ 
        queryKey: topListsKeys.userLists(variables.userId) 
      });

      toast({
        title: "Success",
        description: "List cloned successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to clone list: ${error.message}`,
        variant: "destructive",
      });
    },
    ...options,
  });
};

// Utility hooks for common patterns
export const useInvalidateListsCache = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: topListsKeys.all }),
    invalidateLists: () => queryClient.invalidateQueries({ queryKey: topListsKeys.lists() }),
    invalidateUserLists: (userId: string) => 
      queryClient.invalidateQueries({ queryKey: topListsKeys.userLists(userId) }),
    invalidateList: (listId: string) => 
      queryClient.invalidateQueries({ queryKey: topListsKeys.list(listId) }),
    invalidateCreation: () => 
      queryClient.invalidateQueries({ queryKey: topListsKeys.creation() }),
  };
};

// NEW: Specialized hook for list creation flow
export const useListCreationFlow = () => {
  const createListWithUser = useCreateListWithUser();
  const queryClient = useQueryClient();

  const createAndPrepareForMatching = async (
    listData: CreateListRequest,
    onSuccess?: (response: ListCreationResponse) => void
  ) => {
    try {
      const result = await createListWithUser.mutateAsync(listData);
      
      // Pre-load any additional data needed for matching
      // This could include fetching initial items, etc.
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      console.error('List creation flow failed:', error);
      throw error;
    }
  };

  return {
    createAndPrepareForMatching,
    isCreating: createListWithUser.isPending,
    error: createListWithUser.error,
    reset: createListWithUser.reset,
  };
};