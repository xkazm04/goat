import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * State interface for Supabase queries
 * Follows React Query patterns for consistency with existing codebase
 */
export interface SupabaseQueryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

/**
 * Configuration options for useSupabaseQuery
 */
export interface SupabaseQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Query function type - returns a promise with the query result
 */
export type SupabaseQueryFn<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Custom hook for Supabase queries with loading, error, and data states
 * Wraps Supabase operations with React patterns for consistency with React Query
 *
 * @example
 * ```tsx
 * const { data, error, isLoading, refetch } = useSupabaseQuery(
 *   ['top-lists', listId],
 *   async (client) => {
 *     const { data, error } = await client
 *       .from('lists')
 *       .select('*')
 *       .eq('id', listId)
 *       .single();
 *
 *     if (error) throw error;
 *     return data;
 *   },
 *   { enabled: !!listId }
 * );
 * ```
 */
export function useSupabaseQuery<T = any>(
  queryKey: string | (string | number | boolean | undefined)[],
  queryFn: SupabaseQueryFn<T>,
  options: SupabaseQueryOptions = {}
): SupabaseQueryState<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchInterval,
    staleTime = 0,
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const cacheRef = useRef<{ data: T | null; timestamp: number } | null>(null);

  // Serialize query key for comparison
  const serializedKey = Array.isArray(queryKey)
    ? JSON.stringify(queryKey)
    : queryKey;

  /**
   * Execute the query with retry logic
   */
  const executeQuery = useCallback(async (isRefetch = false) => {
    if (!enabled) return;

    // Check if data is still fresh (within staleTime)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    if (!isRefetch && cacheRef.current && timeSinceLastFetch < staleTime) {
      setData(cacheRef.current.data);
      setIsLoading(false);
      return;
    }

    // Check if cache is still valid (within cacheTime)
    if (cacheRef.current && now - cacheRef.current.timestamp < cacheTime) {
      setData(cacheRef.current.data);
    }

    if (!isRefetch && !isLoading) {
      setIsFetching(true);
    }

    try {
      // Import Supabase client dynamically to avoid dependency issues
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing. Please check your environment variables.');
      }

      const client = createClient(supabaseUrl, supabaseAnonKey);
      const result = await queryFn(client);

      if (!mountedRef.current) return;

      setData(result);
      setError(null);
      setIsLoading(false);
      setIsFetching(false);
      lastFetchTimeRef.current = Date.now();
      cacheRef.current = { data: result, timestamp: Date.now() };
      retryCountRef.current = 0;

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err : new Error(String(err));

      // Retry logic
      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);

        setTimeout(() => {
          if (mountedRef.current) {
            executeQuery(isRefetch);
          }
        }, delay);
        return;
      }

      setError(error);
      setIsLoading(false);
      setIsFetching(false);
      retryCountRef.current = 0;

      if (onError) {
        onError(error);
      }
    }
  }, [enabled, queryFn, staleTime, cacheTime, retry, retryDelay, onSuccess, onError, isLoading]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    retryCountRef.current = 0;
    setIsFetching(true);
    await executeQuery(true);
  }, [executeQuery]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      executeQuery();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [serializedKey, enabled]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (mountedRef.current) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, refetch]);

  // Polling with refetchInterval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      if (mountedRef.current) {
        refetch();
      }
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, refetch]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch,
  };
}

/**
 * Helper hook for paginated queries
 */
export function useSupabasePaginatedQuery<T = any>(
  queryKey: string | (string | number | boolean | undefined)[],
  queryFn: (client: SupabaseClient, page: number, pageSize: number) => Promise<{ data: T[]; count: number }>,
  options: SupabaseQueryOptions & { pageSize?: number } = {}
) {
  const [page, setPage] = useState(0);
  const pageSize = options.pageSize || 10;

  const query = useSupabaseQuery<{ data: T[]; count: number }>(
    Array.isArray(queryKey) ? [...queryKey, page, pageSize] : [queryKey, page, pageSize],
    (client) => queryFn(client, page, pageSize),
    options
  );

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const previousPage = useCallback(() => {
    setPage((prev) => Math.max(0, prev - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(0, newPage));
  }, []);

  return {
    ...query,
    page,
    pageSize,
    nextPage,
    previousPage,
    goToPage,
    hasNextPage: query.data ? (page + 1) * pageSize < query.data.count : false,
    hasPreviousPage: page > 0,
  };
}
