/**
 * Cache Module
 *
 * Unified caching layer with:
 * - Single source of truth for TTL values
 * - Tag-based invalidation
 * - Request coalescing/deduplication
 * - Development metrics dashboard
 * - React Query integration
 */

// =============================================================================
// Unified Cache Configuration (Primary API)
// =============================================================================

export {
  // TTL Constants
  CACHE_TTL_MS,
  STALE_TIME,
  GC_TIME_MS,
  // Presets for data types
  CACHE_PRESETS,
  // Cache tags for invalidation
  CACHE_TAGS,
  // Invalidation rules
  INVALIDATION_RULES as UNIFIED_INVALIDATION_RULES,
  // Type exports
  type CacheTTL as UnifiedCacheTTL,
  type CachePreset,
  type CacheTag,
  type InvalidationEvent as UnifiedInvalidationEvent,
  // Helper functions
  getStaleTime,
  getGcTime,
  getCacheSettings,
  getInvalidationTags,
  formatTTL,
} from './unified-cache';

// =============================================================================
// React Query Integration
// =============================================================================

export {
  createQueryClient,
  resetQueryClient,
  getCacheMetrics,
  resetCacheMetrics,
  invalidateByEvent,
  invalidateByTags,
  invalidateByPrefix,
  withCoalescing,
  getPendingRequestCount,
  prefetchQuery,
  prefetchQueries,
} from './query-cache-config';

export {
  useCacheInvalidation,
  createCacheInvalidator,
  type UseCacheInvalidationReturn,
} from './useCacheInvalidation';

// =============================================================================
// Legacy API Cache (Deprecated - migrate to React Query)
// =============================================================================

export {
  APICache,
  getGlobalAPICache,
  createCacheKey,
  CACHE_TTL,
  type CacheConfig,
  type CacheEntry,
  type CacheOptions,
  type CacheMetrics,
  type CacheTTL,
} from './api-cache';

export {
  CacheInvalidationManager,
  getCacheInvalidationManager,
  cacheInvalidation,
  INVALIDATION_RULES,
  type InvalidationRule,
  type InvalidationTrigger,
  type InvalidationEvent,
} from './invalidation-strategies';
