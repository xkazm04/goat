/**
 * API Error Handler - Centralized Error Handling for API Routes
 *
 * Provides:
 * - Consistent error response format
 * - Error logging with trace IDs
 * - Development/production error detail filtering
 * - Supabase error handling
 * - Request context tracking
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  GoatError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ServerError,
  fromUnknown,
  isGoatError,
} from './GoatError';

import type { ErrorResponse, ErrorCode } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Route handler type compatible with Next.js 15 App Router
 * Next.js 15 uses Promise<params> for dynamic segments
 */
type RouteHandler<T = unknown> = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse<T>> | NextResponse<T>;

interface ErrorLogEntry {
  traceId: string;
  timestamp: string;
  code: string;
  message: string;
  status: number;
  path: string;
  method: string;
  stack?: string;
  cause?: string;
  userId?: string;
  requestId?: string;
}

// ============================================================================
// Error Response Builder
// ============================================================================

/**
 * The HTTP status to put on the wire for a GoatError.
 *
 * `GoatError.status` is the CLIENT-side vocabulary: the `network` category
 * carries status 0, meaning "no response was received", which is a true
 * statement in a browser and not an HTTP status at all. Handing it to
 * `NextResponse.json` threw `RangeError: init["status"] must be in the range
 * of 200 to 599`, so a route whose upstream was down answered with Next's bare
 * 500 and no structured body — and `logError` never fired either, because 0 is
 * not >= 400. One classification, two consumers (§ error-handling: one
 * taxonomy, many consumers); this is the projection onto the HTTP consumer.
 */
function toHttpStatus(error: GoatError): number {
  return error.status >= 200 && error.status <= 599 ? error.status : 502;
}

/**
 * Classify a value thrown inside a route.
 *
 * `fromUnknown` is the CLIENT-side classifier: anything it does not recognise
 * becomes `CLIENT_UNKNOWN_ERROR`, whose category is `client` and whose status
 * is therefore 400 — and its message is the raw thrown text. At an API door
 * that is wrong twice over. An exception the server did not anticipate is the
 * SERVER's fault (500, not 400 — a 400 tells the caller to change their
 * request, which cannot help), and its raw text is internal detail:
 * `connect ECONNREFUSED 10.0.0.5:5432` named a private host and port to any
 * HTTP client of the 20 routes this wrapper guards. The cause is preserved on
 * the error so `logError` still writes it to the operator's door.
 */
function toApiError(error: unknown): GoatError {
  if (isGoatError(error)) return error;

  const classified = fromUnknown(error);
  if (classified.code !== 'CLIENT_UNKNOWN_ERROR') return classified;

  return new ServerError('SERVER_INTERNAL_ERROR', undefined, {
    cause: error instanceof Error ? error : new Error(String(error)),
  });
}

/**
 * Build a standardized error response
 */
function buildErrorResponse(error: GoatError, req: NextRequest): NextResponse<ErrorResponse> {
  const isDev = process.env.NODE_ENV === 'development';
  const httpStatus = toHttpStatus(error);

  const response: ErrorResponse = {
    success: false,
    category: error.category,
    code: error.code,
    message: error.message,
    status: httpStatus,
    details: {
      traceId: error.traceId,
      timestamp: error.timestamp,
      path: new URL(req.url).pathname,
      method: req.method,
    },
  };

  // Include stack trace in development only
  if (isDev && error.stack) {
    response.details = {
      ...response.details,
      stack: error.stack,
    };
  }

  // Include field errors for validation errors
  if (error instanceof ValidationError && error.fieldErrors) {
    response.details = {
      ...response.details,
      fieldErrors: error.fieldErrors,
    };
  }

  return NextResponse.json(response, { status: httpStatus });
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error for monitoring and debugging
 */
function logError(error: GoatError, req: NextRequest, userId?: string): void {
  const httpStatus = toHttpStatus(error);
  const entry: ErrorLogEntry = {
    traceId: error.traceId,
    timestamp: error.timestamp,
    code: error.code,
    message: error.message,
    status: httpStatus,
    path: new URL(req.url).pathname,
    method: req.method,
    userId,
  };

  // The cause is the ONLY record of what actually failed once the wire message
  // is sanitised (see `toApiError`), so it goes to the operator's door in every
  // environment. The stack stays development-only.
  if (error.cause instanceof Error) {
    entry.cause = error.cause.message;
  }
  if (process.env.NODE_ENV === 'development') {
    entry.stack = error.stack;
  }

  // Log based on severity
  if (httpStatus >= 500) {
    console.error('🚨 API Error:', JSON.stringify(entry, null, 2));
  } else if (httpStatus >= 400) {
    console.warn('⚠️ API Warning:', JSON.stringify(entry, null, 2));
  }
}

// ============================================================================
// Supabase Error Handling
// ============================================================================

/**
 * Common Supabase error codes and their mappings
 */
const SUPABASE_ERROR_MAP: Record<string, { code: ErrorCode; status: number }> = {
  // Auth errors
  'invalid_credentials': { code: 'AUTH_INVALID_TOKEN', status: 401 },
  'user_not_found': { code: 'NOT_FOUND_USER', status: 404 },
  'email_not_confirmed': { code: 'AUTH_NOT_AUTHENTICATED', status: 401 },
  'session_expired': { code: 'AUTH_SESSION_EXPIRED', status: 401 },

  // Database errors
  'PGRST116': { code: 'NOT_FOUND_RESOURCE', status: 404 }, // No rows returned
  '23505': { code: 'CONFLICT_DUPLICATE', status: 409 }, // Unique violation
  '23503': { code: 'VALIDATION_CONSTRAINT_VIOLATION', status: 400 }, // Foreign key violation
  '23514': { code: 'VALIDATION_CONSTRAINT_VIOLATION', status: 400 }, // Check constraint
  '42501': { code: 'AUTH_FORBIDDEN', status: 403 }, // Insufficient privilege

  // Rate limiting
  'rate_limit_exceeded': { code: 'RATE_LIMIT_EXCEEDED', status: 429 },
};

/**
 * Convert Supabase error to GoatError
 */
export function fromSupabaseError(error: {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}): GoatError {
  const mapping = error.code ? SUPABASE_ERROR_MAP[error.code] : undefined;

  if (mapping) {
    return new GoatError(mapping.code, error.message, {
      status: mapping.status,
      details: {
        context: {
          supabaseCode: error.code,
          hint: error.hint,
        },
      },
    });
  }

  // Check for specific error message patterns
  if (error.message.includes('duplicate key')) {
    return new GoatError('CONFLICT_DUPLICATE', 'This item already exists', {
      status: 409,
    });
  }

  if (error.message.includes('violates foreign key')) {
    return new GoatError('VALIDATION_CONSTRAINT_VIOLATION', 'Referenced item does not exist', {
      status: 400,
    });
  }

  if (error.message.includes('permission denied') || error.message.includes('not authorized')) {
    return new GoatError('AUTH_FORBIDDEN', 'You do not have permission to perform this action', {
      status: 403,
    });
  }

  // Generic database error (sanitized message)
  return new GoatError('SERVER_DATABASE_ERROR', 'A database error occurred. Please try again.', {
    status: 500,
    details: {
      context: process.env.NODE_ENV === 'development' ? { original: error.message } : undefined,
    },
  });
}

// ============================================================================
// API Error Handler Wrapper
// ============================================================================

/**
 * Wrap an API route handler with centralized error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (req) => {
 *   const { data, error } = await supabase.from('lists').select();
 *
 *   if (error) {
 *     throw fromSupabaseError(error);
 *   }
 *
 *   return NextResponse.json({ success: true, data });
 * });
 * ```
 */
export function withErrorHandler<T = unknown>(
  handler: RouteHandler<T>,
  options?: {
    /** User ID extractor for logging */
    getUserId?: (req: NextRequest) => string | undefined;
  }
): RouteHandler<T | ErrorResponse> {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse<T | ErrorResponse>> => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Convert to GoatError
      const goatError = toApiError(error);

      // Extract user ID for logging
      const userId = options?.getUserId?.(req);

      // Log the error
      logError(goatError, req, userId);

      // Return standardized error response
      return buildErrorResponse(goatError, req);
    }
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Assert that a value is truthy, or throw a validation error
 */
export function assertRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined || value === '') {
    throw ValidationError.required(fieldName);
  }
}

/**
 * Assert that a condition is true, or throw a validation error
 */
export function assertValid(
  condition: boolean,
  message: string,
  fieldErrors?: Record<string, string[]>
): asserts condition {
  if (!condition) {
    throw new ValidationError(message, fieldErrors);
  }
}

/**
 * Assert that a numeric value is an integer within a given range, or throw a validation error
 */
export function assertIntRange(
  value: unknown,
  fieldName: string,
  min: number,
  max: number
): asserts value is number {
  const num = typeof value === 'string' ? Number(value) : value;
  if (typeof num !== 'number' || !Number.isInteger(num) || num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be an integer between ${min} and ${max}`,
      { [fieldName]: [`Must be an integer between ${min} and ${max}`] }
    );
  }
}

/**
 * Parse and validate JSON body from request
 */
export async function parseBody<T>(
  req: NextRequest,
  validator?: (body: unknown) => body is T
): Promise<T> {
  try {
    const body = await req.json();

    if (validator && !validator(body)) {
      throw new ValidationError('Invalid request body');
    }

    return body as T;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Could not parse request body. Please check your JSON format.');
  }
}

// ============================================================================
// Common Response Helpers
// ============================================================================

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse<{ success: true; data: T }> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T): NextResponse<{ success: true; data: T }> {
  return successResponse(data, 201);
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Throw a not found error
 */
export function notFound(resourceType: string, resourceId?: string): never {
  throw new NotFoundError(resourceType, resourceId);
}

/**
 * Throw an unauthorized error
 */
export function unauthorized(message?: string): never {
  throw new AuthenticationError('AUTH_NOT_AUTHENTICATED', message);
}

/**
 * Throw a forbidden error
 */
export function forbidden(message?: string): never {
  throw new GoatError('AUTH_FORBIDDEN', message || 'You do not have permission to perform this action', {
    status: 403,
  });
}

/**
 * Throw a bad request error
 */
export function badRequest(message: string, fieldErrors?: Record<string, string[]>): never {
  throw new ValidationError(message, fieldErrors);
}

/**
 * Throw an internal server error
 */
export function serverError(message?: string): never {
  throw new ServerError('SERVER_INTERNAL_ERROR', message);
}
