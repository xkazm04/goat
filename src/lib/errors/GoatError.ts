/**
 * GoatError - Base Error Class for GOAT Application
 *
 * All application errors should extend from or use GoatError.
 * Provides structured error information with:
 * - Error code for tracking and analytics
 * - User-friendly messages
 * - HTTP status code mapping
 * - Debug context (sanitized in production)
 */

import {
  ErrorCode,
  ErrorCategory,
  ErrorDetails,
  ErrorResponse,
  ErrorSeverity,
  ERROR_MESSAGES,
  getCategoryFromStatus,
  getStatusFromCategory,
} from './types';

// ============================================================================
// GoatError Class
// ============================================================================

/**
 * Base error class for all GOAT application errors
 */
export class GoatError extends Error {
  /** Unique error code for tracking */
  readonly code: ErrorCode;

  /** Error category for classification */
  readonly category: ErrorCategory;

  /** HTTP status code */
  readonly status: number;

  /** Error severity for UI display */
  readonly severity: ErrorSeverity;

  /** User-friendly title */
  readonly title: string;

  /** Additional error details */
  readonly details: ErrorDetails;

  /** Timestamp when error was created */
  readonly timestamp: string;

  /** Unique trace ID for this error instance */
  readonly traceId: string;

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      category?: ErrorCategory;
      status?: number;
      details?: ErrorDetails;
      cause?: Error;
    }
  ) {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES.CLIENT_UNKNOWN_ERROR;

    super(message || errorInfo.description);

    this.name = 'GoatError';
    this.code = code;
    this.severity = errorInfo.severity;
    this.title = errorInfo.title;

    // Set category from options, or infer from code prefix
    this.category = options?.category || this.inferCategory(code);

    // Set status from options, or from category
    this.status = options?.status || getStatusFromCategory(this.category);

    // Generate trace ID
    this.traceId = this.generateTraceId();
    this.timestamp = new Date().toISOString();

    // Set details
    this.details = {
      ...options?.details,
      traceId: this.traceId,
      timestamp: this.timestamp,
    };

    // Preserve cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Capture stack trace
    Error.captureStackTrace?.(this, GoatError);
  }

  /**
   * Infer error category from error code prefix
   */
  private inferCategory(code: ErrorCode): ErrorCategory {
    if (code.startsWith('VALIDATION_')) return 'validation';
    if (code.startsWith('AUTH_NOT_') || code.startsWith('AUTH_SESSION_') || code.startsWith('AUTH_INVALID_'))
      return 'authentication';
    if (code.startsWith('AUTH_')) return 'authorization';
    if (code.startsWith('NOT_FOUND_')) return 'not_found';
    if (code.startsWith('CONFLICT_')) return 'conflict';
    if (code.startsWith('RATE_LIMIT_')) return 'rate_limit';
    if (code.startsWith('SERVER_')) return 'server';
    if (code.startsWith('NETWORK_')) return 'network';
    if (code.startsWith('GRID_')) return 'validation';
    return 'client';
  }

  /**
   * Generate a unique trace ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `goat-${timestamp}-${random}`;
  }

  /**
   * Convert to JSON for API responses
   * Sanitizes sensitive information in production
   */
  toJSON(includeStack = false): ErrorResponse {
    const response: ErrorResponse = {
      success: false,
      category: this.category,
      code: this.code,
      message: this.message,
      status: this.status,
      details: {
        traceId: this.traceId,
        timestamp: this.timestamp,
        ...this.details,
      },
    };

    // Only include stack in development
    if (includeStack && process.env.NODE_ENV === 'development') {
      response.details = {
        ...response.details,
        stack: this.stack,
      };
    }

    return response;
  }

  /**
   * Get user-friendly error info for notifications
   */
  toNotification(): {
    title: string;
    description: string;
    severity: ErrorSeverity;
    code: ErrorCode;
    traceId: string;
  } {
    return {
      title: this.title,
      description: this.message,
      severity: this.severity,
      code: this.code,
      traceId: this.traceId,
    };
  }

  /**
   * Check if error is of a specific category
   */
  isCategory(category: ErrorCategory): boolean {
    return this.category === category;
  }

  /**
   * Check if error is retriable
   */
  isRetriable(): boolean {
    return (
      this.category === 'network' ||
      this.category === 'rate_limit' ||
      this.code === 'SERVER_EXTERNAL_SERVICE_ERROR' ||
      this.status === 503 ||
      this.status === 504
    );
  }
}

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Validation error for invalid input
 */
export class ValidationError extends GoatError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super('VALIDATION_CONSTRAINT_VIOLATION', message, {
      category: 'validation',
      status: 400,
      details: {
        ...options?.details,
        fieldErrors,
      },
      cause: options?.cause,
    });

    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors || {};
  }

  static required(field: string): ValidationError {
    return new ValidationError(`${field} is required`, {
      [field]: ['This field is required'],
    });
  }

  static invalidFormat(field: string, expected: string): ValidationError {
    return new ValidationError(`${field} has an invalid format. Expected: ${expected}`, {
      [field]: [`Invalid format. Expected: ${expected}`],
    });
  }
}

/**
 * Authentication error for auth failures
 */
export class AuthenticationError extends GoatError {
  constructor(
    code: 'AUTH_NOT_AUTHENTICATED' | 'AUTH_SESSION_EXPIRED' | 'AUTH_INVALID_TOKEN' = 'AUTH_NOT_AUTHENTICATED',
    message?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super(code, message, {
      category: 'authentication',
      status: 401,
      ...options,
    });

    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for permission failures
 */
export class AuthorizationError extends GoatError {
  constructor(
    code: 'AUTH_FORBIDDEN' | 'AUTH_INSUFFICIENT_PERMISSIONS' | 'AUTH_PREMIUM_REQUIRED' = 'AUTH_FORBIDDEN',
    message?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super(code, message, {
      category: 'authorization',
      status: 403,
      ...options,
    });

    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 */
export class NotFoundError extends GoatError {
  readonly resourceType: string;
  readonly resourceId?: string;

  constructor(
    resourceType: string,
    resourceId?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    const code = `NOT_FOUND_${resourceType.toUpperCase()}` as ErrorCode;
    const validCode = code in ERROR_MESSAGES ? code : 'NOT_FOUND_RESOURCE';

    super(validCode as ErrorCode, `${resourceType} not found${resourceId ? `: ${resourceId}` : ''}`, {
      category: 'not_found',
      status: 404,
      details: {
        ...options?.details,
        context: { resourceType, resourceId },
      },
      cause: options?.cause,
    });

    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Conflict error for resource conflicts
 */
export class ConflictError extends GoatError {
  constructor(
    code: 'CONFLICT_DUPLICATE' | 'CONFLICT_VERSION_MISMATCH' | 'CONFLICT_CONCURRENT_MODIFICATION' = 'CONFLICT_DUPLICATE',
    message?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super(code, message, {
      category: 'conflict',
      status: 409,
      ...options,
    });

    this.name = 'ConflictError';
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends GoatError {
  constructor(
    code: 'NETWORK_OFFLINE' | 'NETWORK_TIMEOUT' | 'NETWORK_CONNECTION_REFUSED' = 'NETWORK_CONNECTION_REFUSED',
    message?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super(code, message, {
      category: 'network',
      status: 0,
      ...options,
    });

    this.name = 'NetworkError';
  }

  static fromFetchError(error: Error): NetworkError {
    if (!navigator.onLine) {
      return new NetworkError('NETWORK_OFFLINE', 'You are offline', { cause: error });
    }
    if (error.name === 'AbortError') {
      return new NetworkError('NETWORK_TIMEOUT', 'Request timed out', { cause: error });
    }
    return new NetworkError('NETWORK_CONNECTION_REFUSED', 'Could not connect to server', {
      cause: error,
    });
  }
}

/**
 * Server error for backend failures
 */
export class ServerError extends GoatError {
  constructor(
    code:
      | 'SERVER_INTERNAL_ERROR'
      | 'SERVER_DATABASE_ERROR'
      | 'SERVER_EXTERNAL_SERVICE_ERROR'
      | 'SERVER_CONFIGURATION_ERROR' = 'SERVER_INTERNAL_ERROR',
    message?: string,
    options?: { cause?: Error; details?: ErrorDetails }
  ) {
    super(code, message, {
      category: 'server',
      status: 500,
      ...options,
    });

    this.name = 'ServerError';
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a GoatError from an unknown error
 */
export function fromUnknown(error: unknown): GoatError {
  // Already a GoatError
  if (error instanceof GoatError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return NetworkError.fromFetchError(error);
    }

    // Check for abort errors
    if (error.name === 'AbortError') {
      return new NetworkError('NETWORK_TIMEOUT', 'Request was cancelled', { cause: error });
    }

    // Generic error
    return new GoatError('CLIENT_UNKNOWN_ERROR', error.message, { cause: error });
  }

  // String error
  if (typeof error === 'string') {
    return new GoatError('CLIENT_UNKNOWN_ERROR', error);
  }

  // Unknown error type
  return new GoatError('CLIENT_UNKNOWN_ERROR', 'An unexpected error occurred');
}

/**
 * Create a GoatError from an HTTP response
 */
export function fromHttpResponse(
  status: number,
  body?: { error?: string; message?: string; code?: string; details?: ErrorDetails }
): GoatError {
  const category = getCategoryFromStatus(status);
  const message = body?.error || body?.message || `HTTP Error: ${status}`;

  // Try to map the code to a known ErrorCode
  let code: ErrorCode = 'CLIENT_UNKNOWN_ERROR';

  if (body?.code && body.code in ERROR_MESSAGES) {
    code = body.code as ErrorCode;
  } else {
    // Infer code from status
    switch (status) {
      case 400:
        code = 'VALIDATION_CONSTRAINT_VIOLATION';
        break;
      case 401:
        code = 'AUTH_NOT_AUTHENTICATED';
        break;
      case 403:
        code = 'AUTH_FORBIDDEN';
        break;
      case 404:
        code = 'NOT_FOUND_RESOURCE';
        break;
      case 409:
        code = 'CONFLICT_DUPLICATE';
        break;
      case 429:
        code = 'RATE_LIMIT_EXCEEDED';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'SERVER_INTERNAL_ERROR';
        break;
      default:
        code = status >= 500 ? 'SERVER_INTERNAL_ERROR' : 'CLIENT_UNKNOWN_ERROR';
    }
  }

  return new GoatError(code, message, {
    category,
    status,
    details: body?.details,
  });
}

/**
 * Check if an error is a GoatError
 */
export function isGoatError(error: unknown): error is GoatError {
  return error instanceof GoatError;
}

/**
 * Check if an error is retriable
 */
export function isRetriable(error: unknown): boolean {
  if (isGoatError(error)) {
    return error.isRetriable();
  }
  return false;
}
