import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from './use-toast';
import { goatApi } from '@/lib/api';
import { topListsKeys } from '@/lib/query-keys/top-lists';
import { cacheInvalidation } from '@/lib/cache';
import {
  TopList,
  ListWithItems,
  ListAnalytics,
  CreateListRequest,
  UpdateListRequest,
  CloneListRequest,
  SearchListsParams,
  VersionComparison,
  ListCreationResponse,
  FeaturedListsResponse,
} from '@/types/top-lists';
import { FeaturedListsParams } from '@/lib/query-keys/top-lists';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';

// Unified cache times - imported from unified-cache.ts for consistency
const CACHE_TIMES = {
  SHORT: CACHE_TTL_MS.EPHEMERAL,   // 30 seconds - for real-time/analytics data
  MEDIUM: CACHE_TTL_MS.SHORT,      // 1 minute - for user-specific data
  DEFAULT: CACHE_TTL_MS.STANDARD,  // 5 minutes - default
  STANDARD: CACHE_TTL_MS.STANDARD, // 5 minutes - standard cache
  LONG: CACHE_TTL_MS.LONG,         // 15 minutes - for reference data
  VERY_LONG: CACHE_TTL_MS.STATIC,  // 1 hour - for static data
} as const;

// Helper for success toasts
const showSuccessToast = (title: string, description: string) => {
  toast({ title, description });
};

// Helper for error toasts
const showErrorToast = (action: string, error: Error) => {
  toast({
    title: "Error",
    description: `Failed to ${action}: ${error.message}`,
  });
};

// Query Hooks
export const useTopLists = (
  params?: SearchListsParams,
  options?: Omit<UseQueryOptions<TopList[], Error, TopList[], readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.listSearch(params || {}),
    queryFn: () => goatApi.lists.search(params),
    staleTime: CACHE_TIMES.STANDARD,
    ...options,
  });
};

export const useTopList = (
  listId: string,
  includeItems: boolean = true,
  options?: Omit<UseQueryOptions<ListWithItems, Error, ListWithItems, readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.list(listId, includeItems),
    queryFn: () => goatApi.lists.get(listId, includeItems),
    enabled: !!listId,
    staleTime: CACHE_TIMES.MEDIUM,
    ...options,
  });
};

export const useUserLists = (
  userId: string,
  params?: Omit<SearchListsParams, 'user_id'>,
  options?: Omit<UseQueryOptions<TopList[], Error, TopList[], readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.userLists(userId, params),
    queryFn: () => goatApi.lists.getByUser(userId, params),
    enabled: !!userId,
    staleTime: CACHE_TIMES.DEFAULT,
    ...options,
  });
};

export const usePredefinedLists = (
  category?: string,
  subcategory?: string,
  options?: Omit<UseQueryOptions<TopList[], Error, TopList[], readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.predefinedLists(category, subcategory),
    queryFn: () => goatApi.lists.getPredefined(category, subcategory),
    staleTime: CACHE_TIMES.LONG,
    ...options,
  });
};

export const useListAnalytics = (
  listId: string,
  options?: Omit<UseQueryOptions<ListAnalytics, Error, ListAnalytics, readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.analytics(listId),
    queryFn: () => goatApi.lists.getAnalytics(listId),
    enabled: !!listId,
    staleTime: CACHE_TIMES.SHORT,
    ...options,
  });
};

export const useVersionComparison = (
  listId: string,
  version1: number,
  version2: number,
  options?: Omit<UseQueryOptions<VersionComparison, Error, VersionComparison, readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.versions(listId, version1, version2),
    queryFn: () => goatApi.lists.compareVersions(listId, version1, version2),
    enabled: !!listId && version1 > 0 && version2 > 0,
    staleTime: CACHE_TIMES.VERY_LONG,
    ...options,
  });
};

// Featured lists hook - consolidated endpoint for popular, trending, latest, and awards
export const useFeaturedLists = (
  params?: FeaturedListsParams,
  options?: Omit<UseQueryOptions<FeaturedListsResponse, Error, FeaturedListsResponse, readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.featured(params),
    queryFn: () => goatApi.lists.getFeatured(params),
    staleTime: CACHE_TIMES.STANDARD,
    ...options,
  });
};

// Mutation Hooks
export const useCreateListWithUser = (
  options?: UseMutationOptions<ListCreationResponse, Error, CreateListRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: goatApi.lists.createWithUser,
    onSuccess: (data, variables) => {
      // Invalidate and refetch lists
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      // Invalidate user lists for the created user
      queryClient.invalidateQueries({
        queryKey: topListsKeys.userLists(data.user.id)
      });

      // Also invalidate the API cache layer
      cacheInvalidation.onListCreated(data.list.id);

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
      });
    },
    onError: (error, variables) => {
      console.error('Failed to create list with user:', error);

      toast({
        title: "Creation Failed",
        description: `Failed to create list: ${error.message}`,
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
    mutationFn: goatApi.lists.create,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      if (variables.user_id) {
        queryClient.invalidateQueries({
          queryKey: topListsKeys.userLists(variables.user_id)
        });
      }

      showSuccessToast("Success", `List "${data.title}" created successfully!`);
    },
    onError: (error) => showErrorToast("create list", error),
    ...options,
  });
};

export const useUpdateList = (
  options?: UseMutationOptions<TopList, Error, { listId: string; data: UpdateListRequest }>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, data }) => goatApi.lists.update(listId, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        topListsKeys.list(variables.listId),
        (old: ListWithItems | undefined) => old ? { ...old, ...data } : old
      );
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      // Invalidate API cache layer
      cacheInvalidation.onListUpdated(variables.listId);

      showSuccessToast("Success", `List "${data.title}" updated successfully!`);
    },
    onError: (error) => showErrorToast("update list", error),
    ...options,
  });
};

export const useDeleteList = (
  options?: UseMutationOptions<{ message: string }, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: goatApi.lists.delete,
    onSuccess: (_, listId) => {
      queryClient.removeQueries({ queryKey: topListsKeys.list(listId) });
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });

      // Invalidate API cache layer
      cacheInvalidation.onListDeleted(listId);

      showSuccessToast("Success", "List deleted successfully!");
    },
    onError: (error) => showErrorToast("delete list", error),
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
      goatApi.lists.clone(listId, userId, modifications),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: topListsKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: topListsKeys.userLists(variables.userId)
      });
      showSuccessToast("Success", "List cloned successfully!");
    },
    onError: (error) => showErrorToast("clone list", error),
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