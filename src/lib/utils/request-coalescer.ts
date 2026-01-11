/**
 * Request Coalescer
 *
 * De-duplicates and batches simultaneous API requests within a configurable debounce window.
 * Ensures a single network call for multiple identical requests and broadcasts the response
 * to all subscribers.
 *
 * Performance Benefits:
 * - Reduces network traffic and API load
 * - Ensures data consistency across consumers
 * - Improves DND responsiveness by eliminating redundant fetches
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  subscribers: number;
}

interface CoalescerStats {
  totalRequests: number;
  coalescedRequests: number;
  activeBatches: number;
  averageSubscribers: number;
  cacheHits: number;
  totalLatency: number;
  requestCount: number;
  avgLatency: number;
}

export interface CoalescerConfig {
  /** Debounce window in milliseconds (default: 50ms) */
  debounceMs?: number;
  /** Enable performance logging (default: false) */
  enableLogging?: boolean;
  /** Cache TTL in milliseconds (default: 5000ms) */
  cacheTTL?: number;
  /** Log prefix for debugging (default: 'RequestCoalescer') */
  logPrefix?: string;
}

/**
 * RequestCoalescer - Batches and de-duplicates API requests
 *
 * @example
 * const coalescer = new RequestCoalescer({ debounceMs: 50 });
 *
 * // Multiple simultaneous calls get coalesced into one
 * const [result1, result2, result3] = await Promise.all([
 *   coalescer.coalesce('category-sports', () => fetch('/api/groups?category=sports')),
 *   coalescer.coalesce('category-sports', () => fetch('/api/groups?category=sports')),
 *   coalescer.coalesce('category-sports', () => fetch('/api/groups?category=sports'))
 * ]);
 * // Only 1 network request made, all 3 calls get the same result
 */
export class RequestCoalescer<T = any> {
  private pendingRequests = new Map<string, PendingRequest<T>>();
  private requestCache = new Map<string, { value: T; timestamp: number }>();
  private stats: CoalescerStats = {
    totalRequests: 0,
    coalescedRequests: 0,
    activeBatches: 0,
    averageSubscribers: 0,
    cacheHits: 0,
    totalLatency: 0,
    requestCount: 0,
    avgLatency: 0,
  };

  private config: Required<CoalescerConfig>;

  constructor(config: CoalescerConfig = {}) {
    this.config = {
      debounceMs: config.debounceMs ?? 50,
      enableLogging: config.enableLogging ?? false,
      cacheTTL: config.cacheTTL ?? 5000,
      logPrefix: config.logPrefix ?? 'RequestCoalescer',
    };
  }

  /**
   * Coalesce a request - if an identical request is pending, subscribe to it.
   * Otherwise, start a new request and allow others to subscribe.
   *
   * @param key - Unique identifier for this request (e.g., 'category-sports')
   * @param fetcher - Function that performs the actual API call
   * @returns Promise that resolves with the fetched data
   */
  async coalesce(key: string, fetcher: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check cache first
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      this.stats.cacheHits++;
      this.log(`🎯 Cache hit for key: ${key}`);
      return cached.value;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.stats.coalescedRequests++;
      pending.subscribers++;

      this.log(`🔄 Coalescing request for key: ${key} (${pending.subscribers} subscribers)`);
      return pending.promise;
    }

    // Create a new request
    this.log(`🚀 Starting new request for key: ${key}`);

    let resolveFunc: (value: T) => void;
    let rejectFunc: (error: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    const pendingRequest: PendingRequest<T> = {
      promise,
      resolve: resolveFunc!,
      reject: rejectFunc!,
      timestamp: Date.now(),
      subscribers: 1,
    };

    this.pendingRequests.set(key, pendingRequest);
    this.stats.activeBatches = this.pendingRequests.size;

    // Execute the fetcher after debounce window
    setTimeout(async () => {
      try {
        const startTime = performance.now();
        const result = await fetcher();
        const duration = performance.now() - startTime;

        // Cache the result
        this.requestCache.set(key, { value: result, timestamp: Date.now() });

        // Update stats
        const totalSubs = pendingRequest.subscribers;
        this.stats.averageSubscribers =
          (this.stats.averageSubscribers * (this.stats.totalRequests - totalSubs) + totalSubs * totalSubs) /
          this.stats.totalRequests;

        // Track latency metrics
        this.stats.totalLatency += duration;
        this.stats.requestCount++;
        this.stats.avgLatency = this.stats.totalLatency / this.stats.requestCount;

        this.log(
          `✅ Request completed for key: ${key} in ${duration.toFixed(2)}ms ` +
          `(${totalSubs} subscriber${totalSubs > 1 ? 's' : ''})`
        );

        // Resolve all subscribers
        pendingRequest.resolve(result);
      } catch (error) {
        this.log(`❌ Request failed for key: ${key}`, error);
        pendingRequest.reject(error);
      } finally {
        // Clean up
        this.pendingRequests.delete(key);
        this.stats.activeBatches = this.pendingRequests.size;
      }
    }, this.config.debounceMs);

    return promise;
  }

  /**
   * Manually invalidate cache for a specific key or all keys
   */
  invalidateCache(key?: string): void {
    if (key) {
      this.requestCache.delete(key);
      this.log(`🗑️ Cache invalidated for key: ${key}`);
    } else {
      this.requestCache.clear();
      this.log(`🗑️ All cache cleared`);
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CoalescerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      coalescedRequests: 0,
      activeBatches: this.pendingRequests.size,
      averageSubscribers: 0,
      cacheHits: 0,
      totalLatency: 0,
      requestCount: 0,
      avgLatency: 0,
    };
    this.log(`📊 Stats reset`);
  }

  /**
   * Get efficiency metrics
   */
  getEfficiency(): {
    coalescingRate: number;
    cacheHitRate: number;
    networkSavings: number;
  } {
    const coalescingRate = this.stats.totalRequests > 0
      ? (this.stats.coalescedRequests / this.stats.totalRequests) * 100
      : 0;

    const cacheHitRate = this.stats.totalRequests > 0
      ? (this.stats.cacheHits / this.stats.totalRequests) * 100
      : 0;

    const networkSavings = this.stats.coalescedRequests + this.stats.cacheHits;

    return {
      coalescingRate,
      cacheHitRate,
      networkSavings,
    };
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[${this.config.logPrefix}] ${message}`, ...args);
    }
  }
}

/**
 * Create a singleton coalescer instance for backlog requests
 */
export const createBacklogCoalescer = () => {
  return new RequestCoalescer<any>({
    debounceMs: 50,
    enableLogging: true,
    cacheTTL: 5000,
    logPrefix: '🔄 BacklogCoalescer',
  });
};
