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

import { optimisticEntityMutex, type MutexLease } from '@/lib/async-state/entity-mutex';
import { decideRevert, type OptimisticWrite } from '@/lib/async-state/optimistic-revert';
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
 * What one attempt wrote to one query key: the value that was there before, and
 * the value this attempt painted. Both halves are needed — the first to restore,
 * the SECOND to decide whether restoring is still the right thing to do.
 * Recording only the snapshot is the naive recipe.
 */
interface CacheWrite extends OptimisticWrite {
  queryKey: QueryKey;
}

/**
 * Context carried through the mutation lifecycle.
 */
interface OptimisticContext {
  writes: CacheWrite[];
  /** Null when the caller declared no entityKey, i.e. opted out of the mutex. */
  lease: MutexLease | null;
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

  /**
   * The DURABLE identity of the entity this mutation writes, derived from the
   * variables. When supplied, at most one attempt against that identity runs at
   * a time and the next one WAITS — so a snapshot is, by construction, the
   * settled state rather than a predecessor's unconfirmed paint.
   *
   * Must be the entity's minted identity, never a row index or a display name
   * (identity-survives-reuse). Return `null` to opt an individual call out.
   *
   * Omitting it entirely is a deliberate choice with a cost: two rapid actions
   * on one entity will corrupt each other's rollback. Say why in a comment at
   * the call site rather than leaving it absent by default.
   */
  entityKey?: (variables: TVariables) => string | null;
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
    entityKey,
  } = options;

  return useMutation<TData, Error, TVariables, OptimisticContext>({
    mutationKey,
    mutationFn,
    retry,

    onMutate: async (variables) => {
      // THE WHOLE ATTEMPT IS INSIDE THE CRITICAL SECTION — acquire, snapshot,
      // paint, request, settle. Splitting the paint out to keep the interface
      // responsive would reintroduce exactly the overlapping snapshot the mutex
      // exists to prevent. The lease is released in onSettled.
      const key = entityKey?.(variables) ?? null;
      const lease = key ? await optimisticEntityMutex.acquire(key) : null;

      // Resolve update descriptors (static array or dynamic function)
      const updates =
        typeof optimisticUpdates === 'function'
          ? optimisticUpdates(variables)
          : optimisticUpdates;

      // Cancel in-flight refetches for all targeted queries
      await Promise.all(
        updates.map((u) => queryClient.cancelQueries({ queryKey: u.queryKey }))
      );

      // Snapshot AND record what we paint. The painted value is what makes the
      // revert a compare-and-swap instead of a guess.
      const writes: CacheWrite[] = [];
      for (const update of updates) {
        const previous = queryClient.getQueryData(update.queryKey);
        const painted = update.updater(previous, variables);
        queryClient.setQueryData(update.queryKey, painted);
        writes.push({
          queryKey: update.queryKey,
          label: JSON.stringify(update.queryKey),
          previous,
          painted,
        });
      }

      return { writes, lease };
    },

    onError: (error, variables, context) => {
      // An attempt that no longer owns its slot — reaped after a timeout, or
      // cleared by an eviction — must stay INERT. Something else has taken over
      // this entity, and writing now would be two mutations proceeding
      // concurrently in precisely the case the mutex was built for.
      const stillOurs = !context?.lease || context.lease.isHeld();

      let reverted = 0;
      let dropped = 0;
      if (stillOurs && context?.writes) {
        for (const write of context.writes) {
          const current = queryClient.getQueryData(write.queryKey);
          const verdict = decideRevert(write, current);
          if (verdict.action === 'revert') {
            queryClient.setQueryData(write.queryKey, write.previous);
            reverted += 1;
          } else {
            // A dropped revert is NORMAL, not an error: a refetch or a later
            // mutation has already written a newer truth, and restoring the
            // snapshot would resurrect a value the authority has contradicted.
            dropped += 1;
          }
        }
      }

      // LOSING THE REVERT MUST NEVER MEAN LOSING THE FAILURE. This emit is
      // outside every branch above on purpose — including the case where the
      // entity vanished, which is exactly when the row that would have shown
      // the failure is the one that disappeared.
      emitErrorNotification(error, {
        source: notificationSource ?? 'optimistic-mutation',
        onRetry: onRetry ? () => onRetry(variables) : undefined,
      });

      if (process.env.NODE_ENV !== 'production' && dropped > 0) {
        console.debug(
          `[optimistic] ${reverted} revert(s) applied, ${dropped} dropped as overwritten or gone. ` +
            `Dropping is correct; the failure was still reported.`,
        );
      }

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

    onSettled: (data, error, variables, context) => {
      // Release BEFORE invalidating, so the next queued attempt for this entity
      // starts against a settled slot. `release()` clears the slot only if this
      // lease is still the holder.
      context?.lease?.release();

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
