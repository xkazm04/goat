/**
 * usePrefetch Hook
 *
 * React hook for integrating with the prefetch system.
 * Provides a declarative way to prefetch data and track analytics.
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { prefetch, isPrefetched } = usePrefetch();
 *
 * // Prefetch a specific route
 * prefetch.route('/lists/123');
 *
 * // Check if data was prefetched
 * if (isPrefetched(['lists', '123'])) {
 *   console.log('Data was prefetched!');
 * }
 * ```
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { BandwidthDetector, type NetworkConditions, type PrefetchStrategy } from '@/lib/prefetch/BandwidthDetector';
import { PrefetchManager, type PrefetchTarget, type PrefetchAnalytics } from '@/lib/prefetch/PrefetchManager';
import { RoutePreloader } from '@/lib/prefetch/RoutePreloader';

export interface UsePrefetchReturn {
  /** Prefetch a single target */
  prefetch: (target: PrefetchTarget) => boolean;
  /** Prefetch multiple targets */
  prefetchMany: (targets: PrefetchTarget[]) => number;
  /** Prefetch data for a route */
  prefetchRoute: (pathname: string, priority?: 'high' | 'medium' | 'low') => void;
  /** Record a prefetch hit (data was used) */
  recordHit: (queryKey: readonly unknown[]) => void;
  /** Check if a query was prefetched */
  isPrefetched: (queryKey: readonly unknown[]) => boolean;
  /** Get current analytics */
  getAnalytics: () => PrefetchAnalytics;
  /** Get current network conditions */
  getNetworkConditions: () => NetworkConditions;
  /** Get current prefetch strategy */
  getStrategy: () => PrefetchStrategy;
  /** Check if prefetching is allowed */
  shouldPrefetch: () => boolean;
  /** Pause prefetching */
  pause: () => void;
  /** Resume prefetching */
  resume: () => void;
}

/**
 * Initialize the prefetch manager with the QueryClient
 */
export function usePrefetchInitializer(): void {
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      PrefetchManager.initialize(queryClient, {
        enabled: true,
        maxConcurrent: 3,
        respectBandwidth: true,
        trackAnalytics: true,
        debug: process.env.NODE_ENV === 'development',
      });
      initialized.current = true;
    }

    return () => {
      // Don't destroy on unmount - manager is a singleton
    };
  }, [queryClient]);
}

/**
 * Main prefetch hook
 */
export function usePrefetch(): UsePrefetchReturn {
  const prefetch = useCallback((target: PrefetchTarget): boolean => {
    return PrefetchManager.prefetch(target);
  }, []);

  const prefetchMany = useCallback((targets: PrefetchTarget[]): number => {
    return PrefetchManager.prefetchMany(targets);
  }, []);

  const prefetchRoute = useCallback(
    (pathname: string, priority?: 'high' | 'medium' | 'low'): void => {
      RoutePreloader.prefetchRoute(pathname, priority);
    },
    []
  );

  const recordHit = useCallback((queryKey: readonly unknown[]): void => {
    PrefetchManager.recordHit(queryKey);
  }, []);

  const isPrefetched = useCallback((queryKey: readonly unknown[]): boolean => {
    return PrefetchManager.wasPrefetched(queryKey);
  }, []);

  const getAnalytics = useCallback((): PrefetchAnalytics => {
    return PrefetchManager.getAnalytics();
  }, []);

  const getNetworkConditions = useCallback((): NetworkConditions => {
    return PrefetchManager.getNetworkConditions();
  }, []);

  const getStrategy = useCallback((): PrefetchStrategy => {
    return PrefetchManager.getStrategy();
  }, []);

  const shouldPrefetch = useCallback((): boolean => {
    return PrefetchManager.shouldPrefetch();
  }, []);

  const pause = useCallback((): void => {
    PrefetchManager.pause();
  }, []);

  const resume = useCallback((): void => {
    PrefetchManager.resume();
  }, []);

  return {
    prefetch,
    prefetchMany,
    prefetchRoute,
    recordHit,
    isPrefetched,
    getAnalytics,
    getNetworkConditions,
    getStrategy,
    shouldPrefetch,
    pause,
    resume,
  };
}

/**
 * Hook to track route changes and trigger prefetching
 */
export function useRoutePrefetch(pathname: string): void {
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger if path actually changed
    if (previousPath.current !== pathname) {
      RoutePreloader.onRouteChange(pathname);
      previousPath.current = pathname;
    }
  }, [pathname]);
}

/**
 * Hook to monitor network conditions
 */
export function useNetworkConditions(): NetworkConditions {
  const conditionsRef = useRef<NetworkConditions>(BandwidthDetector.getNetworkConditions());

  useEffect(() => {
    const unsubscribe = BandwidthDetector.subscribe((conditions) => {
      conditionsRef.current = conditions;
    });

    return unsubscribe;
  }, []);

  return conditionsRef.current;
}

/**
 * Hook to get prefetch analytics (for debugging/monitoring)
 */
export function usePrefetchAnalytics(): PrefetchAnalytics {
  return PrefetchManager.getAnalytics();
}

export default usePrefetch;
