import {
  GoatError,
  NetworkError,
  fromHttpResponse,
  isGoatError,
  trackError,
} from '@/lib/errors';
import type { ErrorResponse } from '@/lib/errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * API Response type that includes error information
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

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

          // Track the error
          trackError({
            code: error.code,
            category: error.category,
            severity: error.severity,
            traceId: error.traceId,
            path: endpoint,
            method: options.method || 'GET',
          });

          throw error;
        }

        // Legacy error response handling
        const error = fromHttpResponse(response.status, {
          error: errorData.error || errorData.detail || errorData.message,
        });

        trackError({
          code: error.code,
          category: error.category,
          severity: error.severity,
          traceId: error.traceId,
          path: endpoint,
          method: options.method || 'GET',
        });

        throw error;
      }

      const data = await response.json();

      // Handle wrapped responses
      if (data && typeof data === 'object' && 'success' in data && data.success === true) {
        return data.data as T;
      }

      return data;
    } catch (error: unknown) {
      // If it's already a GoatError, rethrow it
      if (isGoatError(error)) {
        throw error;
      }

      // Network errors (fetch failures)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = NetworkError.fromFetchError(error);

        trackError({
          code: networkError.code,
          category: networkError.category,
          severity: networkError.severity,
          traceId: networkError.traceId,
          path: endpoint,
          method: options.method || 'GET',
        });

        throw networkError;
      }

      // Check for AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new NetworkError('NETWORK_TIMEOUT', 'Request timed out');

        trackError({
          code: timeoutError.code,
          category: timeoutError.category,
          severity: timeoutError.severity,
          traceId: timeoutError.traceId,
          path: endpoint,
          method: options.method || 'GET',
        });

        throw timeoutError;
      }

      // Other unknown errors
      const unknownError = new GoatError('CLIENT_UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { cause: error instanceof Error ? error : undefined }
      );

      trackError({
        code: unknownError.code,
        category: unknownError.category,
        severity: unknownError.severity,
        traceId: unknownError.traceId,
        path: endpoint,
        method: options.method || 'GET',
      });

      throw unknownError;
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
