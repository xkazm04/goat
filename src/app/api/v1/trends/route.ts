import { NextRequest, NextResponse } from 'next/server';

import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  createApiHeaders,
  apiError,
  handleCors,
} from '@/lib/api/public-api';
import { createClient } from '@/lib/supabase/server';

import type { ItemTrendResponse, TrendDataPoint } from '@/types/api-keys';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/trends
 *
 * Historical trend data for ranking analysis.
 * Requires 'pro' tier or higher API key.
 *
 * Query params:
 * - itemId (required): Item ID to get trends for
 * - period: Time period ('7d', '30d', '90d', '1y')
 * - granularity: Data granularity ('day', 'week', 'month')
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

  // Check if trends feature is available
  if (!keyValidation.features.trends) {
    // No /pricing route exists in this app (see analytics/route.ts); the old
    // message pointed a 403'd caller at a 404.
    return apiError(
      'Trends require the Pro tier or higher',
      403,
      'FEATURE_NOT_AVAILABLE'
    );
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

  const searchParams = request.nextUrl.searchParams;
  const itemId = searchParams.get('itemId');
  const period = searchParams.get('period') || '30d';
  const granularity = (searchParams.get('granularity') || 'day') as 'day' | 'week' | 'month';

  if (!itemId) {
    return apiError('itemId is required', 400, 'MISSING_ITEM_ID');
  }

  try {
    const supabase = await createClient();

    // Fetch item
    const { data: item, error } = await supabase
      .from('top_items')
      .select('id, name, category')
      .eq('id', itemId)
      .single();

    if (error || !item) {
      return apiError('Item not found', 404, 'ITEM_NOT_FOUND');
    }

    // Calculate period
    const periodDays: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = periodDays[period] || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Generate trend data points
    const normalizedItem = { ...item, selection_count: undefined };
    const seed = hashCode(item.id);
    const dataPoints = generateTrendDataPoints(normalizedItem, startDate, endDate, granularity);

    // Calculate trend direction
    const startRank = dataPoints[0]?.rank || 10;
    const endRank = dataPoints[dataPoints.length - 1]?.rank || 10;
    const rankChange = startRank - endRank;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (rankChange > 2) direction = 'up';
    else if (rankChange < -2) direction = 'down';

    const response: ItemTrendResponse = {
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        granularity,
      },
      trend: {
        direction,
        magnitude: Math.abs(rankChange),
        startRank,
        endRank,
        // Mock volatility change in [-1, 1) — seeded, so two identical requests
        // agree (the rest of this response is already seed-derived).
        volatilityChange: ((seed % 200) - 100) / 100,
      },
      dataPoints,
    };

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error('Error in trends API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * Generate mock trend data points
 * In production, this would query historical ranking data
 */
function generateTrendDataPoints(
  item: { id: string; selection_count?: number },
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month'
): TrendDataPoint[] {
  const dataPoints: TrendDataPoint[] = [];
  const seed = hashCode(item.id);

  // Calculate base rank from selection count
  const baseRank = Math.min(50, Math.max(1, 50 - ((item.selection_count || 0) / 10)));

  // Determine number of data points based on granularity
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);

  let stepDays: number;
  switch (granularity) {
    case 'week':
      stepDays = 7;
      break;
    case 'month':
      stepDays = 30;
      break;
    default:
      stepDays = 1;
  }

  let currentDate = new Date(startDate);
  let index = 0;
  let previousRank = baseRank + ((seed % 10) - 5);

  while (currentDate <= endDate) {
    // Generate some variance with a trend
    const noise = (Math.sin(index * 0.5 + seed) * 3);
    const trend = (index / (totalDays / stepDays)) * ((seed % 2 === 0) ? -3 : 3);
    const rank = Math.max(1, Math.min(50, Math.round(previousRank + noise + trend * 0.1)));

    // Confidence increases with more data
    const confidence = Math.min(0.95, 0.5 + (index / (totalDays / stepDays)) * 0.3);

    // Ranking count varies per point — deterministically, from the same seed
    // as the rank noise, so a replayed request yields the same series.
    const rankingCount = Math.floor(
      (item.selection_count || 50) / (totalDays / stepDays) + Math.sin(index * 1.3 + seed) * 10
    );

    dataPoints.push({
      date: currentDate.toISOString().split('T')[0],
      rank,
      rankingCount: Math.max(0, rankingCount),
      confidence: Math.round(confidence * 1000) / 1000,
    });

    previousRank = rank;
    currentDate = new Date(currentDate.getTime() + stepDays * msPerDay);
    index++;
  }

  return dataPoints;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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
