/**
 * Supabase Mutation Hook - TanStack Query Integration
 *
 * A unified wrapper around TanStack Query useMutation that provides:
 * - Direct Supabase client integration
 * - Optimistic updates with automatic rollback
 * - Cache invalidation integration
 * - Type-safe mutation functions
 * - Compatible API with previous custom implementation
 *
 * @example
 * ```tsx
 * const createList = useSupabaseMutation(
 *   async (client, variables: { title: string; category: string }) => {
 *     const { data, error } = await client
 *       .from('lists')
 *       .insert({
 *         title: variables.title,
 *         category: variables.category,
 *       })
 *       .select()
 *       .single();
 *
 *     if (error) throw error;
 *     return data;
 *   },
 *   {
 *     onSuccess: (data) => {
 *       console.log('List created:', data);
 *     },
 *     invalidateTags: ['lists', 'user-lists'],
 *   }
 * );
 *
 * // Execute mutation
 * await createList.mutateAsync({ title: 'My List', category: 'movies' });
 * ```
 */

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { invalidateByTags } from '@/lib/cache/query-cache-config';

// =============================================================================
// Types
// =============================================================================

/**
 * Mutation function type - receives Supabase client and variables
 */
export type SupabaseMutationFn<TData, TVariables> = (
  client: SupabaseClient,
  variables: TVariables
) => Promise<TData>;

/**
 * Configuration options for useSupabaseMutation
 */
export interface SupabaseMutationOptions<TData, TVariables, TContext = unknown> {
  /** Callback before mutation executes (for optimistic updates) */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  /** Callback on successful mutation */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void;
  /** Callback when mutation settles (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
  /** Number of retry attempts */
  retry?: number;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Optimistic update function (legacy compatibility) */
  optimisticUpdate?: (variables: TVariables) => TData | null;
  /** Cache tags to invalidate on success */
  invalidateTags?: string[];
  /** Query keys to invalidate on success */
  invalidateQueries?: readonly unknown[][];
  /** Mutation key for tracking/deduplication */
  mutationKey?: readonly unknown[];
}

/**
 * State interface for Supabase mutations
 * Compatible with previous implementation for easy migration
 */
export interface SupabaseMutationState<TData, TVariables> {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isPending: boolean;
  isIdle: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
  /** Additional TanStack Query properties */
  status: 'idle' | 'pending' | 'success' | 'error';
  failureCount: number;
  submittedAt: number;
}

// =============================================================================
// Singleton Supabase Client
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client singleton
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useSupabaseMutation - TanStack Query wrapper for Supabase mutations
 *
 * Handles insert, update, delete operations with optimistic updates,
 * automatic cache invalidation, and rollback on error.
 */
export function useSupabaseMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
  mutationFn: SupabaseMutationFn<TData, TVariables>,
  options: SupabaseMutationOptions<TData, TVariables, TContext> = {}
): SupabaseMutationState<TData, TVariables> {
  const queryClient = useQueryClient();

  const {
    onMutate,
    onSuccess,
    onError,
    onSettled,
    retry = 0,
    retryDelay = 1000,
    invalidateTags,
    invalidateQueries,
    mutationKey,
  } = options;

  // Build TanStack Query mutation options
  const mutationOptions: UseMutationOptions<TData, Error, TVariables, TContext> = {
    mutationKey,
    mutationFn: async (variables: TVariables) => {
      const client = getSupabaseClient();
      return mutationFn(client, variables);
    },
    onMutate: onMutate as ((variables: TVariables) => Promise<TContext> | TContext) | undefined,
    onSuccess: async (data, variables, context) => {
      // Call user's onSuccess callback
      if (onSuccess) {
        await onSuccess(data, variables, context);
      }

      // Invalidate specified tags
      if (invalidateTags && invalidateTags.length > 0) {
        invalidateByTags(queryClient, invalidateTags);
      }

      // Invalidate specified query keys
      if (invalidateQueries && invalidateQueries.length > 0) {
        for (const queryKey of invalidateQueries) {
          await queryClient.invalidateQueries({ queryKey });
        }
      }
    },
    onError: (error, variables, context) => {
      if (onError) {
        onError(error, variables, context);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (onSettled) {
        onSettled(data, error, variables, context);
      }
    },
    retry,
    retryDelay: (attemptIndex) => Math.min(retryDelay * 2 ** attemptIndex, 30000),
  };

  // Execute the mutation
  const mutation = useMutation(mutationOptions);

  return {
    data: mutation.data ?? null,
    error: mutation.error ?? null,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isIdle: mutation.isIdle,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    // Additional properties
    status: mutation.status,
    failureCount: mutation.failureCount,
    submittedAt: mutation.submittedAt,
  };
}

// =============================================================================
// Batch Mutation Hook
// =============================================================================

/**
 * Batch mutation options
 */
export interface SupabaseBatchMutationOptions<TData, TVariables>
  extends Omit<SupabaseMutationOptions<TData[], TVariables[], unknown>, 'onMutate'> {
  /** Execute mutations in parallel or sequentially */
  mode?: 'sequential' | 'parallel';
  /** Stop on first error in sequential mode */
  stopOnError?: boolean;
}

/**
 * useSupabaseBatchMutation - Execute multiple mutations
 *
 * Executes an array of mutations either in sequence or parallel.
 */
export function useSupabaseBatchMutation<TData = unknown, TVariables = unknown>(
  mutationFn: SupabaseMutationFn<TData, TVariables>,
  options: SupabaseBatchMutationOptions<TData, TVariables> = {}
): SupabaseMutationState<TData[], TVariables[]> {
  const {
    mode = 'sequential',
    stopOnError = true,
    ...mutationOptions
  } = options;

  // Wrap the mutation function for batch execution
  const batchMutationFn: SupabaseMutationFn<TData[], TVariables[]> = async (client, variablesArray) => {
    if (mode === 'parallel') {
      // Execute all mutations in parallel
      return Promise.all(variablesArray.map((variables) => mutationFn(client, variables)));
    } else {
      // Execute mutations sequentially
      const results: TData[] = [];
      for (const variables of variablesArray) {
        try {
          const result = await mutationFn(client, variables);
          results.push(result);
        } catch (error) {
          if (stopOnError) {
            throw error;
          }
          // Continue on error - push null or re-throw
          console.error('Batch mutation error (continuing):', error);
        }
      }
      return results;
    }
  };

  return useSupabaseMutation<TData[], TVariables[]>(batchMutationFn, mutationOptions);
}

// =============================================================================
// Optimistic Update Helpers
// =============================================================================

/**
 * Helper type for optimistic update context
 */
export interface OptimisticContext<T> {
  previousData: T | undefined;
  optimisticData: T;
}

/**
 * Create optimistic update handlers with queryClient access
 *
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 *
 * const { onMutate, onError, onSettled } = createOptimisticUpdate<Item[], NewItem>(
 *   queryClient,
 *   ['items'],
 *   (current, newItem) => [...(current ?? []), { ...newItem, id: 'temp-' + Date.now() }]
 * );
 *
 * const mutation = useSupabaseMutation(mutationFn, { onMutate, onError, onSettled });
 * ```
 */
export function createOptimisticUpdate<TData, TVariables>(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  updateFn: (currentData: TData | undefined, variables: TVariables) => TData
) {
  return {
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update
      const optimisticData = updateFn(previousData, variables);
      queryClient.setQueryData<TData>(queryKey, optimisticData);

      return { previousData, optimisticData };
    },

    onError: (
      _error: Error,
      _variables: TVariables,
      context: OptimisticContext<TData> | undefined
    ) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a typed mutation hook for a specific operation
 *
 * @example
 * ```tsx
 * const useCreateList = createSupabaseMutationHook<List, CreateListInput>(
 *   async (client, input) => {
 *     const { data, error } = await client.from('lists').insert(input).select().single();
 *     if (error) throw error;
 *     return data;
 *   },
 *   { invalidateTags: ['lists'] }
 * );
 *
 * // Usage
 * const createList = useCreateList();
 * await createList.mutateAsync({ title: 'New List', category: 'movies' });
 * ```
 */
export function createSupabaseMutationHook<TData, TVariables, TContext = unknown>(
  mutationFn: SupabaseMutationFn<TData, TVariables>,
  defaultOptions: SupabaseMutationOptions<TData, TVariables, TContext> = {}
) {
  return function useTypedSupabaseMutation(
    options: SupabaseMutationOptions<TData, TVariables, TContext> = {}
  ) {
    return useSupabaseMutation<TData, TVariables, TContext>(mutationFn, {
      ...defaultOptions,
      ...options,
    });
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the Supabase client for direct use
 */
export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

/**
 * Reset the Supabase client singleton (for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
}
