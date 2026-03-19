/**
 * Batch API Endpoint
 *
 * Processes multiple API requests in a single HTTP call.
 * Uses direct in-process handler invocation instead of loopback HTTP,
 * eliminating TCP/serialization overhead (~5-20ms per sub-request).
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// =============================================================================
// Types
// =============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteModule = Record<string, any>;

interface BatchRequest {
  id: string;
  endpoint: string;
  method: HttpMethod;
  data?: unknown;
  priority?: 'urgent' | 'normal' | 'low';
}

interface BatchResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timing?: number;
}

interface BatchResult {
  responses: BatchResponse[];
  totalTime: number;
  batchSize: number;
}

interface RouteMatch {
  importModule: () => Promise<RouteModule>;
  params: Record<string, string>;
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  /** Maximum requests per batch */
  maxBatchSize: 50,
  /** Request timeout in ms */
  requestTimeout: 30000,
  /** Aggregate timeout for entire batch in ms */
  aggregateTimeout: 60000,
  /** Allowed endpoint patterns (security) */
  allowedEndpoints: [
    /^\/api\/top\/.*/,
    /^\/api\/lists.*/,
    /^\/api\/items.*/,
    /^\/api\/blueprints.*/,
    /^\/api\/consensus.*/,
    /^\/api\/search.*/,
    /^\/api\/share.*/,
    /^\/api\/badges.*/,
    /^\/api\/activities.*/,
    /^\/api\/recommendation.*/,
    /^\/api\/personalization.*/,
  ],
  /** Denied endpoints (security) */
  deniedEndpoints: [
    /^\/api\/webhooks.*/,
    /^\/api\/admin.*/,
    /^\/api\/batch.*/, // Prevent recursive batching
    /^\/api\/agent-bridge.*/,
  ],
};

// =============================================================================
// Route Registry
// =============================================================================

interface RouteEntry {
  pattern: RegExp;
  paramNames: string[];
  importModule: () => Promise<RouteModule>;
}

/**
 * Convert a Next.js-style route path to a regex pattern.
 * e.g. "/api/lists/[id]/items/[itemId]/scores" =>
 *   /^\/api\/lists\/([^/]+)\/items\/([^/]+)\/scores$/
 *   with paramNames: ["id", "itemId"]
 */
function buildRouteEntry(
  routePath: string,
  importModule: () => Promise<RouteModule>
): RouteEntry {
  const paramNames: string[] = [];
  const regexStr = routePath.replace(/\[(\w+)\]/g, (_match, paramName: string) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  return {
    pattern: new RegExp(`^${regexStr}$`),
    paramNames,
    importModule,
  };
}

// Routes ordered from most-specific (longest) to least-specific so that
// e.g. /api/lists/[id]/items/[itemId]/scores matches before /api/lists/[id]/items
const ROUTE_REGISTRY: RouteEntry[] = [
  // --- /api/top ---
  buildRouteEntry('/api/top/groups/categories/[category]', () => import('@/app/api/top/groups/categories/[category]/route')),
  buildRouteEntry('/api/top/groups/search/suggestions', () => import('@/app/api/top/groups/search/suggestions/route')),
  buildRouteEntry('/api/top/groups/[id]/items', () => import('@/app/api/top/groups/[id]/items/route')),
  buildRouteEntry('/api/top/groups/[id]', () => import('@/app/api/top/groups/[id]/route')),
  buildRouteEntry('/api/top/groups', () => import('@/app/api/top/groups/route')),
  buildRouteEntry('/api/top/items/[id]', () => import('@/app/api/top/items/[id]/route')),
  buildRouteEntry('/api/top/items', () => import('@/app/api/top/items/route')),

  // --- /api/lists ---
  buildRouteEntry('/api/lists/[id]/items/[itemId]/scores', () => import('@/app/api/lists/[id]/items/[itemId]/scores/route')),
  buildRouteEntry('/api/lists/[id]/criteria', () => import('@/app/api/lists/[id]/criteria/route')),
  buildRouteEntry('/api/lists/[id]/items', () => import('@/app/api/lists/[id]/items/route')),
  buildRouteEntry('/api/lists/[id]', () => import('@/app/api/lists/[id]/route')),
  buildRouteEntry('/api/lists/featured', () => import('@/app/api/lists/featured/route')),
  buildRouteEntry('/api/lists/create-with-user', () => import('@/app/api/lists/create-with-user/route')),
  buildRouteEntry('/api/lists/thumbnails', () => import('@/app/api/lists/thumbnails/route')),
  buildRouteEntry('/api/lists', () => import('@/app/api/lists/route')),

  // --- /api/items ---
  buildRouteEntry('/api/items/[id]/details', () => import('@/app/api/items/[id]/details/route')),
  buildRouteEntry('/api/items/[id]/consensus', () => import('@/app/api/items/[id]/consensus/route')),
  buildRouteEntry('/api/items/[id]/activity', () => import('@/app/api/items/[id]/activity/route')),
  buildRouteEntry('/api/items/batch-enrich', () => import('@/app/api/items/batch-enrich/route')),
  buildRouteEntry('/api/items/validate', () => import('@/app/api/items/validate/route')),
  buildRouteEntry('/api/items/enrich', () => import('@/app/api/items/enrich/route')),
  buildRouteEntry('/api/items/stats', () => import('@/app/api/items/stats/route')),

  // --- /api/blueprints ---
  buildRouteEntry('/api/blueprints/[slugOrId]/clone', () => import('@/app/api/blueprints/[slugOrId]/clone/route')),
  buildRouteEntry('/api/blueprints/[slugOrId]', () => import('@/app/api/blueprints/[slugOrId]/route')),
  buildRouteEntry('/api/blueprints', () => import('@/app/api/blueprints/route')),

  // --- /api/consensus ---
  buildRouteEntry('/api/consensus/submit', () => import('@/app/api/consensus/submit/route')),
  buildRouteEntry('/api/consensus/[listId]', () => import('@/app/api/consensus/[listId]/route')),
  buildRouteEntry('/api/consensus', () => import('@/app/api/consensus/route')),

  // --- /api/search ---
  buildRouteEntry('/api/search', () => import('@/app/api/search/route')),

  // --- /api/share ---
  buildRouteEntry('/api/share/analytics', () => import('@/app/api/share/analytics/route')),
  buildRouteEntry('/api/share/[code]/fork', () => import('@/app/api/share/[code]/fork/route')),
  buildRouteEntry('/api/share/[code]', () => import('@/app/api/share/[code]/route')),
  buildRouteEntry('/api/share', () => import('@/app/api/share/route')),

  // --- /api/badges ---
  buildRouteEntry('/api/badges', () => import('@/app/api/badges/route')),

  // --- /api/activities ---
  buildRouteEntry('/api/activities', () => import('@/app/api/activities/route')),

  // --- /api/recommendation ---
  buildRouteEntry('/api/recommendation', () => import('@/app/api/recommendation/route')),

  // --- /api/personalization ---
  buildRouteEntry('/api/personalization/profile', () => import('@/app/api/personalization/profile/route')),
  buildRouteEntry('/api/personalization/recommend', () => import('@/app/api/personalization/recommend/route')),
  buildRouteEntry('/api/personalization/track', () => import('@/app/api/personalization/track/route')),
];

function matchRoute(endpoint: string): RouteMatch | null {
  // Strip query string for matching
  const pathOnly = endpoint.split('?')[0];

  for (const entry of ROUTE_REGISTRY) {
    const match = pathOnly.match(entry.pattern);
    if (match) {
      const params: Record<string, string> = {};
      entry.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { importModule: entry.importModule, params };
    }
  }
  return null;
}

// =============================================================================
// Security Validation
// =============================================================================

function isEndpointAllowed(endpoint: string): boolean {
  for (const pattern of CONFIG.deniedEndpoints) {
    if (pattern.test(endpoint)) {
      return false;
    }
  }
  for (const pattern of CONFIG.allowedEndpoints) {
    if (pattern.test(endpoint)) {
      return true;
    }
  }
  return false;
}

function validateRequest(request: BatchRequest): string | null {
  if (!request.id || typeof request.id !== 'string') {
    return 'Request must have a valid id';
  }
  if (!request.endpoint || typeof request.endpoint !== 'string') {
    return 'Request must have a valid endpoint';
  }
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return 'Request must have a valid method (GET, POST, PUT, PATCH, DELETE)';
  }
  if (!isEndpointAllowed(request.endpoint)) {
    return `Endpoint not allowed in batch requests: ${request.endpoint}`;
  }
  return null;
}

// =============================================================================
// Direct Handler Invocation
// =============================================================================

async function executeRequest(
  request: BatchRequest,
  parentHeaders: Headers
): Promise<BatchResponse> {
  const startTime = Date.now();

  try {
    // Match endpoint to a route handler
    const routeMatch = matchRoute(request.endpoint);
    if (!routeMatch) {
      return {
        id: request.id,
        success: false,
        error: {
          code: 'NO_ROUTE',
          message: `No route handler found for: ${request.endpoint}`,
        },
        timing: Date.now() - startTime,
      };
    }

    // Load the route module
    const mod = await routeMatch.importModule();
    const handler = mod[request.method];
    if (!handler) {
      return {
        id: request.id,
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${request.method} not supported for: ${request.endpoint}`,
        },
        timing: Date.now() - startTime,
      };
    }

    // Build a synthetic URL
    let url = `http://localhost${request.endpoint}`;
    if (request.method === 'GET' && request.data && typeof request.data === 'object') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(request.data)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build a synthetic NextRequest (in-process, no network)
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (parentHeaders.get('authorization')) {
      headers.set('Authorization', parentHeaders.get('authorization')!);
    }
    if (parentHeaders.get('cookie')) {
      headers.set('Cookie', parentHeaders.get('cookie')!);
    }

    const body =
      request.method !== 'GET' && request.method !== 'DELETE' && request.data
        ? JSON.stringify(request.data)
        : undefined;

    const syntheticRequest = new NextRequest(url, {
      method: request.method,
      headers,
      body,
    });

    // Invoke handler directly — no HTTP round-trip
    const context = { params: Promise.resolve(routeMatch.params) };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const response = await Promise.race([
      handler(syntheticRequest, context),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), CONFIG.requestTimeout);
      }),
    ]).finally(() => {
      clearTimeout(timeoutId);
    });

    // Parse response body
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return {
        id: request.id,
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message:
            typeof data === 'object' && data !== null && 'error' in data
              ? String((data as { error: unknown }).error)
              : `Request failed with status ${response.status}`,
          details: data,
        },
        timing: Date.now() - startTime,
      };
    }

    return {
      id: request.id,
      success: true,
      data,
      timing: Date.now() - startTime,
    };
  } catch (error) {
    const timing = Date.now() - startTime;

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return {
        id: request.id,
        success: false,
        error: {
          code: 'TIMEOUT',
          message: `Request timed out after ${CONFIG.requestTimeout}ms`,
        },
        timing,
      };
    }

    return {
      id: request.id,
      success: false,
      error: {
        code: 'HANDLER_ERROR',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      },
      timing,
    };
  }
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const requests = body.requests as BatchRequest[] | undefined;

    if (!requests || !Array.isArray(requests)) {
      return NextResponse.json(
        { error: 'Request body must contain a "requests" array' },
        { status: 400 }
      );
    }

    if (requests.length === 0) {
      return NextResponse.json(
        { responses: [], totalTime: 0, batchSize: 0 } satisfies BatchResult,
        { status: 200 }
      );
    }

    if (requests.length > CONFIG.maxBatchSize) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${CONFIG.maxBatchSize} requests` },
        { status: 400 }
      );
    }

    // Validate each request
    const validationErrors: { id: string; error: string }[] = [];
    for (const req of requests) {
      const error = validateRequest(req);
      if (error) {
        validationErrors.push({ id: req.id || 'unknown', error });
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid requests in batch', details: validationErrors },
        { status: 400 }
      );
    }

    // Sort by priority (urgent first)
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    const sortedRequests = [...requests].sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    // Execute all requests in parallel with an aggregate timeout.
    // Individual requests have their own 30s timeout, but the entire batch
    // is capped at 60s to prevent a single connection from hanging for minutes.
    const responses: BatchResponse[] = new Array(sortedRequests.length);
    const completed = new Set<number>();

    const aggregateController = new AbortController();
    const aggregateTimer = setTimeout(() => {
      aggregateController.abort();
    }, CONFIG.aggregateTimeout);

    const promises = sortedRequests.map(async (req, index) => {
      const result = await executeRequest(req, request.headers);
      if (!aggregateController.signal.aborted) {
        responses[index] = result;
        completed.add(index);
      }
      return result;
    });

    try {
      await Promise.race([
        Promise.all(promises),
        new Promise<never>((_, reject) => {
          aggregateController.signal.addEventListener('abort', () => {
            reject(new Error('AGGREGATE_TIMEOUT'));
          });
        }),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AGGREGATE_TIMEOUT') {
        // Fill in TIMEOUT responses for incomplete requests
        for (let i = 0; i < sortedRequests.length; i++) {
          if (!completed.has(i)) {
            responses[i] = {
              id: sortedRequests[i].id,
              success: false,
              error: {
                code: 'TIMEOUT',
                message: `Batch aggregate timeout exceeded (${CONFIG.aggregateTimeout}ms)`,
              },
              timing: Date.now() - startTime,
            };
          }
        }
      } else {
        throw error;
      }
    } finally {
      clearTimeout(aggregateTimer);
    }

    // Sort responses back to original order (by id)
    const responseMap = new Map(responses.map((r) => [r.id, r]));
    const orderedResponses = requests.map((req) => responseMap.get(req.id)!);

    const timedOutCount = responses.filter(
      (r) => !r.success && r.error?.code === 'TIMEOUT' && r.error.message.includes('aggregate')
    ).length;
    const result: BatchResult = {
      responses: orderedResponses,
      totalTime: Date.now() - startTime,
      batchSize: requests.length,
    };

    const successCount = responses.filter((r) => r.success).length;
    console.log(
      `📦 [Batch API] Processed ${requests.length} requests in ${result.totalTime}ms ` +
        `(${successCount} success, ${requests.length - successCount - timedOutCount} failed` +
        `${timedOutCount > 0 ? `, ${timedOutCount} timed out` : ''}) [direct]`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Batch API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process batch request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
