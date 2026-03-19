'use client';

/**
 * QueryProvider - React Query configuration with unified caching
 *
 * This provider uses the consolidated caching configuration from unified-cache.ts
 * to ensure consistent cache behavior across the entire application.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { createQueryClient } from '@/lib/cache/query-cache-config';

const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? lazy(() =>
        import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools,
        }))
      )
    : null;

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use the centralized QueryClient factory for consistent configuration
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
