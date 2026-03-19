/**
 * Request Correlation ID System
 *
 * Generates lightweight correlation IDs for end-to-end request tracing.
 * Each outgoing API request gets a unique ID passed as X-Request-ID header,
 * enabling correlation between client-side logs and server-side logs.
 *
 * Format: `goat-<timestamp36>-<random>`  (~20 chars, URL-safe)
 */

/**
 * Generate a unique request correlation ID.
 * Uses base36 timestamp + random suffix for uniqueness without crypto overhead.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `goat-${timestamp}-${random}`;
}

/** Standard header name for request correlation */
export const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Extract request ID from incoming server request headers.
 * Returns the client-provided ID or generates a new one for non-client requests.
 */
export function getRequestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER) || generateRequestId();
}
