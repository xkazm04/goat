/**
 * Coalesced Item Groups API
 *
 * This wrapper around the item-groups API adds request coalescing to prevent
 * duplicate simultaneous API calls. It ensures that multiple calls to the same
 * endpoint with the same parameters will only result in one network request.
 */

import { itemGroupsApi, ItemGroup, ItemGroupWithItems } from './item-groups';
import { RequestCoalescer } from '@/lib/utils/request-coalescer';

// Create a singleton coalescer for item groups API
let coalescerInstance: RequestCoalescer<any> | null = null;

const getCoalescer = (): RequestCoalescer<any> => {
  if (!coalescerInstance) {
    coalescerInstance = new RequestCoalescer({
      debounceMs: 50,
      enableLogging: true,
      cacheTTL: 5000,
      logPrefix: '🔄 ItemGroupsAPI',
    });
  }
  return coalescerInstance;
};

// Expose coalescer for debugging and stats
if (typeof window !== 'undefined') {
  (window as any).__itemGroupsCoalescer = () => getCoalescer();
}

/**
 * Generate a unique cache key for API requests
 */
const generateCacheKey = (endpoint: string, params: Record<string, any> = {}): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return sortedParams ? `${endpoint}?${sortedParams}` : endpoint;
};

/**
 * Coalesced API wrapper for item groups
 */
export const coalescedItemGroupsApi = {
  /**
   * Get groups by category with request coalescing
   */
  getGroupsByCategory: async (
    category: string,
    subcategory?: string,
    search?: string,
    limit: number = 100,
    minItemCount: number = 1
  ): Promise<ItemGroup[]> => {
    const coalescer = getCoalescer();

    const cacheKey = generateCacheKey(`/groups/categories/${category}`, {
      subcategory,
      search,
      limit,
      minItemCount,
    });

    return coalescer.coalesce(cacheKey, () =>
      itemGroupsApi.getGroupsByCategory(category, subcategory, search, limit, minItemCount)
    );
  },

  /**
   * Get single group with items with request coalescing
   */
  getGroup: async (groupId: string, includeItems: boolean = true): Promise<ItemGroupWithItems> => {
    const coalescer = getCoalescer();

    const cacheKey = generateCacheKey(`/groups/${groupId}`, {
      includeItems,
    });

    return coalescer.coalesce(cacheKey, () => itemGroupsApi.getGroup(groupId, includeItems));
  },

  /**
   * Invalidate cache for a specific category or all cache
   */
  invalidateCache: (category?: string): void => {
    const coalescer = getCoalescer();

    if (category) {
      // Invalidate all keys containing this category
      const stats = coalescer.getStats();
      // For now, just clear all cache when specific category is requested
      // In the future, we could track keys better for granular invalidation
      coalescer.invalidateCache();
    } else {
      coalescer.invalidateCache();
    }
  },

  /**
   * Get coalescer statistics
   */
  getStats: () => {
    return getCoalescer().getStats();
  },

  /**
   * Get efficiency metrics
   */
  getEfficiency: () => {
    return getCoalescer().getEfficiency();
  },

  /**
   * Reset statistics
   */
  resetStats: () => {
    return getCoalescer().resetStats();
  },
};

// Export the coalescer instance getter for advanced use
export const getItemGroupsCoalescer = getCoalescer;
