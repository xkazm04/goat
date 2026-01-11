/**
 * Cached API Client
 *
 * A wrapper around the base API client that adds intelligent caching.
 * This provides a drop-in replacement for common API calls with built-in caching.
 */

import { apiClient } from './client';
import { getGlobalAPICache, createCacheKey, CACHE_TTL, type CacheTTL, type CacheOptions } from '@/lib/cache';

export interface CachedRequestOptions extends Omit<CacheOptions, 'ttl'> {
  /** TTL preset or custom milliseconds */
  ttl?: CacheTTL | number;
  /** Cache key override (default: auto-generated from endpoint + params) */
  cacheKey?: string;
}

/**
 * CachedApiClient - API client with built-in caching
 *
 * @example
 * // Basic usage with default caching
 * const data = await cachedApiClient.get('/lists');
 *
 * // Custom TTL
 * const data = await cachedApiClient.get('/lists', { page: 1 }, { ttl: 'long' });
 *
 * // Bypass cache
 * const fresh = await cachedApiClient.get('/lists', {}, { bypassCache: true });
 */
export const cachedApiClient = {
  /**
   * GET request with caching
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options: CachedRequestOptions = {}
  ): Promise<T> {
    const cache = getGlobalAPICache();
    const cacheKey = options.cacheKey || createCacheKey(endpoint, params);

    return cache.get<T>(
      cacheKey,
      () => apiClient.get<T>(endpoint, params as Record<string, string | number | boolean | undefined>),
      {
        ttl: options.ttl ?? CACHE_TTL.STANDARD,
        tags: options.tags,
        bypassCache: options.bypassCache,
        staleWhileRevalidate: options.staleWhileRevalidate,
      }
    );
  },

  /**
   * POST request (not cached by default, but invalidates related caches)
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    invalidateTags?: string[]
  ): Promise<T> {
    const result = await apiClient.post<T>(endpoint, data);

    // Invalidate related caches if tags provided
    if (invalidateTags && invalidateTags.length > 0) {
      const cache = getGlobalAPICache();
      cache.invalidate({ tags: invalidateTags });
    }

    return result;
  },

  /**
   * PUT request (not cached, invalidates related caches)
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    invalidateTags?: string[]
  ): Promise<T> {
    const result = await apiClient.put<T>(endpoint, data);

    // Invalidate related caches
    if (invalidateTags && invalidateTags.length > 0) {
      const cache = getGlobalAPICache();
      cache.invalidate({ tags: invalidateTags });
    }

    return result;
  },

  /**
   * DELETE request (not cached, invalidates related caches)
   */
  async delete<T>(
    endpoint: string,
    invalidateTags?: string[]
  ): Promise<T> {
    const result = await apiClient.delete<T>(endpoint);

    // Invalidate related caches
    if (invalidateTags && invalidateTags.length > 0) {
      const cache = getGlobalAPICache();
      cache.invalidate({ tags: invalidateTags });
    }

    return result;
  },

  /**
   * Prefetch data into cache
   */
  async prefetch<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    options: CachedRequestOptions = {}
  ): Promise<void> {
    const cache = getGlobalAPICache();
    const cacheKey = options.cacheKey || createCacheKey(endpoint, params);

    await cache.prefetch<T>(
      cacheKey,
      () => apiClient.get<T>(endpoint, params as Record<string, string | number | boolean | undefined>),
      { ttl: options.ttl ?? CACHE_TTL.STANDARD, tags: options.tags }
    );
  },

  /**
   * Check if data is cached
   */
  isCached(endpoint: string, params?: Record<string, unknown>): boolean {
    const cache = getGlobalAPICache();
    const cacheKey = createCacheKey(endpoint, params);
    return cache.has(cacheKey);
  },

  /**
   * Invalidate cached data
   */
  invalidate(options: {
    endpoint?: string;
    params?: Record<string, unknown>;
    pattern?: RegExp;
    tags?: string[];
    all?: boolean;
  }): number {
    const cache = getGlobalAPICache();

    if (options.endpoint) {
      const key = createCacheKey(options.endpoint, options.params);
      return cache.invalidate({ key });
    }

    return cache.invalidate({
      pattern: options.pattern,
      tags: options.tags,
      all: options.all,
    });
  },

  /**
   * Get cache metrics
   */
  getMetrics() {
    const cache = getGlobalAPICache();
    return cache.getMetrics();
  },

  /**
   * Get efficiency report
   */
  getEfficiencyReport() {
    const cache = getGlobalAPICache();
    return cache.getEfficiencyReport();
  },
};

/**
 * Predefined cache configurations for different data types
 */
export const CACHE_CONFIGS = {
  // Lists data - moderate caching
  lists: {
    ttl: CACHE_TTL.STANDARD,
    tags: ['lists'],
  },

  // Single list - shorter cache for detail views
  listDetail: {
    ttl: CACHE_TTL.MEDIUM,
    tags: ['list-detail'],
  },

  // Featured/trending - moderate cache
  featured: {
    ttl: CACHE_TTL.STANDARD,
    tags: ['featured', 'lists'],
  },

  // User data - shorter cache
  userData: {
    ttl: CACHE_TTL.SHORT,
    tags: ['user-data'],
  },

  // Item groups - longer cache (reference data)
  groups: {
    ttl: CACHE_TTL.LONG,
    tags: ['groups'],
  },

  // Items - longer cache (reference data)
  items: {
    ttl: CACHE_TTL.LONG,
    tags: ['items'],
  },

  // Categories - very long cache (mostly static)
  categories: {
    ttl: CACHE_TTL.STATIC,
    tags: ['categories'],
  },

  // Analytics - short cache (frequently updating)
  analytics: {
    ttl: CACHE_TTL.SHORT,
    tags: ['analytics'],
  },

  // Suggestions - medium cache
  suggestions: {
    ttl: CACHE_TTL.MEDIUM,
    tags: ['suggestions'],
  },
} as const;
