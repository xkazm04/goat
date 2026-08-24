/**
 * useOptimisticMutation - Optimistic Update Layer for TanStack Query
 *
 * Wraps useMutation with automatic cache snapshotting, optimistic updates,
 * rollback on failure, and error notification via ErrorNotificationToast.
 *
 * Pattern inspired by Linear, Todoist, and Things — UI updates instantly,
 * server confirmation happens in the background.
 *
 * @example
 * ```tsx
 * const updateList = useOptimisticMutation({
 *   mutationFn: ({ listId, data }) => goatApi.lists.update(listId, data),
 *   optimisticUpdates: [{
 *     queryKey: topListsKeys.list(listId),
 *     updater: (current, variables) => ({ ...current, ...variables.data }),
 *   }],
 *   invalidateOnSettled: [topListsKeys.lists()],
 *   notificationSource: 'list-update',
 * });
 * ```
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { invalidateByTags } from '@/lib/cache/query-cache-config';
import { emitErrorNotification } from '@/lib/errors/error-notification-store';

// =============================================================================
// Types
// =============================================================================

/**
 * Describes how to optimistically update a single query cache entry.
 * The updater receives the current cached value (typed as `any` since different
 * updates in the same mutation may target caches with different shapes).
 */
export interface OptimisticUpdate<TVariables> {
  /** The query key to snapshot and optimistically update */
  queryKey: QueryKey;
  /** Function that produces the optimistic cache value */
  updater: (currentData: any, variables: TVariables) => unknown;
}

/**
 * Snapshot of a query's previous data for rollback.
 */
interface CacheSnapshot {
  queryKey: QueryKey;
  data: unknown;
}

/**
 * Context carried through the mutation lifecycle for rollback.
 */
interface OptimisticContext {
  snapshots: CacheSnapshot[];
}

/**
 * Options for useOptimisticMutation.
 */
export interface UseOptimisticMutationOptions<TData, TVariables> {
  /** The mutation function to execute */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * One or more optimistic update descriptors.
   * Each entry targets a specific query key with an updater function.
   * Can be a static array or a function that receives variables (for dynamic keys).
   */
  optimisticUpdates:
    | OptimisticUpdate<TVariables>[]
    | ((variables: TVariables) => OptimisticUpdate<TVariables>[]);

  /** Query keys to invalidate after the mutation settles (success or error) */
  invalidateOnSettled?: QueryKey[];

  /** Cache tags to invalidate on success (from unified-cache CACHE_TAGS) */
  invalidateTags?: string[];

  /** Callback on successful mutation (runs after cache invalidation) */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /** Additional callback on error (runs after rollback and notification) */
  onError?: (error: Error, variables: TVariables) => void;

  /** Callback when mutation settles (success or error) */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;

  /** Source identifier for error notifications (e.g., 'list-update') */
  notificationSource?: string;

  /** Custom retry callback attached to the error notification toast */
  onRetry?: (variables: TVariables) => void;

  /** Mutation key for deduplication/tracking */
  mutationKey?: QueryKey;

  /** Number of retries (default: 1 for mutations) */
  retry?: number;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useOptimisticMutation — instant UI updates with automatic rollback.
 *
 * 1. onMutate: snapshots targeted queries, applies optimistic updater
 * 2. On success: invalidates tags/queries to sync with server truth
 * 3. On error: restores all snapshots, shows ErrorNotificationToast
 * 4. onSettled: invalidates specified queries to guarantee consistency
 */
export function useOptimisticMutation<TData = unknown, TVariables = void>(
  options: UseOptimisticMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();

  const {
    mutationFn,
    optimisticUpdates,
    invalidateOnSettled,
    invalidateTags: tags,
    onSuccess,
    onError,
    onSettled,
    notificationSource,
    onRetry,
    mutationKey,
    retry = 1,
  } = options;

  return useMutation<TData, Error, TVariables, OptimisticContext>({
    mutationKey,
    mutationFn,
    retry,

    onMutate: async (variables) => {
      // Resolve update descriptors (static array or dynamic function)
      const updates =
        typeof optimisticUpdates === 'function'
          ? optimisticUpdates(variables)
          : optimisticUpdates;

      // Cancel in-flight refetches for all targeted queries
      await Promise.all(
        updates.map((u) => queryClient.cancelQueries({ queryKey: u.queryKey }))
      );

      // Snapshot current cache state for each targeted query
      const snapshots: CacheSnapshot[] = updates.map((u) => ({
        queryKey: u.queryKey,
        data: queryClient.getQueryData(u.queryKey),
      }));

      // Apply optimistic updates
      for (const update of updates) {
        const current = queryClient.getQueryData(update.queryKey);
        const optimistic = update.updater(current, variables);
        queryClient.setQueryData(update.queryKey, optimistic);
      }

      return { snapshots };
    },

    onError: (error, variables, context) => {
      // Rollback all snapshots
      if (context?.snapshots) {
        for (const snapshot of context.snapshots) {
          queryClient.setQueryData(snapshot.queryKey, snapshot.data);
        }
      }

      // Show error notification toast
      emitErrorNotification(error, {
        source: notificationSource ?? 'optimistic-mutation',
        onRetry: onRetry ? () => onRetry(variables) : undefined,
      });

      // Call user's onError callback
      onError?.(error, variables);
    },

    onSuccess: async (data, variables) => {
      // Invalidate cache tags on success
      if (tags && tags.length > 0) {
        invalidateByTags(queryClient, tags);
      }

      // Call user's onSuccess callback
      onSuccess?.(data, variables);
    },

    onSettled: (data, error, variables) => {
      // Always invalidate specified queries to ensure server truth
      if (invalidateOnSettled) {
        for (const queryKey of invalidateOnSettled) {
          queryClient.invalidateQueries({ queryKey });
        }
      }

      // Call user's onSettled callback
      onSettled?.(data, error, variables);
    },
  });
}
