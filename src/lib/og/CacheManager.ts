/**
 * CacheManager for OG Cards
 * Handles caching of generated OG images with automatic invalidation
 */

import type {
  OGCacheEntry,
  OGCacheConfig,
  OGMetadata,
  RegenerationEvent,
} from './types';
import { DEFAULT_CACHE_CONFIG } from './types';
import { hashData } from './OGCardGenerator';

/**
 * In-memory cache storage
 */
class MemoryStorage {
  private cache: Map<string, OGCacheEntry> = new Map();

  get(key: string): OGCacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: OGCacheEntry): void {
    this.cache.set(key, value);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  entries(): Array<[string, OGCacheEntry]> {
    return Array.from(this.cache.entries());
  }
}

/**
 * OG Card Cache Manager
 * Manages caching of generated OG card images
 */
export class OGCacheManager {
  private storage: MemoryStorage;
  private config: OGCacheConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private regenerationListeners: Set<(event: RegenerationEvent) => void> = new Set();

  constructor(config: Partial<OGCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.storage = new MemoryStorage();

    if (this.config.autoCleanup) {
      this.startCleanup();
    }
  }

  /**
   * Get a cached OG card entry
   */
  get(key: string): OGCacheEntry | null {
    const entry = this.storage.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.storage.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Store an OG card entry in cache
   */
  set(
    key: string,
    imageUrl: string,
    dataHash: string,
    metadata: OGMetadata,
    ttl?: number
  ): OGCacheEntry {
    // Enforce max entries limit
    if (this.storage.size() >= this.config.maxEntries) {
      this.evictOldest();
    }

    const entry: OGCacheEntry = {
      key,
      imageUrl,
      createdAt: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      dataHash,
      metadata,
    };

    this.storage.set(key, entry);
    return entry;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): boolean {
    return this.storage.delete(key);
  }

  /**
   * Invalidate all cache entries for a share code
   */
  invalidateByShareCode(shareCode: string): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const key of this.storage.keys()) {
      if (key.startsWith(`og_${shareCode}_`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      if (this.storage.delete(key)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Check if data has changed and needs regeneration
   */
  needsRegeneration(key: string, newDataHash: string): boolean {
    const entry = this.get(key);

    if (!entry) {
      return true;
    }

    return entry.dataHash !== newDataHash;
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: OGCacheEntry): boolean {
    return Date.now() > entry.createdAt + entry.ttl;
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.storage.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.storage.delete(oldestKey);
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleanedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.storage.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      if (this.storage.delete(key)) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    maxEntries: number;
    hitRate: number;
    avgAge: number;
  } {
    const entries = Array.from(this.storage.entries());
    const now = Date.now();

    let totalAge = 0;
    for (const [, entry] of entries) {
      totalAge += now - entry.createdAt;
    }

    return {
      totalEntries: this.storage.size(),
      maxEntries: this.config.maxEntries,
      hitRate: 0, // Would need tracking to compute this
      avgAge: entries.length > 0 ? totalAge / entries.length : 0,
    };
  }

  /**
   * Subscribe to regeneration events
   */
  onRegeneration(listener: (event: RegenerationEvent) => void): () => void {
    this.regenerationListeners.add(listener);
    return () => this.regenerationListeners.delete(listener);
  }

  /**
   * Trigger a regeneration event
   */
  triggerRegeneration(
    shareCode: string,
    type: RegenerationEvent['type'],
    reason?: string
  ): void {
    const event: RegenerationEvent = {
      type,
      shareCode,
      timestamp: Date.now(),
      reason,
    };

    // Invalidate existing cache entries
    this.invalidateByShareCode(shareCode);

    // Notify listeners
    this.regenerationListeners.forEach(listener => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in regeneration listener:', e);
      }
    });
  }

  /**
   * Check if we have a valid cached entry for the given data
   */
  getValidEntry(shareCode: string, optionsHash: string, data: unknown): OGCacheEntry | null {
    const key = `og_${shareCode}_${optionsHash}`;
    const entry = this.get(key);

    if (!entry) {
      return null;
    }

    // Check if data has changed
    const currentHash = hashData(data);
    if (entry.dataHash !== currentHash) {
      // Data has changed, invalidate and return null
      this.invalidate(key);
      this.triggerRegeneration(shareCode, 'data_change', 'Source data has changed');
      return null;
    }

    return entry;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
    this.regenerationListeners.clear();
  }
}

/**
 * Singleton cache manager instance
 */
let cacheManagerInstance: OGCacheManager | null = null;

export function getOGCacheManager(): OGCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new OGCacheManager();
  }
  return cacheManagerInstance;
}

/**
 * Create a new cache manager with custom config
 */
export function createOGCacheManager(config: Partial<OGCacheConfig>): OGCacheManager {
  return new OGCacheManager(config);
}
