/**
 * WindowScheduler - Intelligent batch timing for API requests
 *
 * Uses requestIdleCallback when available to batch requests during idle periods,
 * with fallback to setTimeout. Provides configurable batch windows and priority handling.
 */

export type BatchPriority = 'urgent' | 'normal' | 'low';

export interface WindowSchedulerOptions {
  /** Default window duration in ms (default: 16ms - one frame) */
  defaultWindow?: number;
  /** Maximum window duration in ms (default: 100ms) */
  maxWindow?: number;
  /** Minimum items before early flush (default: 5) */
  minBatchSize?: number;
  /** Maximum items before forced flush (default: 50) */
  maxBatchSize?: number;
  /** Use requestIdleCallback when available (default: true) */
  useIdleCallback?: boolean;
}

interface ScheduledCallback {
  callback: () => void;
  priority: BatchPriority;
  timestamp: number;
}

const DEFAULT_OPTIONS: Required<WindowSchedulerOptions> = {
  defaultWindow: 16,
  maxWindow: 100,
  minBatchSize: 5,
  maxBatchSize: 50,
  useIdleCallback: true,
};

// Priority weights for scheduling (lower = higher priority)
const PRIORITY_WEIGHTS: Record<BatchPriority, number> = {
  urgent: 0,
  normal: 1,
  low: 2,
};

/**
 * WindowScheduler manages batching windows for API requests
 *
 * @example
 * ```ts
 * const scheduler = new WindowScheduler({ defaultWindow: 20 });
 *
 * scheduler.schedule(() => {
 *   // This will be called after the batch window
 *   console.log('Batch executed!');
 * }, 'normal');
 * ```
 */
export class WindowScheduler {
  private options: Required<WindowSchedulerOptions>;
  private pendingCallbacks: ScheduledCallback[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private idleCallbackId: number | null = null;
  private windowStartTime: number | null = null;
  private isProcessing = false;

  constructor(options: WindowSchedulerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Schedule a callback to run in the next batch window
   */
  schedule(callback: () => void, priority: BatchPriority = 'normal'): void {
    const scheduled: ScheduledCallback = {
      callback,
      priority,
      timestamp: Date.now(),
    };

    this.pendingCallbacks.push(scheduled);

    // Urgent priority bypasses batching
    if (priority === 'urgent') {
      this.flush();
      return;
    }

    // Check if we should flush early due to batch size
    if (this.pendingCallbacks.length >= this.options.maxBatchSize) {
      this.flush();
      return;
    }

    // Start the batch window if not already started
    if (this.windowStartTime === null) {
      this.startWindow();
    }
  }

  /**
   * Schedule with a promise that resolves when the callback is executed
   */
  scheduleAsync<T>(
    callback: () => T | Promise<T>,
    priority: BatchPriority = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.schedule(async () => {
        try {
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, priority);
    });
  }

  /**
   * Flush all pending callbacks immediately
   */
  flush(): void {
    this.cancelScheduled();
    this.executeCallbacks();
  }

  /**
   * Get the number of pending callbacks
   */
  getPendingCount(): number {
    return this.pendingCallbacks.length;
  }

  /**
   * Check if there are any pending callbacks
   */
  hasPending(): boolean {
    return this.pendingCallbacks.length > 0;
  }

  /**
   * Clear all pending callbacks without executing them
   */
  clear(): void {
    this.cancelScheduled();
    this.pendingCallbacks = [];
    this.windowStartTime = null;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    pendingCount: number;
    windowStartTime: number | null;
    isProcessing: boolean;
    options: Required<WindowSchedulerOptions>;
  } {
    return {
      pendingCount: this.pendingCallbacks.length,
      windowStartTime: this.windowStartTime,
      isProcessing: this.isProcessing,
      options: { ...this.options },
    };
  }

  private startWindow(): void {
    this.windowStartTime = Date.now();

    const scheduleFlush = () => {
      // Use requestIdleCallback if available and enabled
      if (
        this.options.useIdleCallback &&
        typeof window !== 'undefined' &&
        'requestIdleCallback' in window
      ) {
        this.idleCallbackId = window.requestIdleCallback(
          (deadline) => {
            // If we have time remaining or have been waiting too long, flush
            if (
              deadline.timeRemaining() > 0 ||
              Date.now() - (this.windowStartTime || 0) >= this.options.maxWindow
            ) {
              this.executeCallbacks();
            } else {
              // Reschedule if no time remaining
              scheduleFlush();
            }
          },
          { timeout: this.options.maxWindow }
        );
      } else {
        // Fallback to setTimeout
        this.timeoutId = setTimeout(() => {
          this.executeCallbacks();
        }, this.options.defaultWindow);
      }
    };

    scheduleFlush();
  }

  private cancelScheduled(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.idleCallbackId !== null && typeof window !== 'undefined') {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
  }

  private executeCallbacks(): void {
    if (this.isProcessing || this.pendingCallbacks.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.windowStartTime = null;

    // Sort callbacks by priority (urgent first, then by timestamp)
    const callbacks = [...this.pendingCallbacks].sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    this.pendingCallbacks = [];

    // Execute all callbacks
    for (const { callback } of callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[WindowScheduler] Callback error:', error);
      }
    }

    this.isProcessing = false;
  }
}

// Singleton instance for global use
let globalScheduler: WindowScheduler | null = null;

/**
 * Get the global WindowScheduler instance
 */
export function getGlobalWindowScheduler(
  options?: WindowSchedulerOptions
): WindowScheduler {
  if (!globalScheduler) {
    globalScheduler = new WindowScheduler(options);
  }
  return globalScheduler;
}

/**
 * Reset the global WindowScheduler (mainly for testing)
 */
export function resetGlobalWindowScheduler(): void {
  if (globalScheduler) {
    globalScheduler.clear();
    globalScheduler = null;
  }
}
