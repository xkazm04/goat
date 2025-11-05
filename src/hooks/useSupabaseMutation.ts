import { useState, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * State interface for Supabase mutations
 */
export interface SupabaseMutationState<TData, TVariables> {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

/**
 * Configuration options for useSupabaseMutation
 */
export interface SupabaseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: Error, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: Error | null, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => void | Promise<any>;
  retry?: number;
  retryDelay?: number;
  optimisticUpdate?: (variables: TVariables) => TData | null;
}

/**
 * Mutation function type - returns a promise with the mutation result
 */
export type SupabaseMutationFn<TData, TVariables> = (
  client: SupabaseClient,
  variables: TVariables
) => Promise<TData>;

/**
 * Custom hook for Supabase mutations (insert, update, delete)
 * Provides optimistic updates and error handling
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
 *     onError: (error) => {
 *       console.error('Failed to create list:', error);
 *     },
 *   }
 * );
 *
 * // Execute mutation
 * await createList.mutate({ title: 'My List', category: 'movies' });
 * ```
 */
export function useSupabaseMutation<TData = any, TVariables = any>(
  mutationFn: SupabaseMutationFn<TData, TVariables>,
  options: SupabaseMutationOptions<TData, TVariables> = {}
): SupabaseMutationState<TData, TVariables> {
  const {
    onSuccess,
    onError,
    onSettled,
    onMutate,
    retry = 0,
    retryDelay = 1000,
    optimisticUpdate,
  } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const rollbackRef = useRef<any>(null);

  /**
   * Execute the mutation with retry and optimistic update logic
   */
  const executeMutation = useCallback(
    async (variables: TVariables, isRetry = false): Promise<TData> => {
      if (!isRetry) {
        setIsLoading(true);
        setError(null);
        retryCountRef.current = 0;
      }

      try {
        // Call onMutate for optimistic updates
        if (onMutate && !isRetry) {
          rollbackRef.current = await onMutate(variables);
        }

        // Apply optimistic update if provided
        if (optimisticUpdate && !isRetry) {
          const optimisticData = optimisticUpdate(variables);
          if (optimisticData) {
            setData(optimisticData);
          }
        }

        // Import Supabase client dynamically
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing. Please check your environment variables.');
        }

        const client = createClient(supabaseUrl, supabaseAnonKey);
        const result = await mutationFn(client, variables);

        if (!mountedRef.current) return result;

        setData(result);
        setError(null);
        setIsLoading(false);
        retryCountRef.current = 0;

        // Call onSuccess callback
        if (onSuccess) {
          await onSuccess(result, variables);
        }

        // Call onSettled callback
        if (onSettled) {
          onSettled(result, null, variables);
        }

        return result;
      } catch (err) {
        if (!mountedRef.current) throw err;

        const mutationError = err instanceof Error ? err : new Error(String(err));

        // Retry logic
        if (retryCountRef.current < retry) {
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);

          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              if (mountedRef.current) {
                try {
                  const result = await executeMutation(variables, true);
                  resolve(result);
                } catch (retryErr) {
                  reject(retryErr);
                }
              } else {
                reject(mutationError);
              }
            }, delay);
          });
        }

        // Rollback optimistic update on error
        if (rollbackRef.current !== null && optimisticUpdate) {
          setData(rollbackRef.current);
        }

        setError(mutationError);
        setIsLoading(false);
        retryCountRef.current = 0;

        // Call onError callback
        if (onError) {
          onError(mutationError, variables);
        }

        // Call onSettled callback
        if (onSettled) {
          onSettled(null, mutationError, variables);
        }

        throw mutationError;
      }
    },
    [mutationFn, onSuccess, onError, onSettled, onMutate, retry, retryDelay, optimisticUpdate]
  );

  /**
   * Synchronous mutation trigger (fire and forget)
   */
  const mutate = useCallback(
    (variables: TVariables) => {
      return executeMutation(variables).catch((err) => {
        // Error is already handled in executeMutation
        console.error('Mutation error:', err);
        return Promise.reject(err);
      });
    },
    [executeMutation]
  );

  /**
   * Async mutation trigger (returns promise)
   */
  const mutateAsync = useCallback(
    (variables: TVariables) => {
      return executeMutation(variables);
    },
    [executeMutation]
  );

  /**
   * Reset mutation state
   */
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    retryCountRef.current = 0;
    rollbackRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null && !isLoading,
    mutate,
    mutateAsync,
    reset,
  };
}

/**
 * Helper hook for batch mutations
 * Executes multiple mutations in sequence or parallel
 */
export function useSupabaseBatchMutation<TData = any, TVariables = any>(
  mutationFn: SupabaseMutationFn<TData, TVariables>,
  options: SupabaseMutationOptions<TData[], TVariables[]> & {
    mode?: 'sequential' | 'parallel';
  } = {}
) {
  const { mode = 'sequential', ...mutationOptions } = options;
  const [data, setData] = useState<TData[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const executeBatch = useCallback(
    async (variablesArray: TVariables[]): Promise<TData[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing.');
        }

        const client = createClient(supabaseUrl, supabaseAnonKey);

        let results: TData[];

        if (mode === 'parallel') {
          // Execute all mutations in parallel
          results = await Promise.all(
            variablesArray.map((variables) => mutationFn(client, variables))
          );
        } else {
          // Execute mutations sequentially
          results = [];
          for (const variables of variablesArray) {
            const result = await mutationFn(client, variables);
            results.push(result);
          }
        }

        setData(results);
        setIsLoading(false);

        if (mutationOptions.onSuccess) {
          await mutationOptions.onSuccess(results, variablesArray);
        }

        return results;
      } catch (err) {
        const batchError = err instanceof Error ? err : new Error(String(err));
        setError(batchError);
        setIsLoading(false);

        if (mutationOptions.onError) {
          mutationOptions.onError(batchError, variablesArray);
        }

        throw batchError;
      }
    },
    [mutationFn, mode, mutationOptions]
  );

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    mutate: executeBatch,
    mutateAsync: executeBatch,
    reset: () => {
      setData(null);
      setError(null);
      setIsLoading(false);
    },
  };
}

// Import useEffect for cleanup
import { useEffect } from 'react';
