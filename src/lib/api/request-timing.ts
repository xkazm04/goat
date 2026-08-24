/**
 * Lightweight request timing and tracing for API routes.
 *
 * Provides a `withTiming` wrapper that logs request duration, response status,
 * and a correlation requestId for each request. Designed to compose with
 * `withErrorHandler` from the error framework.
 */

import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

let requestCounter = 0;

/** Generate a short correlation ID: timestamp-based + counter */
function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const count = (++requestCounter).toString(36);
  return `req-${ts}-${count}`;
}

/**
 * Wrap an API route handler with request timing and tracing.
 *
 * Logs: requestId, method, path, duration (ms), and response status.
 * Attaches `x-request-id` and `server-timing` headers to the response.
 */
export function withTiming(
  handler: RouteHandler,
  routeLabel?: string,
): RouteHandler {
  return async (req, context) => {
    const requestId = generateRequestId();
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
    const status = response.status;

    console.log(
      `[timing] ${requestId} ${method} ${label} ${status} ${duration}ms`,
    );

    // Attach tracing headers
    response.headers.set('x-request-id', requestId);
    response.headers.set('server-timing', `total;dur=${duration}`);

    return response;
  };
}
