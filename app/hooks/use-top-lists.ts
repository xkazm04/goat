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
  };
};