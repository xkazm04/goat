/**
 * PrefetchManager
 *
 * Central orchestrator for all prefetching activities.
 * Coordinates between different prefetch triggers, manages the priority queue,
 * respects bandwidth constraints, and tracks analytics.
 *
 * This is the main entry point for the prefetching system.
 */

import { QueryClient } from '@tanstack/react-query';

import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';

import { BandwidthDetector, type PrefetchStrategy, type NetworkConditions } from './BandwidthDetector';
import { PredictionEngine, type UserBehaviorEvent } from './PredictionEngine';
import { PriorityQueue, type PrefetchPriority, type PrefetchRequest } from './PriorityQueue';

export interface PrefetchConfig {
  /** Whether prefetching is enabled */
  enabled: boolean;
  /** Maximum concurrent prefetch requests */
  maxConcurrent: number;
  /** Whether to respect bandwidth constraints */
  respectBandwidth: boolean;
  /** Whether to track analytics */
  trackAnalytics: boolean;
  /** Debug logging */
  debug: boolean;
}

export interface PrefetchTarget {
  /** Unique identifier */
  id: string;
  /** Query key for React Query */
  queryKey: readonly unknown[];
  /** Function to fetch the data */
  queryFn: () => Promise<unknown>;
  /** Stale time override */
  staleTime?: number;
  /** Priority level */
  priority?: PrefetchPriority;
  /** Source of the prefetch request */
  source?: 'hover' | 'route' | 'scroll' | 'prediction';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface PrefetchAnalytics {
  /** Total prefetch requests queued */
  totalQueued: number;
  /** Successfully completed prefetches */
  completed: number;
  /** Failed prefetches */
  failed: number;
  /** Prefetches that were used (cache hit after prefetch) */
  hits: number;
  /** Prefetches that expired unused */
  unused: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Breakdown by source */
  bySource: Record<string, { queued: number; completed: number; hits: number }>;
  /** Bandwidth-based skips */
  bandwidthSkips: number;
}

const DEFAULT_CONFIG: PrefetchConfig = {
  enabled: true,
  maxConcurrent: 3,
  respectBandwidth: true,
  trackAnalytics: true,
  debug: process.env.NODE_ENV === 'development',
};

/** Max entries in prefetchedKeys before eviction kicks in */
const MAX_PREFETCHED_KEYS = 500;

class PrefetchManagerClass {
  private static instance: PrefetchManagerClass | null = null;
  private queryClient: QueryClient | null = null;
  private config: PrefetchConfig = DEFAULT_CONFIG;
  private queue: PriorityQueue<void>;
  private analytics: PrefetchAnalytics;
  private prefetchedKeys: Map<string, { timestamp: number; source: string }> = new Map();
  private bandwidthUnsubscribe?: () => void;
  private isInitialized: boolean = false;

  private constructor() {
    this.queue = new PriorityQueue({
      maxSize: 50,
      maxConcurrent: this.config.maxConcurrent,
      onDrain: () => this.log('Queue drained'),
    });

    this.analytics = this.createEmptyAnalytics();
  }

  static getInstance(): PrefetchManagerClass {
    if (!PrefetchManagerClass.instance) {
      PrefetchManagerClass.instance = new PrefetchManagerClass();
    }
    return PrefetchManagerClass.instance;
  }

  /**
   * Initialize the prefetch manager with a QueryClient
   */
  initialize(queryClient: QueryClient, config?: Partial<PrefetchConfig>): void {
    if (this.isInitialized) {
      this.log('Already initialized');
      return;
    }

    this.queryClient = queryClient;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Subscribe to bandwidth changes
    if (this.config.respectBandwidth) {
      this.bandwidthUnsubscribe = BandwidthDetector.subscribe(
        this.handleNetworkChange.bind(this)
      );
    }

    // Adjust concurrent requests based on initial network state
    this.adjustForNetwork();

    this.isInitialized = true;
    this.log('Initialized', this.config);
  }

  private createEmptyAnalytics(): PrefetchAnalytics {
    return {
      totalQueued: 0,
      completed: 0,
      failed: 0,
      hits: 0,
      unused: 0,
      hitRate: 0,
      bySource: {},
      bandwidthSkips: 0,
    };
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[PrefetchManager]', ...args);
    }
  }

  private handleNetworkChange(conditions: NetworkConditions): void {
    this.log('Network changed:', conditions);
    this.adjustForNetwork(conditions);
  }

  private adjustForNetwork(conditions?: NetworkConditions): void {
    const network = conditions || BandwidthDetector.getNetworkConditions();

    if (network.shouldPausePrefetch) {
      this.queue.pause();
      this.log('Prefetching paused due to network conditions');
    } else {
      this.queue.setMaxConcurrent(network.maxConcurrentPrefetches);
      this.log(`Concurrent limit set to ${network.maxConcurrentPrefetches}`);
    }
  }

  /**
   * Check if prefetching should be allowed
   */
  shouldPrefetch(): boolean {
    if (!this.config.enabled) return false;
    if (!this.queryClient) return false;
    if (this.config.respectBandwidth && !BandwidthDetector.shouldAllowPrefetch()) {
      return false;
    }
    return true;
  }

  /**
   * Prefetch a single target
   */
  prefetch(target: PrefetchTarget): boolean {
    if (!this.shouldPrefetch()) {
      this.analytics.bandwidthSkips++;
      return false;
    }

    if (!this.queryClient) {
      this.log('QueryClient not initialized');
      return false;
    }

    // Evict stale/overflow entries to prevent unbounded growth
    if (this.prefetchedKeys.size >= MAX_PREFETCHED_KEYS) {
      this.evictStalePrefetchKeys();
    }

    // Check if already cached and fresh
    const cacheKey = JSON.stringify(target.queryKey);
    const existingData = this.queryClient.getQueryData(target.queryKey);
    if (existingData) {
      const state = this.queryClient.getQueryState(target.queryKey);
      if (state && !state.isInvalidated && state.dataUpdatedAt > Date.now() - (target.staleTime ?? CACHE_TTL_MS.STANDARD)) {
        this.log('Data already fresh in cache:', target.id);
        return false;
      }
    }

    const request: Omit<PrefetchRequest<void>, 'timestamp'> = {
      id: target.id,
      priority: target.priority ?? 'medium',
      execute: async () => {
        await this.queryClient!.prefetchQuery({
          queryKey: target.queryKey,
          queryFn: target.queryFn,
          staleTime: target.staleTime ?? CACHE_TTL_MS.STANDARD,
        });
      },
      onComplete: () => {
        this.handlePrefetchComplete(target);
      },
      onError: (error) => {
        this.handlePrefetchError(target, error);
      },
      metadata: {
        source: target.source,
        dataType: target.metadata?.dataType as string | undefined,
      },
    };

    const enqueued = this.queue.enqueue(request);

    if (enqueued) {
      this.analytics.totalQueued++;
      this.trackBySource(target.source ?? 'unknown', 'queued');
      this.prefetchedKeys.set(cacheKey, {
        timestamp: Date.now(),
        source: target.source ?? 'unknown',
      });
      this.log('Enqueued:', target.id, 'priority:', target.priority);
    }

    return enqueued;
  }

  /**
   * Prefetch multiple targets
   */
  prefetchMany(targets: PrefetchTarget[]): number {
    let enqueued = 0;
    for (const target of targets) {
      if (this.prefetch(target)) {
        enqueued++;
      }
    }
    return enqueued;
  }

  private handlePrefetchComplete(target: PrefetchTarget): void {
    this.analytics.completed++;
    this.trackBySource(target.source ?? 'unknown', 'completed');
    this.log('Completed:', target.id);
  }

  private handlePrefetchError(target: PrefetchTarget, error: Error): void {
    this.analytics.failed++;
    this.log('Failed:', target.id, error.message);
  }

  private trackBySource(source: string, type: 'queued' | 'completed' | 'hits'): void {
    if (!this.config.trackAnalytics) return;

    if (!this.analytics.bySource[source]) {
      this.analytics.bySource[source] = { queued: 0, completed: 0, hits: 0 };
    }

    this.analytics.bySource[source][type]++;
    this.updateHitRate();
  }

  /**
   * Record that a prefetched query was used (cache hit)
   */
  recordHit(queryKey: readonly unknown[]): void {
    const cacheKey = JSON.stringify(queryKey);
    const prefetchInfo = this.prefetchedKeys.get(cacheKey);

    if (prefetchInfo) {
      this.analytics.hits++;
      this.trackBySource(prefetchInfo.source, 'hits');
      this.prefetchedKeys.delete(cacheKey);
      this.log('Cache hit for prefetched data:', cacheKey);
    }
  }

  private updateHitRate(): void {
    const { completed, hits } = this.analytics;
    this.analytics.hitRate = completed > 0 ? (hits / completed) * 100 : 0;
  }

  /**
   * Evict expired entries from prefetchedKeys, then drop oldest if still over cap.
   */
  private evictStalePrefetchKeys(): void {
    const now = Date.now();
    const expiryThreshold = CACHE_TTL_MS.STANDARD;
    const expiredKeys: string[] = [];

    // First pass: collect expired entries
    this.prefetchedKeys.forEach((info, key) => {
      if (now - info.timestamp > expiryThreshold) {
        this.analytics.unused++;
        expiredKeys.push(key);
      }
    });
    expiredKeys.forEach((key) => this.prefetchedKeys.delete(key));

    // Second pass: if still over cap, drop oldest entries
    if (this.prefetchedKeys.size > MAX_PREFETCHED_KEYS) {
      const entries: Array<[string, { timestamp: number }]> = [];
      this.prefetchedKeys.forEach((info, key) => entries.push([key, info]));
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const removeCount = this.prefetchedKeys.size - MAX_PREFETCHED_KEYS;
      for (let i = 0; i < removeCount; i++) {
        this.analytics.unused++;
        this.prefetchedKeys.delete(entries[i][0]);
      }
    }
  }

  /**
   * Record a user behavior event for prediction
   */
  recordBehavior(event: Omit<UserBehaviorEvent, 'timestamp'>): void {
    PredictionEngine.recordEvent(event);
  }

  /**
   * Get prefetch predictions based on user behavior
   */
  getPredictions(currentRoute: string) {
    return PredictionEngine.getPredictions(currentRoute);
  }

  /**
   * Cancel a pending prefetch
   */
  cancel(id: string): void {
    this.queue.cancel(id);
    this.log('Cancelled:', id);
  }

  /**
   * Cancel all pending prefetches
   */
  cancelAll(): void {
    this.queue.clear();
    this.log('Cancelled all pending prefetches');
  }

  /**
   * Pause prefetching
   */
  pause(): void {
    this.queue.pause();
    this.log('Prefetching paused');
  }

  /**
   * Resume prefetching
   */
  resume(): void {
    const maxConcurrent = this.config.respectBandwidth
      ? BandwidthDetector.getMaxConcurrentPrefetches()
      : this.config.maxConcurrent;

    this.queue.resume(maxConcurrent);
    this.log('Prefetching resumed with max concurrent:', maxConcurrent);
  }

  /**
   * Get current analytics
   */
  getAnalytics(): PrefetchAnalytics {
    // Update unused count based on expired prefetched keys
    const now = Date.now();
    const expiryThreshold = CACHE_TTL_MS.STANDARD;
    const keysToDelete: string[] = [];

    this.prefetchedKeys.forEach((info, key) => {
      if (now - info.timestamp > expiryThreshold) {
        this.analytics.unused++;
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.prefetchedKeys.delete(key));

    return { ...this.analytics };
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    this.analytics = this.createEmptyAnalytics();
    this.prefetchedKeys.clear();
    this.log('Analytics reset');
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queue.getStats();
  }

  /**
   * Get network conditions
   */
  getNetworkConditions(): NetworkConditions {
    return BandwidthDetector.getNetworkConditions();
  }

  /**
   * Get current prefetch strategy
   */
  getStrategy(): PrefetchStrategy {
    return BandwidthDetector.getStrategy();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PrefetchConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.maxConcurrent) {
      this.queue.setMaxConcurrent(config.maxConcurrent);
    }

    this.log('Config updated:', this.config);
  }

  /**
   * Check if a query key has been prefetched recently
   */
  wasPrefetched(queryKey: readonly unknown[]): boolean {
    const cacheKey = JSON.stringify(queryKey);
    const info = this.prefetchedKeys.get(cacheKey);
    if (!info) return false;

    // Consider prefetched if within the last 5 minutes
    return Date.now() - info.timestamp < CACHE_TTL_MS.STANDARD;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.bandwidthUnsubscribe?.();
    this.queue.clear();
    this.prefetchedKeys.clear();
    this.queryClient = null;
    this.isInitialized = false;
    PrefetchManagerClass.instance = null;
    this.log('Destroyed');
  }
}

// Export singleton instance
export const PrefetchManager = PrefetchManagerClass.getInstance();

// Export type for external use
export type { PrefetchManagerClass };
