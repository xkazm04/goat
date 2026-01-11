/**
 * Cache Module
 *
 * Intelligent caching layer for API responses with:
 * - Configurable TTL
 * - Request deduplication
 * - LRU eviction
 * - Comprehensive metrics
 * - Invalidation strategies
 */

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
