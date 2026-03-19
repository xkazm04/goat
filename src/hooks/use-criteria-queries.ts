/**
 * Criteria TanStack Query Hooks
 *
 * Type-safe hooks for criteria operations with TanStack Query integration.
 * Provides caching, optimistic updates, and automatic retries.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';

import {
  fetchListCriteria,
  saveListCriteria,
  fetchListItemScores,
  fetchItemScores,
  saveItemScores,
  batchSaveItemScores,
} from '@/lib/api/criteria';
import { CACHE_TTL_MS, GC_TIME_MS, getRetryConfig } from '@/lib/cache/unified-cache';
import { emitErrorNotification } from '@/lib/errors/error-notification-store';
import { criteriaKeys } from '@/lib/query-keys/criteria';

import type {
  ListCriteriaConfig,
  ListItemCriteriaScores,
  CriterionScore,
  ItemCriteriaScores,
} from '@/lib/criteria/types';

// =============================================================================
// Types
// =============================================================================

/** Response type for criteria config query */
interface CriteriaConfigResponse {
  listId: string;
  criteriaConfig: ListCriteriaConfig | null;
}

/** Response type for list item scores query */
interface ListItemScoresResponse {
  items: Array<{
    id: string;
    itemId: string;
    criteriaScores: ListItemCriteriaScores | null;
  }>;
}

/** Response type for single item scores query */
interface ItemScoresResponse {
  listItemId: string;
  criteriaScores: ListItemCriteriaScores | null;
}

/** Input for saving item scores */
interface SaveItemScoresInput {
  listId: string;
  itemId: string;
  scores: CriterionScore[];
  profileId: string;
  justification?: string;
}

/** Input for saving criteria config */
interface SaveCriteriaConfigInput {
  listId: string;
  criteriaConfig: ListCriteriaConfig | null;
}

/** Input for batch saving scores */
interface BatchSaveScoresInput {
  listId: string;
  items: Array<{
    itemId: string;
    criteriaScores: ListItemCriteriaScores;
  }>;
}

/** Optimistic update context for score mutations */
interface ScoreOptimisticContext {
  previousScores: ListItemScoresResponse | undefined;
  previousItemScore: ItemScoresResponse | undefined;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const CRITERIA_CACHE = {
  config: {
    staleTime: CACHE_TTL_MS.STANDARD, // 5 minutes
    gcTime: GC_TIME_MS.STANDARD,
  },
  scores: {
    staleTime: CACHE_TTL_MS.SHORT, // 1 minute - scores change more frequently
    gcTime: GC_TIME_MS.SHORT,
  },
  itemScore: {
    staleTime: CACHE_TTL_MS.SHORT,
    gcTime: GC_TIME_MS.SHORT,
  },
} as const;

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch criteria configuration for a list
 */
export function useCriteriaConfig(
  listId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<CriteriaConfigResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: criteriaKeys.configByList(listId ?? ''),
    queryFn: () => fetchListCriteria(listId!),
    enabled: !!listId,
    staleTime: CRITERIA_CACHE.config.staleTime,
    gcTime: CRITERIA_CACHE.config.gcTime,
    ...getRetryConfig('fast'),
    ...options,
  });
}

/**
 * Hook to fetch all item scores for a list
 */
export function useListItemScores(
  listId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ListItemScoresResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: criteriaKeys.scoresByList(listId ?? ''),
    queryFn: () => fetchListItemScores(listId!),
    enabled: !!listId,
    staleTime: CRITERIA_CACHE.scores.staleTime,
    gcTime: CRITERIA_CACHE.scores.gcTime,
    ...getRetryConfig('fast'),
    ...options,
  });
}

/**
 * Hook to fetch scores for a specific item
 */
export function useItemScores(
  listId: string | null | undefined,
  itemId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ItemScoresResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: criteriaKeys.scoresByItem(listId ?? '', itemId ?? ''),
    queryFn: () => fetchItemScores(listId!, itemId!),
    enabled: !!listId && !!itemId,
    staleTime: CRITERIA_CACHE.itemScore.staleTime,
    gcTime: CRITERIA_CACHE.itemScore.gcTime,
    ...getRetryConfig('fast'),
    ...options,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to save criteria configuration for a list
 */
export function useSaveCriteriaConfig(
  options?: Omit<
    UseMutationOptions<CriteriaConfigResponse, Error, SaveCriteriaConfigInput>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, criteriaConfig }: SaveCriteriaConfigInput) =>
      saveListCriteria(listId, criteriaConfig),
    onSuccess: (data, variables) => {
      // Update cache with new config
      queryClient.setQueryData(
        criteriaKeys.configByList(variables.listId),
        data
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.config(),
      });
    },
    ...getRetryConfig('fast'),
    ...options,
  });
}

/**
 * Hook to save scores for a single item with optimistic updates
 */
export function useSaveItemScores(
  options?: Omit<
    UseMutationOptions<
      { listItemId: string; criteriaScores: ListItemCriteriaScores },
      Error,
      SaveItemScoresInput,
      ScoreOptimisticContext
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      scores,
      profileId,
      justification,
    }: SaveItemScoresInput) =>
      saveItemScores(listId, itemId, scores, profileId, justification),

    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: criteriaKeys.scoresByList(variables.listId),
      });
      await queryClient.cancelQueries({
        queryKey: criteriaKeys.scoresByItem(variables.listId, variables.itemId),
      });

      // Snapshot current values
      const previousScores = queryClient.getQueryData<ListItemScoresResponse>(
        criteriaKeys.scoresByList(variables.listId)
      );
      const previousItemScore = queryClient.getQueryData<ItemScoresResponse>(
        criteriaKeys.scoresByItem(variables.listId, variables.itemId)
      );

      // Calculate optimistic weighted score
      const optimisticWeightedScore = calculateOptimisticWeightedScore(
        variables.scores
      );

      // Optimistically update item score
      const optimisticItemScores: ListItemCriteriaScores = {
        profileId: variables.profileId,
        scores: variables.scores,
        weightedScore: optimisticWeightedScore,
        justification: variables.justification,
        scoredAt: new Date().toISOString(),
      };

      // Update individual item scores cache
      queryClient.setQueryData<ItemScoresResponse>(
        criteriaKeys.scoresByItem(variables.listId, variables.itemId),
        {
          listItemId: variables.itemId,
          criteriaScores: optimisticItemScores,
        }
      );

      // Update list scores cache
      if (previousScores) {
        queryClient.setQueryData<ListItemScoresResponse>(
          criteriaKeys.scoresByList(variables.listId),
          {
            items: previousScores.items.map((item) =>
              item.itemId === variables.itemId
                ? { ...item, criteriaScores: optimisticItemScores }
                : item
            ),
          }
        );
      }

      return { previousScores, previousItemScore };
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousScores) {
        queryClient.setQueryData(
          criteriaKeys.scoresByList(variables.listId),
          context.previousScores
        );
      }
      if (context?.previousItemScore) {
        queryClient.setQueryData(
          criteriaKeys.scoresByItem(variables.listId, variables.itemId),
          context.previousItemScore
        );
      }

      // Show error notification on rollback
      emitErrorNotification(error, { source: 'criteria-score-save' });
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.scoresByItem(variables.listId, variables.itemId),
      });
    },

    ...getRetryConfig('fast'),
    ...options,
  });
}

/**
 * Hook to batch save scores for multiple items
 */
/** Optimistic update context for batch mutations */
interface BatchOptimisticContext {
  previousScores: ListItemScoresResponse | undefined;
}

export function useBatchSaveItemScores(
  options?: Omit<
    UseMutationOptions<
      { updated: number },
      Error,
      BatchSaveScoresInput,
      BatchOptimisticContext
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, items }: BatchSaveScoresInput) =>
      batchSaveItemScores(listId, items),

    onMutate: async (variables): Promise<BatchOptimisticContext> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: criteriaKeys.scoresByList(variables.listId),
      });

      // Snapshot current values
      const previousScores = queryClient.getQueryData<ListItemScoresResponse>(
        criteriaKeys.scoresByList(variables.listId)
      );

      // Optimistically update list scores
      if (previousScores) {
        const itemMap = new Map(
          variables.items.map((item) => [item.itemId, item.criteriaScores])
        );

        queryClient.setQueryData<ListItemScoresResponse>(
          criteriaKeys.scoresByList(variables.listId),
          {
            items: previousScores.items.map((item) => {
              const newScores = itemMap.get(item.itemId);
              return newScores ? { ...item, criteriaScores: newScores } : item;
            }),
          }
        );
      }

      return { previousScores };
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousScores) {
        queryClient.setQueryData(
          criteriaKeys.scoresByList(variables.listId),
          context.previousScores
        );
      }

      // Show error notification on rollback
      emitErrorNotification(error, { source: 'criteria-batch-save' });
    },

    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.scoresByList(variables.listId),
      });
    },

    ...getRetryConfig('batch'),
    ...options,
  });
}

// =============================================================================
// Cache Invalidation Utilities
// =============================================================================

/**
 * Hook providing cache invalidation utilities for criteria data
 */
export function useCriteriaCache() {
  const queryClient = useQueryClient();

  return {
    /** Invalidate all criteria queries */
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: criteriaKeys.all }),

    /** Invalidate criteria config for a specific list */
    invalidateConfig: (listId: string) =>
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.configByList(listId),
      }),

    /** Invalidate all scores for a specific list */
    invalidateListScores: (listId: string) =>
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.scoresByList(listId),
      }),

    /** Invalidate scores for a specific item */
    invalidateItemScores: (listId: string, itemId: string) =>
      queryClient.invalidateQueries({
        queryKey: criteriaKeys.scoresByItem(listId, itemId),
      }),

    /** Prefetch criteria config for a list */
    prefetchConfig: (listId: string) =>
      queryClient.prefetchQuery({
        queryKey: criteriaKeys.configByList(listId),
        queryFn: () => fetchListCriteria(listId),
        staleTime: CRITERIA_CACHE.config.staleTime,
      }),

    /** Prefetch all scores for a list */
    prefetchListScores: (listId: string) =>
      queryClient.prefetchQuery({
        queryKey: criteriaKeys.scoresByList(listId),
        queryFn: () => fetchListItemScores(listId),
        staleTime: CRITERIA_CACHE.scores.staleTime,
      }),

    /** Set criteria config in cache (useful for SSR or optimistic updates) */
    setConfig: (listId: string, config: CriteriaConfigResponse) =>
      queryClient.setQueryData(criteriaKeys.configByList(listId), config),

    /** Get cached criteria config */
    getConfig: (listId: string) =>
      queryClient.getQueryData<CriteriaConfigResponse>(
        criteriaKeys.configByList(listId)
      ),

    /** Get cached item scores */
    getItemScores: (listId: string, itemId: string) =>
      queryClient.getQueryData<ItemScoresResponse>(
        criteriaKeys.scoresByItem(listId, itemId)
      ),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate optimistic weighted score from criterion scores
 * This is a simplified calculation - the real one considers criterion weights
 */
function calculateOptimisticWeightedScore(scores: CriterionScore[]): number {
  if (scores.length === 0) return 0;

  // Simple average for optimistic update - server will calculate proper weighted score
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const avg = sum / scores.length;

  // Normalize to 0-100 scale (assuming 1-10 input scale)
  return Math.round((avg / 10) * 100 * 100) / 100;
}

// =============================================================================
// Combined Data Hook
// =============================================================================

/**
 * Hook to fetch both criteria config and item scores for a list
 * Useful for initial page load
 */
export function useCriteriaData(listId: string | null | undefined) {
  const configQuery = useCriteriaConfig(listId);
  const scoresQuery = useListItemScores(listId);

  return {
    config: configQuery.data?.criteriaConfig ?? null,
    scores: scoresQuery.data?.items ?? [],
    isLoading: configQuery.isLoading || scoresQuery.isLoading,
    isError: configQuery.isError || scoresQuery.isError,
    error: configQuery.error || scoresQuery.error,
    refetch: () => {
      configQuery.refetch();
      scoresQuery.refetch();
    },
    // Individual query states
    configQuery,
    scoresQuery,
  };
}

// =============================================================================
// Selector Hooks (memoized data extraction)
// =============================================================================

/**
 * Hook to get scores for a specific item from the list scores cache
 * Avoids individual API calls when list scores are already loaded
 */
export function useItemScoresFromList(
  listId: string | null | undefined,
  itemId: string | null | undefined
): ItemCriteriaScores | null {
  const { data } = useListItemScores(listId);

  if (!data || !itemId) return null;

  const item = data.items.find((i) => i.itemId === itemId);
  if (!item?.criteriaScores) return null;

  // Convert ListItemCriteriaScores to ItemCriteriaScores format
  return {
    itemId: item.itemId,
    profileId: item.criteriaScores.profileId,
    scores: item.criteriaScores.scores,
    weightedScore: item.criteriaScores.weightedScore,
    justification: item.criteriaScores.justification,
    scoredAt: item.criteriaScores.scoredAt,
  };
}
