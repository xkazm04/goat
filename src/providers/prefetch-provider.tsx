/**
 * PrefetchProvider
 *
 * Provider component that initializes and manages the prefetching system.
 * Must be placed inside QueryProvider to access the QueryClient.
 *
 * @example
 * ```tsx
 * // In app layout
 * <QueryProvider>
 *   <PrefetchProvider>
 *     {children}
 *   </PrefetchProvider>
 * </QueryProvider>
 * ```
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { PredictionEngine } from '@/lib/prefetch/PredictionEngine';
import { PrefetchManager } from '@/lib/prefetch/PrefetchManager';
import { RoutePreloader } from '@/lib/prefetch/RoutePreloader';

export interface PrefetchProviderProps {
  children: React.ReactNode;
  /** Enable prefetching (default: true) */
  enabled?: boolean;
  /** Enable debug logging (default: development only) */
  debug?: boolean;
  /** Maximum concurrent prefetch requests (default: 3) */
  maxConcurrent?: number;
  /** Respect bandwidth constraints (default: true) */
  respectBandwidth?: boolean;
}

export function PrefetchProvider({
  children,
  enabled = true,
  debug = process.env.NODE_ENV === 'development',
  maxConcurrent = 3,
  respectBandwidth = true,
}: PrefetchProviderProps) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const initialized = useRef(false);
  const previousPath = useRef<string | null>(null);

  // Initialize PrefetchManager
  useEffect(() => {
    if (!initialized.current) {
      PrefetchManager.initialize(queryClient, {
        enabled,
        maxConcurrent,
        respectBandwidth,
        trackAnalytics: true,
        debug,
      });
      initialized.current = true;

      if (debug) {
        console.log('[PrefetchProvider] Initialized');

        // Expose for debugging in development
        if (typeof window !== 'undefined') {
          (window as unknown as Record<string, unknown>).__prefetchManager = PrefetchManager;
          (window as unknown as Record<string, unknown>).__routePreloader = RoutePreloader;
          (window as unknown as Record<string, unknown>).__predictionEngine = PredictionEngine;
        }
      }
    }

    return () => {
      // Don't destroy on unmount in dev due to strict mode double-mounting
    };
  }, [queryClient, enabled, maxConcurrent, respectBandwidth, debug]);

  // Handle config updates
  useEffect(() => {
    if (initialized.current) {
      PrefetchManager.updateConfig({
        enabled,
        maxConcurrent,
        respectBandwidth,
        debug,
      });
    }
  }, [enabled, maxConcurrent, respectBandwidth, debug]);

  // Handle route changes
  useEffect(() => {
    if (previousPath.current !== pathname) {
      RoutePreloader.onRouteChange(pathname);
      previousPath.current = pathname;
    }
  }, [pathname]);

  return <>{children}</>;
}

export default PrefetchProvider;
