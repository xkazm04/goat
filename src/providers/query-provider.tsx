'use client';

/**
 * QueryProvider - React Query configuration with unified caching
 *
 * This provider uses the consolidated caching configuration from unified-cache.ts
 * to ensure consistent cache behavior across the entire application.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { createQueryClient } from '@/lib/cache/query-cache-config';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use the centralized QueryClient factory for consistent configuration
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
