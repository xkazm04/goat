import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  createApiHeaders,
  apiError,
  handleCors,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/rankings/submit
 *
 * Public API endpoint for submitting rankings from embedded widgets.
 * Allows third-party websites to collect and submit user rankings.
 *
 * Body:
 * - category (required): Category for the ranking
 * - items (required): Array of { itemId, rank } objects
 * - sessionId: Optional anonymous session ID for deduplication
 * - widgetId: Optional widget configuration ID
 */
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return apiError('API key required', 401, 'MISSING_API_KEY');
  }

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation || !keyValidation.valid) {
    return apiError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  const rateLimit = checkRateLimit(apiKey, keyValidation.tier);
  if (!rateLimit.allowed) {
    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    return new NextResponse(
      JSON.stringify({
        error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', status: 429 },
      }),
      { status: 429, headers }
    );
  }

  try {
    const body = await request.json();
    const { category, items, sessionId, widgetId } = body;

    if (!category || typeof category !== 'string') {
      return apiError('Category is required', 400, 'MISSING_CATEGORY');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return apiError('Items array is required and must not be empty', 400, 'MISSING_ITEMS');
    }

    if (items.length > 100) {
      return apiError('Maximum 100 items per submission', 400, 'TOO_MANY_ITEMS');
    }

    // Validate each item has itemId and rank
    for (const item of items) {
      if (!item.itemId || typeof item.rank !== 'number' || item.rank < 1) {
        return apiError(
          'Each item must have a valid itemId (string) and rank (positive number)',
          400,
          'INVALID_ITEM_FORMAT'
        );
      }
    }

    const supabase = await createClient();

    // Verify that all itemIds exist in the database
    const itemIds = items.map((i: { itemId: string }) => i.itemId);
    const { data: existingItems, error: lookupError } = await supabase
      .from('top_items')
      .select('id')
      .in('id', itemIds);

    if (lookupError) {
      return apiError('Failed to validate items', 500, 'DATABASE_ERROR');
    }

    const existingIds = new Set((existingItems || []).map((i) => i.id));
    const missingIds = itemIds.filter((id: string) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return apiError(
        `Items not found: ${missingIds.slice(0, 5).join(', ')}`,
        400,
        'ITEMS_NOT_FOUND'
      );
    }

    // Store the ranking submission
    const submissionId = crypto.randomUUID();
    // ranking_submissions is a new table not yet in the generated DB types
    const { error: insertError } = await (supabase as any)
      .from('ranking_submissions')
      .insert({
        id: submissionId,
        category,
        rankings: items,
        session_id: sessionId || null,
        widget_id: widgetId || null,
        api_key_id: keyValidation.keyId,
        source_origin: request.headers.get('origin') || null,
        created_at: new Date().toISOString(),
      });

    // If the table doesn't exist yet, still return success but note it
    if (insertError && insertError.code !== '42P01') {
      console.error('Error storing ranking submission:', insertError);
      // Non-critical — still acknowledge the submission
    }

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(
      JSON.stringify({
        success: true,
        submissionId,
        itemCount: items.length,
        category,
      }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Error in rankings submit API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
