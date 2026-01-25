/**
 * Batch API Endpoint
 *
 * Processes multiple API requests in a single HTTP call.
 * Supports parallel execution with per-request error handling.
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// =============================================================================
// Types
// =============================================================================

interface BatchRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  /** Maximum requests per batch */
  maxBatchSize: 50,
  /** Request timeout in ms */
  requestTimeout: 30000,
  /** Maximum total batch time in ms */
  maxBatchTime: 60000,
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
// Security Validation
// =============================================================================

function isEndpointAllowed(endpoint: string): boolean {
  // Check denied first
  for (const pattern of CONFIG.deniedEndpoints) {
    if (pattern.test(endpoint)) {
      return false;
    }
  }

  // Check allowed
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
// Request Execution
// =============================================================================

async function executeRequest(
  request: BatchRequest,
  baseUrl: string,
  headers: Headers
): Promise<BatchResponse> {
  const startTime = Date.now();

  try {
    // Build the URL
    let url = `${baseUrl}${request.endpoint}`;

    // Add query params for GET requests
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

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers
        ...(headers.get('authorization') && {
          Authorization: headers.get('authorization')!,
        }),
        ...(headers.get('cookie') && {
          Cookie: headers.get('cookie')!,
        }),
      },
    };

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'DELETE' && request.data) {
      fetchOptions.body = JSON.stringify(request.data);
    }

    // Execute with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Parse response
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
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const timing = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
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
          code: 'FETCH_ERROR',
          message: error.message,
        },
        timing,
      };
    }

    return {
      id: request.id,
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
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
    // Parse body
    const body = await request.json();
    const requests = body.requests as BatchRequest[] | undefined;

    // Validate requests array
    if (!requests || !Array.isArray(requests)) {
      return NextResponse.json(
        {
          error: 'Request body must contain a "requests" array',
        },
        { status: 400 }
      );
    }

    // Check batch size
    if (requests.length === 0) {
      return NextResponse.json(
        {
          responses: [],
          totalTime: 0,
          batchSize: 0,
        } satisfies BatchResult,
        { status: 200 }
      );
    }

    if (requests.length > CONFIG.maxBatchSize) {
      return NextResponse.json(
        {
          error: `Batch size exceeds maximum of ${CONFIG.maxBatchSize} requests`,
        },
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
        {
          error: 'Invalid requests in batch',
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Get base URL for internal requests
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Sort by priority (urgent first)
    const priorityOrder = { urgent: 0, normal: 1, low: 2 };
    const sortedRequests = [...requests].sort((a, b) => {
      const priorityA = priorityOrder[a.priority || 'normal'];
      const priorityB = priorityOrder[b.priority || 'normal'];
      return priorityA - priorityB;
    });

    // Execute all requests in parallel
    const responses = await Promise.all(
      sortedRequests.map((req) => executeRequest(req, baseUrl, request.headers))
    );

    // Sort responses back to original order (by id)
    const responseMap = new Map(responses.map((r) => [r.id, r]));
    const orderedResponses = requests.map((req) => responseMap.get(req.id)!);

    const result: BatchResult = {
      responses: orderedResponses,
      totalTime: Date.now() - startTime,
      batchSize: requests.length,
    };

    // Log batch stats
    const successCount = responses.filter((r) => r.success).length;
    console.log(
      `📦 [Batch API] Processed ${requests.length} requests in ${result.totalTime}ms ` +
        `(${successCount} success, ${requests.length - successCount} failed)`
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
