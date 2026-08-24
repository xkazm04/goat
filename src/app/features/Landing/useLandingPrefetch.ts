"use client";

/**
 * useLandingPrefetch - Fires all landing page data fetches in parallel
 *
 * Without this, queries waterfall as lazy components mount progressively:
 *   FloatingShowcase mounts → fetches featured lists
 *   FeaturedListsSection mounts (scroll) → cache hit (same query)
 *   UserListsSection mounts (scroll) → fetches user lists
 *   CollectionsSection mounts (scroll) → fetches collections
 *
 * With this hook at the LandingLayout level, all three independent queries
 * fire simultaneously on page load. When lazy sections mount later,
 * TanStack Query serves data from cache.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { goatApi } from "@/lib/api";
import { CACHE_TTL_MS } from "@/lib/cache/unified-cache";
import { trackError } from "@/lib/errors/error-analytics";
import { listCollectionKeys } from "@/lib/query-keys/list-collections";
import { topListsKeys } from "@/lib/query-keys/top-lists";

const FEATURED_PARAMS = {
  popular_limit: 80,
  trending_limit: 80,
  latest_limit: 80,
  awards_limit: 80,
} as const;

export function useLandingPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Read user ID from localStorage (same source as useTempUser)
    const userId = localStorage.getItem("temp_user_id");

    // Fire all independent queries in parallel
    const prefetches: Promise<void>[] = [];

    // 1. Featured lists - used by FloatingShowcase + FeaturedListsSection
    prefetches.push(
      queryClient.prefetchQuery({
        queryKey: topListsKeys.featured(FEATURED_PARAMS),
        queryFn: () => goatApi.lists.getFeatured(FEATURED_PARAMS),
        staleTime: CACHE_TTL_MS.STANDARD,
      })
    );

    // 2. User lists - used by UserListsSection
    if (userId) {
      prefetches.push(
        queryClient.prefetchQuery({
          queryKey: topListsKeys.userLists(userId, { limit: 10 }),
          queryFn: () => goatApi.lists.getByUser(userId, { limit: 10 }),
          staleTime: CACHE_TTL_MS.STANDARD,
        })
      );

      // 3. User collections - used by CollectionsSection
      prefetches.push(
        queryClient.prefetchQuery({
          queryKey: listCollectionKeys.userCollections(userId),
          queryFn: async () => {
            const searchParams = new URLSearchParams();
            searchParams.set("user_id", userId);
            const response = await fetch(
              `/api/collections?${searchParams.toString()}`
            );
            if (!response.ok) throw new Error("Failed to fetch collections");
            const result = await response.json();
            return result.data || result;
          },
          staleTime: CACHE_TTL_MS.STANDARD,
        })
      );
    }

    // All prefetches run in parallel - no need to await
    Promise.all(prefetches).catch((error) => {
      trackError({
        code: 'NETWORK_TIMEOUT',
        category: 'network',
        severity: 'warning',
        traceId: `landing-prefetch-${Date.now()}`,
        source: 'useLandingPrefetch',
        context: { operation: 'prefetchAll', message: error instanceof Error ? error.message : String(error) },
      });
    });
  }, [queryClient]);
}
