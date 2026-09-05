/**
 * PriorityQueue
 *
 * A priority-based queue for managing prefetch requests.
 * Higher priority items are processed first, with support for:
 * - Priority levels (high, medium, low)
 * - Request deduplication
 * - Cancellation
 * - Max queue size limits
 * - Age-based expiration
 */

export type PrefetchPriority = 'high' | 'medium' | 'low';

export interface PrefetchRequest<T = unknown> {
  /** Unique identifier for the request */
  id: string;
  /** Priority level */
  priority: PrefetchPriority;
  /** The async function to execute */
  execute: () => Promise<T>;
  /** Timestamp when the request was added */
  timestamp: number;
  /** Optional callback on completion */
  onComplete?: (result: T) => void;
  /** Optional callback on error */
  onError?: (error: Error) => void;
  /** Optional metadata for tracking */
  metadata?: {
    source?: 'hover' | 'route' | 'scroll' | 'prediction';
    route?: string;
    dataType?: string;
  };
}

interface QueueEntry<T> extends PrefetchRequest<T> {
  /** Internal priority score for sorting */
  score: number;
}

const PRIORITY_SCORES: Record<PrefetchPriority, number> = {
  high: 100,   // Hover-triggered, immediate user intent
  medium: 50,  // Route-based, likely user path
  low: 10,     // Predictive, speculative
};

/** Time after which a queued request expires (30 seconds) */
const REQUEST_EXPIRY_MS = 30_000;

/** Default maximum queue size */
const DEFAULT_MAX_QUEUE_SIZE = 50;

class PriorityQueueClass<T = unknown> {
  private queue: QueueEntry<T>[] = [];
  private processing: Set<string> = new Set();
  private processed: Set<string> = new Set();
  private maxSize: number;
  private maxConcurrent: number;
  private isProcessing: boolean = false;
  private onDrain?: () => void;

  constructor(options: {
    maxSize?: number;
    maxConcurrent?: number;
    onDrain?: () => void;
  } = {}) {
    this.maxSize = options.maxSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.onDrain = options.onDrain;
  }

  /**
   * Add a request to the queue
   * Returns false if the request was deduplicated or queue is full
   */
  enqueue(request: Omit<PrefetchRequest<T>, 'timestamp'>): boolean {
    // Check for duplicates
    if (this.has(request.id)) {
      return false;
    }

    // Check if already processed recently
    if (this.processed.has(request.id)) {
      return false;
    }

    // Remove expired entries before checking size
    this.removeExpired();

    // Check queue size limit
    if (this.queue.length >= this.maxSize) {
      // Try to make room by removing lowest priority items
      this.evictLowPriority(1);
      if (this.queue.length >= this.maxSize) {
        return false;
      }
    }

    const entry: QueueEntry<T> = {
      ...request,
      timestamp: Date.now(),
      score: this.calculateScore(request.priority),
    };

    // Insert in sorted order (highest score first)
    const insertIndex = this.findInsertIndex(entry.score);
    this.queue.splice(insertIndex, 0, entry);

    // Trigger processing
    this.processNext();

    return true;
  }

  /**
   * Calculate priority score with time decay
   */
  private calculateScore(priority: PrefetchPriority): number {
    return PRIORITY_SCORES[priority];
  }

  /**
   * Find the correct insertion index to maintain sorted order
   */
  private findInsertIndex(score: number): number {
    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.queue[mid].score > score) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  /**
   * Check if a request is in the queue or being processed
   */
  has(id: string): boolean {
    return (
      this.processing.has(id) ||
      this.queue.some((entry) => entry.id === id)
    );
  }

  /**
   * Remove a request from the queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    this.queue.splice(index, 1);
    return true;
  }

  /**
   * Cancel a request (removes from queue or marks for cancellation)
   */
  cancel(id: string): void {
    this.remove(id);
    // Note: If already processing, it will complete but onComplete won't be called
    this.processing.delete(id);
  }

  /**
   * Remove expired entries from the queue
   */
  private removeExpired(): void {
    const now = Date.now();
    this.queue = this.queue.filter(
      (entry) => now - entry.timestamp < REQUEST_EXPIRY_MS
    );
  }

  /**
   * Evict lowest priority items to make room
   */
  private evictLowPriority(count: number): void {
    // Queue is sorted highest to lowest, so remove from the end
    this.queue.splice(-count, count);
  }

  /**
   * Process the next items in the queue
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (
        this.queue.length > 0 &&
        this.processing.size < this.maxConcurrent
      ) {
        // Remove expired entries
        this.removeExpired();

        if (this.queue.length === 0) break;

        // Get highest priority item
        const entry = this.queue.shift();
        if (!entry) break;

        // Check if still valid (not expired)
        if (Date.now() - entry.timestamp >= REQUEST_EXPIRY_MS) {
          continue;
        }

        // Mark as processing
        this.processing.add(entry.id);

        // Execute without awaiting (fire and forget for concurrent processing)
        this.executeRequest(entry);
      }
    } finally {
      this.isProcessing = false;

      // Check if queue drained
      if (this.queue.length === 0 && this.processing.size === 0) {
        this.onDrain?.();
      }
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest(entry: QueueEntry<T>): Promise<void> {
    try {
      const result = await entry.execute();

      // Mark as processed
      this.processed.add(entry.id);

      // Clean up old processed entries (keep last 100)
      if (this.processed.size > 100) {
        const toRemove = Array.from(this.processed).slice(0, 50);
        toRemove.forEach((id) => this.processed.delete(id));
      }

      entry.onComplete?.(result);
    } catch (error) {
      entry.onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing.delete(entry.id);

      // Trigger next processing cycle
      this.processNext();
    }
  }

  /**
   * Update the maximum concurrent requests
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processNext();
  }

  /**
   * Pause processing (stop picking up new items)
   */
  pause(): void {
    this.maxConcurrent = 0;
  }

  /**
   * Resume processing
   */
  resume(maxConcurrent: number = 3): void {
    this.maxConcurrent = maxConcurrent;
    this.processNext();
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    // Note: Currently processing items will complete
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queued: number;
    processing: number;
    processed: number;
    /** The live concurrency limit — BandwidthDetector lowers this on slow networks. */
    maxConcurrent: number;
    byPriority: Record<PrefetchPriority, number>;
  } {
    const byPriority: Record<PrefetchPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };

    this.queue.forEach((entry) => {
      byPriority[entry.priority]++;
    });

    return {
      queued: this.queue.length,
      processing: this.processing.size,
      processed: this.processed.size,
      maxConcurrent: this.maxConcurrent,
      byPriority,
    };
  }

  /**
   * Get all pending request IDs
   */
  getPendingIds(): string[] {
    return this.queue.map((entry) => entry.id);
  }

  /**
   * Boost priority of a specific request
   */
  boostPriority(id: string, newPriority: PrefetchPriority): boolean {
    const index = this.queue.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    const entry = this.queue[index];
    const newScore = PRIORITY_SCORES[newPriority];

    // Only boost if new priority is higher
    if (newScore <= entry.score) return false;

    // Remove and re-insert with new priority
    this.queue.splice(index, 1);
    entry.priority = newPriority;
    entry.score = newScore;

    const insertIndex = this.findInsertIndex(entry.score);
    this.queue.splice(insertIndex, 0, entry);

    return true;
  }
}

// Export class for instantiation
export { PriorityQueueClass as PriorityQueue };

// Create and export a default instance for prefetch requests
export const prefetchQueue = new PriorityQueueClass<void>({
  maxSize: 50,
  maxConcurrent: 3,
});
