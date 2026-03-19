/**
 * Unified Cache Configuration
 *
 * Single source of truth for all caching configuration across the application.
 * Eliminates the dual-layer caching chaos by consolidating API cache and React Query
 * into a single, predictable caching strategy with aligned TTLs.
 *
 * @example
 * // In a React Query hook
 * import { CACHE_TTL_MS, STALE_TIME } from '@/lib/cache/unified-cache';
 *
 * const { data } = useQuery({
 *   queryKey: ['lists'],
 *   queryFn: fetchLists,
 *   staleTime: STALE_TIME.STANDARD,
 * });
 */

// =============================================================================
// Unified TTL Values (in milliseconds)
// =============================================================================

/**
 * Unified TTL values for both React Query staleTime and API cache TTL.
 * These values should be used across the entire application for consistency.
 */
export const CACHE_TTL_MS = {
  /** 30 seconds - Real-time data: consensus, live rankings, analytics */
  EPHEMERAL: 30_000,

  /** 1 minute - User-specific data, selections, preferences */
  SHORT: 60_000,

  /** 5 minutes - Default for most data: lists, items, sessions */
  STANDARD: 300_000,

  /** 15 minutes - Reference data: categories, groups, blueprints */
  LONG: 900_000,

  /** 1 hour - Static/rarely changing: configuration, metadata */
  STATIC: 3_600_000,

  /** Infinite - Never becomes stale automatically */
  INFINITE: Infinity,
} as const;

/**
 * Alias for use as React Query staleTime values.
 * Same values as CACHE_TTL_MS for API compatibility.
 */
export const STALE_TIME = CACHE_TTL_MS;

/**
 * Garbage collection time - how long to keep data in memory after it becomes unused.
 * Generally 2x the stale time, but capped to prevent memory bloat.
 */
export const GC_TIME_MS = {
  EPHEMERAL: 60_000,       // 1 minute
  SHORT: 120_000,          // 2 minutes
  STANDARD: 600_000,       // 10 minutes
  LONG: 1_800_000,         // 30 minutes
  STATIC: 7_200_000,       // 2 hours
  INFINITE: Infinity,
} as const;

// =============================================================================
// Data Type to TTL Mapping
// =============================================================================

/**
 * Recommended cache settings for different data types.
 * Use these when configuring queries to ensure consistency.
 */
export const CACHE_PRESETS = {
  // Real-time data
  consensus: {
    staleTime: CACHE_TTL_MS.EPHEMERAL,
    gcTime: GC_TIME_MS.EPHEMERAL,
    description: 'Community consensus, live voting data',
  },
  analytics: {
    staleTime: CACHE_TTL_MS.EPHEMERAL,
    gcTime: GC_TIME_MS.EPHEMERAL,
    description: 'View counts, trending scores, rankings',
  },

  // User-specific data
  userLists: {
    staleTime: CACHE_TTL_MS.SHORT,
    gcTime: GC_TIME_MS.SHORT,
    description: 'User-created lists, progress, preferences',
  },
  session: {
    staleTime: CACHE_TTL_MS.SHORT,
    gcTime: GC_TIME_MS.SHORT,
    description: 'Match sessions, grid state',
  },

  // Standard data
  lists: {
    staleTime: CACHE_TTL_MS.STANDARD,
    gcTime: GC_TIME_MS.STANDARD,
    description: 'Public lists, list details, featured lists',
  },
  items: {
    staleTime: CACHE_TTL_MS.STANDARD,
    gcTime: GC_TIME_MS.STANDARD,
    description: 'Backlog items, item details',
  },
  search: {
    staleTime: CACHE_TTL_MS.STANDARD,
    gcTime: GC_TIME_MS.STANDARD,
    description: 'Search results, filtered data',
  },

  // Reference data
  groups: {
    staleTime: CACHE_TTL_MS.LONG,
    gcTime: GC_TIME_MS.LONG,
    description: 'Backlog groups, item categories',
  },
  categories: {
    staleTime: CACHE_TTL_MS.STATIC,
    gcTime: GC_TIME_MS.STATIC,
    description: 'Category list, category metadata',
  },
  blueprints: {
    staleTime: CACHE_TTL_MS.LONG,
    gcTime: GC_TIME_MS.LONG,
    description: 'List templates, blueprints',
  },

  // Static configuration
  config: {
    staleTime: CACHE_TTL_MS.STATIC,
    gcTime: GC_TIME_MS.STATIC,
    description: 'App configuration, feature flags',
  },
  metadata: {
    staleTime: CACHE_TTL_MS.STATIC,
    gcTime: GC_TIME_MS.STATIC,
    description: 'Static metadata, schemas',
  },
} as const;

// =============================================================================
// Cache Tags for Invalidation
// =============================================================================

/**
 * Standardized cache tags for grouping related queries.
 * Used for coordinated invalidation across related data.
 *
 * Tags are matched via EXACT EQUALITY against query key parts.
 * Values must correspond to actual query key root strings or sub-part strings.
 *
 * Query key roots: 'top-lists', 'top-items', 'collection', 'criteria',
 *                  'list-collections', 'item-groups', 'item-stats'
 */
export const CACHE_TAGS = {
  // List-related — exact match against query key roots/sub-parts
  LISTS: 'top-lists',
  LIST_DETAIL: 'top-lists',
  FEATURED: 'featured',
  USER_LISTS: 'top-lists',

  // Item-related
  ITEMS: 'top-items',
  GROUPS: 'item-groups',
  CATEGORIES: 'categories',

  // Session-related
  SESSION: 'session',
  GRID: 'grid',

  // User-related
  USER_DATA: 'user-data',
  PREFERENCES: 'preferences',

  // Analytics
  ANALYTICS: 'analytics',
  CONSENSUS: 'consensus',

  // Misc
  SEARCH: 'search',
  SUGGESTIONS: 'suggestions',
} as const;

// =============================================================================
// Invalidation Rules
// =============================================================================

/**
 * Tag-based invalidation rules for coordinated cache clearing.
 * When an event occurs, all related tags should be invalidated.
 */
export const INVALIDATION_RULES = {
  /** When a list is created or updated */
  'list.updated': [CACHE_TAGS.LISTS, CACHE_TAGS.FEATURED] as const,

  /** When a list is deleted */
  'list.deleted': [CACHE_TAGS.LISTS, CACHE_TAGS.FEATURED] as const,

  /** When items are ranked in a grid */
  'item.ranked': [CACHE_TAGS.CONSENSUS, CACHE_TAGS.GRID, CACHE_TAGS.SESSION, CACHE_TAGS.ANALYTICS] as const,

  /** When a blueprint is created or modified */
  'blueprint.created': [CACHE_TAGS.LISTS, CACHE_TAGS.FEATURED] as const,

  /** When user preferences change */
  'user.updated': [CACHE_TAGS.USER_DATA, CACHE_TAGS.LISTS, CACHE_TAGS.PREFERENCES] as const,

  /** When backlog groups are modified */
  'groups.updated': [CACHE_TAGS.GROUPS, CACHE_TAGS.ITEMS] as const,

  /** Force refresh all data */
  'app.refresh': Object.values(CACHE_TAGS),
} as const;

// =============================================================================
// Retry Configuration
// =============================================================================

/**
 * Smart retry function that skips non-retriable client errors (4xx).
 * Use as the `retry` option in React Query queries.
 */
export function createSmartRetry(maxRetries: number) {
  return (failureCount: number, error: Error): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('401') || message.includes('403') || message.includes('404')) {
        return false;
      }
    }
    return failureCount < maxRetries;
  };
}

/**
 * Exponential backoff delay with configurable max.
 * Use as the `retryDelay` option in React Query.
 */
export function createRetryDelay(baseDelay: number = 1000, maxDelay: number = 30000) {
  return (attemptIndex: number): number => Math.min(baseDelay * 2 ** attemptIndex, maxDelay);
}

/**
 * Pre-built retry configurations for common use cases.
 * Spread directly into React Query options: `...getRetryConfig('standard')`
 */
export type RetryPreset = 'standard' | 'fast' | 'mutation' | 'batch' | 'none';

export function getRetryConfig(preset: RetryPreset): {
  retry: number | ((failureCount: number, error: Error) => boolean);
  retryDelay?: number | ((attemptIndex: number) => number);
} {
  switch (preset) {
    case 'standard':
      // 3 retries, skip 4xx, up to 30s backoff — default for queries
      return {
        retry: createSmartRetry(3),
        retryDelay: createRetryDelay(1000, 30000),
      };
    case 'fast':
      // 2 retries, up to 10s backoff — criteria, time-sensitive queries
      return {
        retry: 2,
        retryDelay: createRetryDelay(1000, 10000),
      };
    case 'mutation':
      // 1 retry, flat 1s delay — write operations
      return {
        retry: 1,
        retryDelay: 1000,
      };
    case 'batch':
      // 1 retry, no custom delay — batch operations
      return {
        retry: 1,
      };
    case 'none':
      // No retries
      return {
        retry: 0,
      };
  }
}

// =============================================================================
// Type Exports
// =============================================================================

export type CacheTTL = keyof typeof CACHE_TTL_MS;
export type CachePreset = keyof typeof CACHE_PRESETS;
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
export type InvalidationEvent = keyof typeof INVALIDATION_RULES;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the recommended stale time for a data type.
 */
export function getStaleTime(preset: CachePreset): number {
  return CACHE_PRESETS[preset].staleTime;
}

/**
 * Get the recommended gc time for a data type.
 */
export function getGcTime(preset: CachePreset): number {
  return CACHE_PRESETS[preset].gcTime;
}

/**
 * Get cache settings for a data type.
 */
export function getCacheSettings(preset: CachePreset): {
  staleTime: number;
  gcTime: number;
} {
  const config = CACHE_PRESETS[preset];
  return {
    staleTime: config.staleTime,
    gcTime: config.gcTime,
  };
}

/**
 * Get tags to invalidate for a given event.
 */
export function getInvalidationTags(event: InvalidationEvent): readonly string[] {
  return INVALIDATION_RULES[event];
}

/**
 * Format TTL duration for display.
 */
export function formatTTL(ms: number): string {
  if (ms === Infinity) return 'Never';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}
