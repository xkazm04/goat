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
 * GET /api/v1/rankings/aggregate
 *
 * Aggregates ranking submissions for a category to produce live consensus results.
 * Used by interactive widgets to display real-time aggregate rankings.
 *
 * Query params:
 * - category (required): Category to aggregate
 * - widgetId: Optional widget ID to scope results
 * - limit: Number of results (default 10, max 50)
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const widgetId = searchParams.get('widgetId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  if (!category) {
    return apiError('Category is required', 400, 'MISSING_CATEGORY');
  }

  try {
    const supabase = await createClient();

    // ranking_submissions is a new table not yet in the generated DB types
    const sb = supabase as any;
    let query = sb
      .from('ranking_submissions')
      .select('rankings')
      .eq('category', category);

    if (widgetId) {
      query = query.eq('widget_id', widgetId);
    }

    const { data: submissions, error } = await query as {
      data: Array<{ rankings: unknown }> | null;
      error: { code: string; message: string } | null;
    };

    // If table doesn't exist yet, return empty results
    if (error && error.code === '42P01') {
      const headers = createApiHeaders(rateLimit, keyValidation.tier);
      headers.set('Content-Type', 'application/json');
      return new NextResponse(
        JSON.stringify({
          category,
          totalSubmissions: 0,
          consensus: [],
        }),
        { status: 200, headers }
      );
    }

    if (error) {
      return apiError('Failed to fetch submissions', 500, 'DATABASE_ERROR');
    }

    // Aggregate rankings: compute average rank and count per itemId
    const itemStats = new Map<string, { totalRank: number; count: number }>();

    for (const submission of (submissions || []) as Array<{ rankings: unknown }>) {
      const rankings = submission.rankings as Array<{ itemId: string; rank: number }>;
      if (!Array.isArray(rankings)) continue;

      for (const { itemId, rank } of rankings) {
        const stats = itemStats.get(itemId) || { totalRank: 0, count: 0 };
        stats.totalRank += rank;
        stats.count += 1;
        itemStats.set(itemId, stats);
      }
    }

    // Sort by average rank (lower = better)
    const sorted = Array.from(itemStats.entries())
      .map(([itemId, stats]) => ({
        itemId,
        averageRank: stats.totalRank / stats.count,
        submissionCount: stats.count,
      }))
      .sort((a, b) => a.averageRank - b.averageRank)
      .slice(0, limit);

    // Fetch item details for the top items
    const itemIds = sorted.map((s) => s.itemId);
    let itemDetails: Record<string, { name: string; image_url: string | null }> = {};

    if (itemIds.length > 0) {
      const { data: items } = await supabase
        .from('top_items')
        .select('id, name, image_url')
        .in('id', itemIds);

      if (items) {
        for (const item of items) {
          itemDetails[item.id] = { name: item.name, image_url: item.image_url };
        }
      }
    }

    // Build consensus results
    const consensus = sorted.map((entry, idx) => ({
      rank: idx + 1,
      itemId: entry.itemId,
      name: itemDetails[entry.itemId]?.name || 'Unknown',
      imageUrl: itemDetails[entry.itemId]?.image_url || null,
      averageRank: Math.round(entry.averageRank * 100) / 100,
      submissionCount: entry.submissionCount,
    }));

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(
      JSON.stringify({
        category,
        totalSubmissions: (submissions || []).length,
        consensus,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in rankings aggregate API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
