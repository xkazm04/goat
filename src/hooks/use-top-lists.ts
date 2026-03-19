import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from './use-toast';
import { useOptimisticMutation } from './useOptimisticMutation';
import { goatApi } from '@/lib/api';
import { topListsKeys } from '@/lib/query-keys/top-lists';
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
  CreatorAnalyticsSummary,
} from '@/types/top-lists';
import { FeaturedListsParams } from '@/lib/query-keys/top-lists';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';
import { CACHE_TAGS } from '@/lib/cache/unified-cache';

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

export const useCreatorAnalytics = (
  userId: string,
  options?: Omit<UseQueryOptions<CreatorAnalyticsSummary, Error, CreatorAnalyticsSummary, readonly unknown[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: topListsKeys.creatorAnalytics(userId),
    queryFn: () => goatApi.lists.getCreatorAnalytics(userId),
    enabled: !!userId,
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
    mutationFn: (data: CreateListRequest) => goatApi.lists.createWithUser(data),
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
    },
    onError: (error) => {
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
    mutationFn: (data: CreateListRequest) => goatApi.lists.create(data),
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

export const useUpdateList = () => {
  return useOptimisticMutation<TopList, { listId: string; data: UpdateListRequest }>({
    mutationFn: ({ listId, data }) => goatApi.lists.update(listId, data),
    optimisticUpdates: (variables) => [
      {
        queryKey: topListsKeys.list(variables.listId),
        updater: (current: ListWithItems | undefined) =>
          current ? { ...current, ...variables.data } : current as unknown as ListWithItems,
      },
    ],
    invalidateOnSettled: [topListsKeys.lists()],
    invalidateTags: [CACHE_TAGS.LISTS, CACHE_TAGS.USER_LISTS],
    onSuccess: (data) => {
      showSuccessToast("Success", `List "${data.title}" updated successfully!`);
    },
    notificationSource: 'list-update',
  });
};

export const useDeleteList = () => {
  const queryClient = useQueryClient();

  return useOptimisticMutation<{ message: string }, string>({
    mutationFn: (listId: string) => goatApi.lists.delete(listId),
    optimisticUpdates: (listId) => [
      {
        // Optimistically remove from user lists cache
        queryKey: topListsKeys.lists(),
        updater: (current: TopList[] | undefined) =>
          current ? current.filter((l) => l.id !== listId) : [],
      },
    ],
    onSuccess: (_, listId) => {
      // Fully remove the individual list from cache
      queryClient.removeQueries({ queryKey: topListsKeys.list(listId) });
      showSuccessToast("Success", "List deleted successfully!");
    },
    invalidateOnSettled: [topListsKeys.lists()],
    invalidateTags: [CACHE_TAGS.LISTS, CACHE_TAGS.USER_LISTS, CACHE_TAGS.FEATURED],
    notificationSource: 'list-delete',
  });
};

export const useCloneList = () => {
  return useOptimisticMutation<
    { message: string; new_list_id: string },
    { listId: string; userId: string; modifications: CloneListRequest }
  >({
    mutationFn: ({ listId, userId, modifications }) =>
      goatApi.lists.clone(listId, userId, modifications),
    optimisticUpdates: [],
    invalidateOnSettled: [topListsKeys.lists()],
    invalidateTags: [CACHE_TAGS.LISTS, CACHE_TAGS.USER_LISTS],
    onSuccess: () => {
      showSuccessToast("Success", "List cloned successfully!");
    },
    notificationSource: 'list-clone',
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