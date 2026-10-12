/**
 * Lightweight request timing and tracing for API routes.
 *
 * Provides a `withTiming` wrapper that logs request duration, response status,
 * and a correlation requestId for each request. Designed to compose with
 * `withErrorHandler` from the error framework.
 */

import { NextRequest, NextResponse } from 'next/server';

import { getRequestId } from './request-id';

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrap an API route handler with request timing and tracing.
 *
 * Logs: requestId, method, path, duration (ms), and response status.
 * Attaches `x-request-id` and `server-timing` headers to the response.
 *
 * The requestId is the one the CLIENT sent in `X-Request-ID` (request-id.ts —
 * ApiClient stamps every outgoing call with it), or a fresh one for requests
 * that did not carry it. This wrapper used to mint its own `req-…` id from a
 * private counter, so the client's `goat-…` id and the server's log line
 * could never be joined — the end-to-end correlation that request-id.ts
 * describes existed only on the client half.
 */
export function withTiming(
  handler: RouteHandler,
  routeLabel?: string,
): RouteHandler {
  return async (req, context) => {
    const requestId = getRequestId(req);
    const start = performance.now();
    const method = req.method;
    const path = new URL(req.url).pathname;
    const label = routeLabel || path;

    let response: NextResponse;
    try {
      response = await handler(req, context);
    } catch (error) {
      // Re-throw — let withErrorHandler deal with it
      const duration = (performance.now() - start).toFixed(1);
      console.error(`[timing] ${requestId} ${method} ${label} ERROR after ${duration}ms`);
      throw error;
    }

    const duration = (performance.now() - start).toFixed(1);
    const _status = response.status;

    // Attach tracing headers
    response.headers.set('x-request-id', requestId);
    response.headers.set('server-timing', `total;dur=${duration}`);

    return response;
  };
}
