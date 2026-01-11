/**
 * Intelligent API Cache Layer
 *
 * A sophisticated caching system for API responses with:
 * - Configurable TTL (Time To Live) for different data types
 * - Automatic cache invalidation strategies
 * - Comprehensive performance metrics
 * - Request deduplication (in-flight request sharing)
 * - LRU eviction when memory limits are reached
 * - Cache warming and prefetching capabilities
 *
 * @example
 * const cache = new APICache({ maxEntries: 100 });
 * const data = await cache.get('users-list', () => fetchUsers(), { ttl: 60000 });
 */

export type CacheTTL = 'short' | 'medium' | 'standard' | 'long' | 'static';

export interface CacheConfig {
  /** Maximum number of cache entries (default: 200) */
  maxEntries?: number;
  /** Enable debug logging (default: false in production) */
  enableLogging?: boolean;
  /** Custom TTL values in milliseconds */
  ttlValues?: Partial<Record<CacheTTL, number>>;
  /** Log prefix for debugging */
  logPrefix?: string;
  /** Enable metrics collection (default: true) */
  enableMetrics?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  size: number; // Estimated size in bytes
  tags: string[];
}

export interface CacheOptions {
  /** TTL preset or custom milliseconds */
  ttl?: CacheTTL | number;
  /** Tags for grouped invalidation */
  tags?: string[];
  /** Skip cache and always fetch fresh */
  bypassCache?: boolean;
  /** Force cache refresh but return cached while fetching */
  staleWhileRevalidate?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  evictions: number;
  currentEntries: number;
  totalSize: number;
  averageEntryAge: number;
  coalescedRequests: number;
  networkSavings: number;
  byEndpoint: Map<string, { hits: number; misses: number; avgLatency: number }>;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  subscribers: number;
}

// Default TTL values (in milliseconds)
const DEFAULT_TTL_VALUES: Record<CacheTTL, number> = {
  short: 30 * 1000,        // 30 seconds - rapidly changing data
  medium: 2 * 60 * 1000,   // 2 minutes - frequently changing
  standard: 5 * 60 * 1000, // 5 minutes - standard cache
  long: 15 * 60 * 1000,    // 15 minutes - rarely changing
  static: 60 * 60 * 1000,  // 1 hour - static/reference data
};

/**
 * Intelligent API Cache with TTL, LRU eviction, and comprehensive metrics
 */
export class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private accessOrder: string[] = [];
  private config: Required<CacheConfig>;
  private ttlValues: Record<CacheTTL, number>;
  private metrics: CacheMetrics;
  private endpointStats = new Map<string, { hits: number; misses: number; totalLatency: number; requestCount: number }>();

  constructor(config: CacheConfig = {}) {
    const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

    this.config = {
      maxEntries: config.maxEntries ?? 200,
      enableLogging: config.enableLogging ?? isDev,
      ttlValues: config.ttlValues ?? {},
      logPrefix: config.logPrefix ?? '📦 APICache',
      enableMetrics: config.enableMetrics ?? true,
    };

    this.ttlValues = {
      ...DEFAULT_TTL_VALUES,
      ...this.config.ttlValues,
    };

    this.metrics = this.createEmptyMetrics();

    // Expose cache for debugging in development
    if (typeof window !== 'undefined' && isDev) {
      (window as unknown as Record<string, unknown>).__apiCache = this;
    }
  }

  /**
   * Get data from cache or fetch from API
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const startTime = performance.now();
    const endpoint = this.extractEndpoint(key);

    this.metrics.totalRequests++;

    // Check for bypass
    if (options.bypassCache) {
      this.log(`🔄 Bypassing cache for: ${key}`);
      return this.fetchAndCache(key, fetcher, options);
    }

    // Check cache
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    if (cached) {
      const now = Date.now();

      // Valid cache hit
      if (now < cached.expiresAt) {
        this.recordHit(endpoint, startTime);
        cached.accessCount++;
        cached.lastAccessedAt = now;
        this.updateAccessOrder(key);

        this.log(`✅ Cache HIT for: ${key} (${cached.accessCount} accesses)`);

        // Stale-while-revalidate: return cached but refresh in background
        if (options.staleWhileRevalidate) {
          this.refreshInBackground(key, fetcher, options);
        }

        return cached.data;
      }

      // Expired entry - check for stale-while-revalidate
      if (options.staleWhileRevalidate) {
        this.log(`♻️ Stale cache for: ${key}, returning stale and revalidating`);
        this.refreshInBackground(key, fetcher, options);
        return cached.data;
      }

      // Expired - remove and fetch fresh
      this.cache.delete(key);
      this.log(`⏰ Cache expired for: ${key}`);
    }

    // Cache miss
    this.recordMiss(endpoint, startTime);
    this.log(`❌ Cache MISS for: ${key}`);

    return this.fetchAndCache(key, fetcher, options);
  }

  /**
   * Fetch data and store in cache (with request deduplication)
   */
  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    // Check for in-flight request (request deduplication)
    const pending = this.pendingRequests.get(key) as PendingRequest<T> | undefined;
    if (pending) {
      pending.subscribers++;
      this.metrics.coalescedRequests++;
      this.log(`🔗 Coalescing request for: ${key} (${pending.subscribers} subscribers)`);
      return pending.promise;
    }

    // Create new request
    const promise = (async () => {
      try {
        const data = await fetcher();
        this.set(key, data, options);
        return data;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
      subscribers: 1,
    });

    return promise;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    // Evict if at capacity
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const ttl = this.resolveTTL(options.ttl);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessedAt: now,
      size: this.estimateSize(data),
      tags: options.tags || [],
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    this.updateAccessOrder(key);

    this.log(`💾 Cached: ${key} (TTL: ${Math.round(ttl / 1000)}s, size: ${this.formatBytes(entry.size)})`);
  }

  /**
   * Invalidate cache entries by key, pattern, or tags
   */
  invalidate(options: {
    key?: string;
    pattern?: RegExp;
    tags?: string[];
    all?: boolean;
  }): number {
    let invalidatedCount = 0;

    if (options.all) {
      invalidatedCount = this.cache.size;
      this.cache.clear();
      this.accessOrder = [];
      this.log(`🗑️ Invalidated ALL cache (${invalidatedCount} entries)`);
      return invalidatedCount;
    }

    if (options.key) {
      if (this.cache.delete(options.key)) {
        invalidatedCount++;
        this.removeFromAccessOrder(options.key);
      }
    }

    if (options.pattern) {
      const keys = Array.from(this.cache.keys());
      for (const key of keys) {
        if (options.pattern.test(key)) {
          this.cache.delete(key);
          this.removeFromAccessOrder(key);
          invalidatedCount++;
        }
      }
    }

    if (options.tags && options.tags.length > 0) {
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        const hasMatchingTag = options.tags.some(tag => entry.tags.includes(tag));
        if (hasMatchingTag) {
          this.cache.delete(key);
          this.removeFromAccessOrder(key);
          invalidatedCount++;
        }
      }
    }

    if (invalidatedCount > 0) {
      this.log(`🗑️ Invalidated ${invalidatedCount} cache entries`);
    }

    return invalidatedCount;
  }

  /**
   * Prefetch and cache data in the background
   */
  async prefetch<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<void> {
    // Don't prefetch if already cached and valid
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      this.log(`📥 Skip prefetch, already cached: ${key}`);
      return;
    }

    this.log(`📥 Prefetching: ${key}`);
    try {
      await this.get(key, fetcher, options);
    } catch (error) {
      this.log(`⚠️ Prefetch failed for: ${key}`, error);
    }
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    // Transform endpointStats to include avgLatency
    const byEndpoint = new Map<string, { hits: number; misses: number; avgLatency: number }>();
    for (const [endpoint, stats] of Array.from(this.endpointStats.entries())) {
      byEndpoint.set(endpoint, {
        hits: stats.hits,
        misses: stats.misses,
        avgLatency: stats.requestCount > 0 ? stats.totalLatency / stats.requestCount : 0,
      });
    }

    return {
      ...this.metrics,
      hitRate: this.metrics.totalRequests > 0
        ? (this.metrics.hits / this.metrics.totalRequests) * 100
        : 0,
      currentEntries: this.cache.size,
      totalSize: this.calculateTotalSize(),
      averageEntryAge: this.calculateAverageAge(),
      networkSavings: this.metrics.hits + this.metrics.coalescedRequests,
      byEndpoint,
    };
  }

  /**
   * Get efficiency report
   */
  getEfficiencyReport(): {
    hitRate: string;
    cacheSavings: string;
    coalescingRate: string;
    memoryUsage: string;
    topEndpoints: Array<{ endpoint: string; hitRate: number; requests: number }>;
  } {
    const metrics = this.getMetrics();

    const topEndpoints = Array.from(this.endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        hitRate: stats.requestCount > 0 ? (stats.hits / stats.requestCount) * 100 : 0,
        requests: stats.requestCount,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      hitRate: `${metrics.hitRate.toFixed(1)}%`,
      cacheSavings: `${metrics.networkSavings} requests saved`,
      coalescingRate: metrics.totalRequests > 0
        ? `${((metrics.coalescedRequests / metrics.totalRequests) * 100).toFixed(1)}%`
        : '0%',
      memoryUsage: this.formatBytes(metrics.totalSize),
      topEndpoints,
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics = this.createEmptyMetrics();
    this.endpointStats.clear();
    this.log(`📊 Metrics reset`);
  }

  /**
   * Check if a key is in cache and not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache entry info without updating access stats
   */
  peek(key: string): CacheEntry<unknown> | undefined {
    return this.cache.get(key);
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  // Private helpers

  private resolveTTL(ttl?: CacheTTL | number): number {
    if (typeof ttl === 'number') return ttl;
    if (ttl && ttl in this.ttlValues) return this.ttlValues[ttl];
    return this.ttlValues.standard;
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
      this.metrics.evictions++;
      this.log(`🗑️ Evicted LRU entry: ${lruKey}`);
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private refreshInBackground<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions): void {
    // Refresh in background without blocking
    setTimeout(async () => {
      try {
        const data = await fetcher();
        this.set(key, data, options);
        this.log(`🔄 Background refresh complete: ${key}`);
      } catch (error) {
        this.log(`⚠️ Background refresh failed: ${key}`, error);
      }
    }, 0);
  }

  private recordHit(endpoint: string, startTime: number): void {
    this.metrics.hits++;

    const stats = this.endpointStats.get(endpoint) || { hits: 0, misses: 0, totalLatency: 0, requestCount: 0 };
    stats.hits++;
    stats.requestCount++;
    stats.totalLatency += performance.now() - startTime;
    this.endpointStats.set(endpoint, stats);
  }

  private recordMiss(endpoint: string, startTime: number): void {
    this.metrics.misses++;

    const stats = this.endpointStats.get(endpoint) || { hits: 0, misses: 0, totalLatency: 0, requestCount: 0 };
    stats.misses++;
    stats.requestCount++;
    stats.totalLatency += performance.now() - startTime;
    this.endpointStats.set(endpoint, stats);
  }

  private extractEndpoint(key: string): string {
    // Extract endpoint from cache key (e.g., "api:/lists?page=1" -> "/lists")
    const match = key.match(/^[^:]+:([^?]+)/);
    return match ? match[1] : key.split('?')[0];
  }

  private estimateSize(data: unknown): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  private calculateTotalSize(): number {
    let total = 0;
    const values = Array.from(this.cache.values());
    for (const entry of values) {
      total += entry.size;
    }
    return total;
  }

  private calculateAverageAge(): number {
    if (this.cache.size === 0) return 0;
    const now = Date.now();
    let totalAge = 0;
    const values = Array.from(this.cache.values());
    for (const entry of values) {
      totalAge += now - entry.createdAt;
    }
    return totalAge / this.cache.size;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private createEmptyMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      evictions: 0,
      currentEntries: 0,
      totalSize: 0,
      averageEntryAge: 0,
      coalescedRequests: 0,
      networkSavings: 0,
      byEndpoint: new Map(),
    };
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.enableLogging) {
      console.log(`[${this.config.logPrefix}] ${message}`, ...args);
    }
  }
}

// Singleton instance for global use
let globalCacheInstance: APICache | null = null;

export function getGlobalAPICache(): APICache {
  if (!globalCacheInstance) {
    globalCacheInstance = new APICache({
      maxEntries: 200,
      enableLogging: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
      logPrefix: '📦 GlobalAPICache',
    });
  }
  return globalCacheInstance;
}

/**
 * Create a cache key from endpoint and parameters
 */
export function createCacheKey(endpoint: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) {
    return `api:${endpoint}`;
  }

  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .sort()
    .map(key => `${key}=${String(params[key])}`)
    .join('&');

  return sortedParams ? `api:${endpoint}?${sortedParams}` : `api:${endpoint}`;
}

// Export cache TTL presets for use in hooks
export const CACHE_TTL = {
  SHORT: 'short' as CacheTTL,
  MEDIUM: 'medium' as CacheTTL,
  STANDARD: 'standard' as CacheTTL,
  LONG: 'long' as CacheTTL,
  STATIC: 'static' as CacheTTL,
} as const;
