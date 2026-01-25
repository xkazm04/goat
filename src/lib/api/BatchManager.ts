/**
 * BatchManager - Collects and batches multiple API requests
 *
 * Implements the DataLoader pattern to batch multiple requests into single API calls,
 * dramatically reducing network overhead and improving performance.
 */

import {
  WindowScheduler,
  getGlobalWindowScheduler,
  type BatchPriority,
} from './WindowScheduler';
import { Deduplicator, getGlobalDeduplicator } from './Deduplicator';

// =============================================================================
// Types
// =============================================================================

export interface BatchRequest {
  /** Unique request ID */
  id: string;
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request params (for GET) or body (for POST/PUT/PATCH) */
  data?: unknown;
  /** Request priority */
  priority: BatchPriority;
  /** Timestamp when request was queued */
  timestamp: number;
}

export interface BatchResponse<T = unknown> {
  /** Request ID this response corresponds to */
  id: string;
  /** Whether the request succeeded */
  success: boolean;
  /** Response data (if success) */
  data?: T;
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface BatchResult<T = unknown> {
  /** All responses */
  responses: BatchResponse<T>[];
  /** Total time in ms */
  totalTime: number;
  /** Number of requests batched */
  batchSize: number;
}

export interface BatchManagerOptions {
  /** Batch API endpoint (default: /api/batch) */
  batchEndpoint?: string;
  /** Maximum batch size (default: 20) */
  maxBatchSize?: number;
  /** Batch window in ms (default: 16) */
  batchWindow?: number;
  /** Maximum batch window in ms (default: 100) */
  maxBatchWindow?: number;
  /** Whether to enable deduplication (default: true) */
  dedupe?: boolean;
  /** Whether to log batch operations (default: false in production) */
  debug?: boolean;
  /** Custom batch executor */
  executor?: (requests: BatchRequest[]) => Promise<BatchResponse[]>;
}

export interface BatchManagerStats {
  /** Total batches executed */
  totalBatches: number;
  /** Total requests batched */
  totalRequests: number;
  /** Average batch size */
  averageBatchSize: number;
  /** Total requests saved (vs individual) */
  requestsSaved: number;
  /** Efficiency ratio (requests saved / total requests) */
  efficiency: number;
  /** Current pending requests */
  pendingRequests: number;
}

interface PendingBatchRequest<T> extends BatchRequest {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_OPTIONS: Required<Omit<BatchManagerOptions, 'executor'>> & {
  executor?: BatchManagerOptions['executor'];
} = {
  batchEndpoint: '/api/batch',
  maxBatchSize: 20,
  batchWindow: 16,
  maxBatchWindow: 100,
  dedupe: true,
  debug: process.env.NODE_ENV !== 'production',
  executor: undefined,
};

// =============================================================================
// BatchManager Class
// =============================================================================

/**
 * BatchManager collects individual API requests and combines them into
 * batched requests to reduce network overhead.
 *
 * @example
 * ```ts
 * const batchManager = new BatchManager();
 *
 * // These three requests will be batched into one
 * const [user, posts, comments] = await Promise.all([
 *   batchManager.add('/api/users/1', 'GET'),
 *   batchManager.add('/api/posts', 'GET', { userId: 1 }),
 *   batchManager.add('/api/comments', 'GET', { postId: 1 }),
 * ]);
 * ```
 */
export class BatchManager {
  private options: typeof DEFAULT_OPTIONS;
  private scheduler: WindowScheduler;
  private deduplicator: Deduplicator;
  private pendingRequests: Map<string, PendingBatchRequest<unknown>[]> = new Map();
  private requestIdCounter = 0;
  private stats: BatchManagerStats = {
    totalBatches: 0,
    totalRequests: 0,
    averageBatchSize: 0,
    requestsSaved: 0,
    efficiency: 0,
    pendingRequests: 0,
  };

  constructor(options: BatchManagerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.scheduler = getGlobalWindowScheduler({
      defaultWindow: this.options.batchWindow,
      maxWindow: this.options.maxBatchWindow,
      maxBatchSize: this.options.maxBatchSize,
    });
    this.deduplicator = getGlobalDeduplicator();
  }

  /**
   * Add a request to the batch queue
   */
  add<T>(
    endpoint: string,
    method: BatchRequest['method'] = 'GET',
    data?: unknown,
    priority: BatchPriority = 'normal'
  ): Promise<T> {
    // Generate request ID
    const id = this.generateRequestId();

    // Create dedup key for this request
    const dedupKey = this.deduplicator.generateKey(endpoint, { method, ...data as object });

    return new Promise<T>((resolve, reject) => {
      const request: PendingBatchRequest<T> = {
        id,
        endpoint,
        method,
        data,
        priority,
        timestamp: Date.now(),
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      // Add to pending requests grouped by dedup key
      if (!this.pendingRequests.has(dedupKey)) {
        this.pendingRequests.set(dedupKey, []);
      }
      this.pendingRequests.get(dedupKey)!.push(request as PendingBatchRequest<unknown>);

      this.stats.pendingRequests = this.getTotalPendingCount();

      if (this.options.debug) {
        console.log(`📦 [BatchManager] Queued: ${method} ${endpoint} (priority: ${priority})`);
      }

      // Schedule batch execution
      this.scheduler.schedule(() => this.executeBatch(), priority);
    });
  }

  /**
   * Add a GET request to the batch
   */
  get<T>(endpoint: string, params?: Record<string, unknown>, priority?: BatchPriority): Promise<T> {
    return this.add<T>(endpoint, 'GET', params, priority);
  }

  /**
   * Add a POST request to the batch
   */
  post<T>(endpoint: string, data?: unknown, priority?: BatchPriority): Promise<T> {
    return this.add<T>(endpoint, 'POST', data, priority);
  }

  /**
   * Execute a request immediately without batching
   */
  async immediate<T>(
    endpoint: string,
    method: BatchRequest['method'] = 'GET',
    data?: unknown
  ): Promise<T> {
    const request: BatchRequest = {
      id: this.generateRequestId(),
      endpoint,
      method,
      data,
      priority: 'urgent',
      timestamp: Date.now(),
    };

    const responses = await this.executeRequests([request]);
    const response = responses[0];

    if (!response.success) {
      throw new Error(response.error?.message || 'Request failed');
    }

    return response.data as T;
  }

  /**
   * Force flush all pending requests
   */
  flush(): void {
    this.scheduler.flush();
  }

  /**
   * Get batch manager statistics
   */
  getStats(): BatchManagerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      totalRequests: 0,
      averageBatchSize: 0,
      requestsSaved: 0,
      efficiency: 0,
      pendingRequests: this.getTotalPendingCount(),
    };
  }

  /**
   * Clear all pending requests without executing them
   */
  clear(): void {
    Array.from(this.pendingRequests.values()).forEach((requests) => {
      requests.forEach((request) => {
        request.reject(new Error('Batch cleared'));
      });
    });
    this.pendingRequests.clear();
    this.scheduler.clear();
    this.stats.pendingRequests = 0;
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.getTotalPendingCount();
  }

  private generateRequestId(): string {
    return `batch_${Date.now()}_${++this.requestIdCounter}`;
  }

  private getTotalPendingCount(): number {
    let count = 0;
    Array.from(this.pendingRequests.values()).forEach((requests) => {
      count += requests.length;
    });
    return count;
  }

  private async executeBatch(): Promise<void> {
    if (this.pendingRequests.size === 0) return;

    // Collect all pending requests
    const allRequests: PendingBatchRequest<unknown>[] = [];
    const requestsByKey = new Map<string, PendingBatchRequest<unknown>[]>();

    Array.from(this.pendingRequests.entries()).forEach(([key, requests]) => {
      requestsByKey.set(key, requests);
      allRequests.push(...requests);
    });

    // Clear pending
    this.pendingRequests.clear();

    if (allRequests.length === 0) return;

    // Group by dedup key and only make one request per unique key
    const uniqueRequests: BatchRequest[] = [];
    const dedupKeyToRequest = new Map<string, BatchRequest>();

    Array.from(requestsByKey.entries()).forEach(([key, requests]) => {
      // Take the first request for each unique key
      const request = requests[0];
      const batchRequest: BatchRequest = {
        id: request.id,
        endpoint: request.endpoint,
        method: request.method,
        data: request.data,
        priority: request.priority,
        timestamp: request.timestamp,
      };
      uniqueRequests.push(batchRequest);
      dedupKeyToRequest.set(key, batchRequest);
    });

    const startTime = Date.now();

    if (this.options.debug) {
      console.log(
        `🚀 [BatchManager] Executing batch: ${uniqueRequests.length} unique requests ` +
        `(${allRequests.length} total, ${allRequests.length - uniqueRequests.length} deduped)`
      );
    }

    try {
      // Execute the batch
      const responses = await this.executeRequests(uniqueRequests);

      // Map responses back to all subscribers
      const responseById = new Map<string, BatchResponse>();
      responses.forEach((response) => {
        responseById.set(response.id, response);
      });

      // Distribute responses to all subscribers
      Array.from(requestsByKey.entries()).forEach(([key, requests]) => {
        const batchRequest = dedupKeyToRequest.get(key);
        if (!batchRequest) return;

        const response = responseById.get(batchRequest.id);

        requests.forEach((request) => {
          if (response?.success) {
            request.resolve(response.data);
          } else {
            request.reject(
              new Error(response?.error?.message || 'Batch request failed')
            );
          }
        });
      });

      // Update stats
      const endTime = Date.now();
      this.updateStats(allRequests.length, uniqueRequests.length, endTime - startTime);
    } catch (error) {
      // Reject all pending requests on batch failure
      Array.from(requestsByKey.values()).forEach((requests) => {
        requests.forEach((request) => {
          request.reject(error instanceof Error ? error : new Error('Batch execution failed'));
        });
      });

      if (this.options.debug) {
        console.error('[BatchManager] Batch execution failed:', error);
      }
    }
  }

  private async executeRequests(requests: BatchRequest[]): Promise<BatchResponse[]> {
    // If custom executor provided, use it
    if (this.options.executor) {
      return this.options.executor(requests);
    }

    // Default: use batch endpoint
    try {
      const response = await fetch(this.options.batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.responses || [];
    } catch (error) {
      // Fallback: execute requests individually
      if (this.options.debug) {
        console.warn('[BatchManager] Batch endpoint failed, falling back to individual requests');
      }

      return this.executeIndividually(requests);
    }
  }

  private async executeIndividually(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const responses: BatchResponse[] = [];

    for (const request of requests) {
      try {
        const url = this.buildUrl(request.endpoint, request.method === 'GET' ? request.data : undefined);
        const fetchOptions: RequestInit = {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (request.method !== 'GET' && request.method !== 'DELETE' && request.data) {
          fetchOptions.body = JSON.stringify(request.data);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        responses.push({
          id: request.id,
          success: response.ok,
          data: response.ok ? data : undefined,
          error: response.ok ? undefined : {
            code: `HTTP_${response.status}`,
            message: data.message || data.error || 'Request failed',
          },
        });
      } catch (error) {
        responses.push({
          id: request.id,
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return responses;
  }

  private buildUrl(endpoint: string, params?: unknown): string {
    if (!params || typeof params !== 'object') return endpoint;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${endpoint}?${queryString}` : endpoint;
  }

  private updateStats(totalRequests: number, batchedRequests: number, _time: number): void {
    this.stats.totalBatches++;
    this.stats.totalRequests += totalRequests;
    this.stats.requestsSaved += totalRequests - batchedRequests;
    this.stats.averageBatchSize = this.stats.totalRequests / this.stats.totalBatches;
    this.stats.efficiency =
      this.stats.totalRequests > 0
        ? this.stats.requestsSaved / this.stats.totalRequests
        : 0;
    this.stats.pendingRequests = this.getTotalPendingCount();
  }
}

// =============================================================================
// Singleton & Exports
// =============================================================================

let globalBatchManager: BatchManager | null = null;

/**
 * Get the global BatchManager instance
 */
export function getGlobalBatchManager(options?: BatchManagerOptions): BatchManager {
  if (!globalBatchManager) {
    globalBatchManager = new BatchManager(options);
  }
  return globalBatchManager;
}

/**
 * Reset the global BatchManager (mainly for testing)
 */
export function resetGlobalBatchManager(): void {
  if (globalBatchManager) {
    globalBatchManager.clear();
    globalBatchManager = null;
  }
}

/**
 * Convenience function to batch a GET request
 */
export function batchGet<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  priority?: BatchPriority
): Promise<T> {
  return getGlobalBatchManager().get<T>(endpoint, params, priority);
}

/**
 * Convenience function to batch a POST request
 */
export function batchPost<T>(
  endpoint: string,
  data?: unknown,
  priority?: BatchPriority
): Promise<T> {
  return getGlobalBatchManager().post<T>(endpoint, data, priority);
}
