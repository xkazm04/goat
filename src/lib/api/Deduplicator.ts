/**
 * Deduplicator - Prevents duplicate concurrent API requests
 *
 * When multiple components request the same data simultaneously,
 * the Deduplicator ensures only one request is made and all callers
 * receive the same result (promise coalescing).
 */

export interface DeduplicatorOptions {
  /** Maximum age for dedup entries in ms (default: 5000) */
  maxAge?: number;
  /** Whether to log deduplication events (default: false in production) */
  debug?: boolean;
  /** Custom key generator function */
  keyGenerator?: (endpoint: string, params?: unknown) => string;
}

export interface DeduplicatorStats {
  /** Total requests made */
  totalRequests: number;
  /** Requests that were deduplicated */
  deduplicatedRequests: number;
  /** Currently pending requests */
  pendingRequests: number;
  /** Deduplication rate (0-1) */
  deduplicationRate: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  subscribers: number;
}

const DEFAULT_OPTIONS: Required<DeduplicatorOptions> = {
  maxAge: 5000,
  debug: process.env.NODE_ENV !== 'production',
  keyGenerator: defaultKeyGenerator,
};

/**
 * Default key generator - creates a stable key from endpoint and params
 */
function defaultKeyGenerator(endpoint: string, params?: unknown): string {
  if (!params) return endpoint;

  try {
    // Sort object keys for consistent hashing
    const sortedParams = sortObject(params);
    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  } catch {
    // Fallback for non-serializable params
    return `${endpoint}:${String(params)}`;
  }
}

/**
 * Recursively sort object keys for consistent serialization
 */
function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();

  for (const key of keys) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  }

  return sorted;
}

/**
 * Deduplicator class for managing concurrent request deduplication
 *
 * @example
 * ```ts
 * const deduplicator = new Deduplicator();
 *
 * // Multiple calls to the same endpoint will share one request
 * const [result1, result2] = await Promise.all([
 *   deduplicator.dedupe('/api/users', { id: 1 }, () => fetch('/api/users?id=1')),
 *   deduplicator.dedupe('/api/users', { id: 1 }, () => fetch('/api/users?id=1')),
 * ]);
 *
 * // Only one fetch was made, both get the same result
 * ```
 */
export class Deduplicator {
  private options: Required<DeduplicatorOptions>;
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();
  private stats: DeduplicatorStats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    pendingRequests: 0,
    deduplicationRate: 0,
  };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: DeduplicatorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Start cleanup interval
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.options.maxAge);
    }
  }

  /**
   * Deduplicate a request - if an identical request is pending, return its promise
   */
  async dedupe<T>(
    endpoint: string,
    params: unknown | undefined,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.options.keyGenerator(endpoint, params);
    this.stats.totalRequests++;

    // Check for pending request
    const pending = this.pendingRequests.get(key) as PendingRequest<T> | undefined;

    if (pending && Date.now() - pending.timestamp < this.options.maxAge) {
      pending.subscribers++;
      this.stats.deduplicatedRequests++;
      this.updateDeduplicationRate();

      if (this.options.debug) {
        console.log(`⚡ [Deduplicator] Deduped request: ${endpoint} (${pending.subscribers} subscribers)`);
      }

      return pending.promise;
    }

    // Create new pending request
    const promise = fetcher().finally(() => {
      // Remove from pending after a short delay to catch late duplicates
      setTimeout(() => {
        const current = this.pendingRequests.get(key);
        if (current?.promise === promise) {
          this.pendingRequests.delete(key);
          this.stats.pendingRequests = this.pendingRequests.size;
        }
      }, 50);
    });

    this.pendingRequests.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
      subscribers: 1,
    });

    this.stats.pendingRequests = this.pendingRequests.size;

    if (this.options.debug) {
      console.log(`🌐 [Deduplicator] New request: ${endpoint}`);
    }

    return promise;
  }

  /**
   * Check if a request is currently pending
   */
  isPending(endpoint: string, params?: unknown): boolean {
    const key = this.options.keyGenerator(endpoint, params);
    const pending = this.pendingRequests.get(key);
    return pending !== undefined && Date.now() - pending.timestamp < this.options.maxAge;
  }

  /**
   * Get the pending promise for a request, if any
   */
  getPending<T>(endpoint: string, params?: unknown): Promise<T> | null {
    const key = this.options.keyGenerator(endpoint, params);
    const pending = this.pendingRequests.get(key) as PendingRequest<T> | undefined;

    if (pending && Date.now() - pending.timestamp < this.options.maxAge) {
      return pending.promise;
    }

    return null;
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DeduplicatorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      pendingRequests: this.pendingRequests.size,
      deduplicationRate: 0,
    };
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
    this.stats.pendingRequests = 0;
  }

  /**
   * Dispose the deduplicator and clean up
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Generate a deduplication key
   */
  generateKey(endpoint: string, params?: unknown): string {
    return this.options.keyGenerator(endpoint, params);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    Array.from(this.pendingRequests.entries()).forEach(([key, pending]) => {
      if (now - pending.timestamp >= this.options.maxAge) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.stats.pendingRequests = this.pendingRequests.size;

      if (this.options.debug) {
        console.log(`🧹 [Deduplicator] Cleaned ${cleaned} stale entries`);
      }
    }
  }

  private updateDeduplicationRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.deduplicationRate =
        this.stats.deduplicatedRequests / this.stats.totalRequests;
    }
  }
}

// Singleton instance
let globalDeduplicator: Deduplicator | null = null;

/**
 * Get the global Deduplicator instance
 */
export function getGlobalDeduplicator(options?: DeduplicatorOptions): Deduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new Deduplicator(options);
  }
  return globalDeduplicator;
}

/**
 * Reset the global Deduplicator (mainly for testing)
 */
export function resetGlobalDeduplicator(): void {
  if (globalDeduplicator) {
    globalDeduplicator.dispose();
    globalDeduplicator = null;
  }
}
