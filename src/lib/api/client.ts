import {
  GoatError,
  NetworkError,
  fromHttpResponse,
  isGoatError,
  trackError,
} from '@/lib/errors';

import { generateRequestId, REQUEST_ID_HEADER } from './request-id';

import type { ErrorResponse } from '@/lib/errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// =============================================================================
// Request Latency Instrumentation
// =============================================================================

interface LatencyEntry {
  endpoint: string;
  method: string;
  durationMs: number;
  timestamp: number;
}

interface LatencyStats {
  count: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

const LATENCY_WINDOW_SIZE = 100;
const LATENCY_P95_THRESHOLD_MS = 3000;

const latencyWindow: LatencyEntry[] = [];

function recordLatency(endpoint: string, method: string, durationMs: number): void {
  latencyWindow.push({ endpoint, method, durationMs, timestamp: Date.now() });
  if (latencyWindow.length > LATENCY_WINDOW_SIZE) {
    latencyWindow.shift();
  }

  // Check p95 and warn if threshold exceeded
  if (latencyWindow.length >= 20) {
    const stats = getLatencyStats();
    if (stats.p95 > LATENCY_P95_THRESHOLD_MS) {
      console.warn(
        `[API Latency] p95 latency is ${stats.p95.toFixed(0)}ms (threshold: ${LATENCY_P95_THRESHOLD_MS}ms). ` +
        `Last request: ${method} ${endpoint} took ${durationMs.toFixed(0)}ms`
      );
    }
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get latency statistics for recent API requests.
 * Returns min, max, p50, p95, p99 from the rolling window (last 100 requests).
 */
export function getLatencyStats(): LatencyStats {
  if (latencyWindow.length === 0) {
    return { count: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
  }
  const durations = latencyWindow.map((e) => e.durationMs).sort((a, b) => a - b);
  return {
    count: durations.length,
    min: durations[0],
    max: durations[durations.length - 1],
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
  };
}

/**
 * Track a GoatError with request context (endpoint + method + requestId)
 */
function trackApiError(error: GoatError, endpoint: string, method: string, requestId?: string): void {
  trackError({
    code: error.code,
    category: error.category,
    severity: error.severity,
    traceId: requestId || error.traceId,
    path: endpoint,
    method,
  });
}

/**
 * API Response type that includes error information
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

// =============================================================================
// Response Format Contract
// =============================================================================

/**
 * Declares the response format an API endpoint returns from the server.
 *
 * - `'raw'`       — Server returns `T` directly (array, object, or primitive).
 * - `'envelope'`  — Server returns `{ success: true, data: T }`.
 *                    ApiClient auto-unwraps this; callers receive `T`.
 * - `'paginated'` — Server returns `{ items: T[], total, limit, offset, has_more }`.
 *                    Callers must transform to their own pagination shape.
 *
 * When adding a new API endpoint, register it in `API_RESPONSE_CONTRACTS`
 * so the dev-mode assertion can catch response format mismatches early.
 */
export type ResponseFormat = 'raw' | 'envelope' | 'paginated';

/**
 * Registry mapping `"METHOD /path"` keys to their expected response format.
 *
 * Only fixed paths are registered — dynamic paths like `/lists/:id` are not
 * matched and won't trigger assertions. Longest-prefix match is NOT used;
 * keys must be exact `"METHOD /path"` strings.
 */
const API_RESPONSE_CONTRACTS = new Map<string, ResponseFormat>([
  // ── Envelope: { success: true, data: T } (auto-unwrapped by ApiClient) ──
  ['GET /collections',    'envelope'],
  ['POST /collections',   'envelope'],
  ['GET /search',         'envelope'],
  ['GET /lists/featured', 'envelope'],
  ['GET /lists/analytics', 'envelope'],

  // ── Paginated: { items: T[], total, limit, offset, has_more } ──
  ['GET /top/items',      'paginated'],

  // ── Raw: T returned directly ──
  ['GET /top/groups',           'raw'],
  ['POST /top/groups',          'raw'],
  ['GET /top/items/trending',   'raw'],
  ['GET /items/stats',          'raw'],
  ['GET /lists',                'raw'],
  ['POST /lists',               'raw'],
  ['POST /lists/create-with-user', 'raw'],
  ['GET /sync',                 'raw'],
  ['POST /sync',                'raw'],
  ['POST /consensus/submit',    'raw'],
  ['POST /top/research',        'raw'],
  ['POST /top/research/validate', 'raw'],
  ['GET /users/me',             'raw'],
  ['GET /blueprints',           'raw'],
  ['POST /blueprints',          'raw'],
]);

/**
 * Detect the actual response format from parsed JSON.
 */
function detectResponseFormat(data: unknown): ResponseFormat {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if ('success' in obj && obj.success === true && 'data' in obj) {
      return 'envelope';
    }
    if ('items' in obj && Array.isArray(obj.items) && 'total' in obj) {
      return 'paginated';
    }
  }
  return 'raw';
}

/**
 * Dev-mode assertion: warn when a response's actual format doesn't match
 * the declared contract. Only runs in development; tree-shaken in prod.
 */
function assertResponseFormat(
  endpoint: string,
  method: string,
  data: unknown
): void {
  const path = endpoint.split('?')[0];
  const key = `${method} ${path}`;
  const expected = API_RESPONSE_CONTRACTS.get(key);

  if (!expected) return; // unregistered endpoint — skip

  const actual = detectResponseFormat(data);
  if (actual !== expected) {
    console.warn(
      `[API Contract] Response format mismatch for ${key}:\n` +
      `  Expected: ${expected}\n` +
      `  Received: ${actual}\n` +
      `  Response sample: ${JSON.stringify(data).slice(0, 200)}\n` +
      `  Update the endpoint or API_RESPONSE_CONTRACTS in client.ts`,
    );
  }
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private static DEFAULT_TIMEOUT_MS = 30_000;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const requestId = generateRequestId();
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      [REQUEST_ID_HEADER]: requestId,
    };

    // Set up timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ApiClient.DEFAULT_TIMEOUT_MS
    );

    // Chain with any existing external signal. Use a NAMED handler removed in the
    // finally below: previously an anonymous listener was added and never removed,
    // so a reused/long-lived signal (a component- or app-scoped AbortSignal)
    // accumulated one listener per request — each pinning a per-request
    // AbortController + timeout closure (slow leak + O(n) abort fan-out).
    const onExternalAbort = () => controller.abort();
    if (options.signal) {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const config: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const requestStart = performance.now();
    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check if the response is in our new ErrorResponse format
        if (errorData.success === false && errorData.code) {
          const error = fromHttpResponse(response.status, {
            error: errorData.message,
            code: errorData.code,
            details: errorData.details,
          });

          trackApiError(error, endpoint, options.method || 'GET', requestId);
          throw error;
        }

        // Legacy error response handling
        const error = fromHttpResponse(response.status, {
          error: errorData.error || errorData.detail || errorData.message,
        });

        trackApiError(error, endpoint, options.method || 'GET', requestId);
        throw error;
      }

      clearTimeout(timeoutId);
      const data = await response.json();

      // Dev-mode: assert response matches declared contract
      if (process.env.NODE_ENV === 'development') {
        assertResponseFormat(endpoint, options.method || 'GET', data);
      }

      // Record latency for successful requests
      recordLatency(endpoint, options.method || 'GET', performance.now() - requestStart);

      // Handle wrapped responses ({ success: true, data: T } envelope)
      // See ResponseFormat type and API_RESPONSE_CONTRACTS for the full contract.
      if (data && typeof data === 'object' && 'success' in data && data.success === true) {
        if (data.data === undefined || data.data === null) {
          const method = options.method || 'GET';
          const emptyError = new GoatError(
            'CLIENT_EMPTY_RESPONSE',
            `${method} ${endpoint} returned success but no data`,
          );
          trackApiError(emptyError, endpoint, method, requestId);
          throw emptyError;
        }
        return data.data as T;
      }

      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      // Record latency even for failed requests
      recordLatency(endpoint, options.method || 'GET', performance.now() - requestStart);
      // If it's already a GoatError, rethrow it
      if (isGoatError(error)) {
        throw error;
      }

      const method = options.method || 'GET';

      // Network errors (fetch failures)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = NetworkError.fromFetchError(error);
        trackApiError(networkError, endpoint, method, requestId);
        throw networkError;
      }

      // Check for AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new NetworkError('NETWORK_TIMEOUT', 'Request timed out');
        trackApiError(timeoutError, endpoint, method, requestId);
        throw timeoutError;
      }

      // Other unknown errors
      const unknownError = new GoatError('CLIENT_UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { cause: error instanceof Error ? error : undefined }
      );
      trackApiError(unknownError, endpoint, method, requestId);
      throw unknownError;
    } finally {
      // Always detach the external-signal listener so it can't outlive the
      // request (the timeout is already cleared on both the success and catch
      // paths above, before the response body is read).
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown> | object): Promise<T> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

/**
 * Helper to check if an error is retriable
 */
export function isApiErrorRetriable(error: unknown): boolean {
  if (isGoatError(error)) {
    return error.isRetriable();
  }
  return false;
}

/**
 * Helper to get error message for display
 */
export function getApiErrorMessage(error: unknown): string {
  if (isGoatError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Helper to get error code for tracking
 */
export function getApiErrorCode(error: unknown): string {
  if (isGoatError(error)) {
    return error.code;
  }
  return 'UNKNOWN';
}
