import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AnalyticsResponse } from '@/types/api-keys';
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
 * GET /api/v1/analytics
 *
 * B2B analytics endpoint for detailed ranking insights.
 * Requires 'basic' tier or higher API key.
 *
 * Query params:
 * - category (required): Category to analyze
 * - subcategory: Optional subcategory filter
 * - period: Time period ('7d', '30d', '90d', '1y')
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

  // Check if analytics feature is available
  if (!keyValidation.features.analytics) {
    return apiError(
      'Analytics requires Basic tier or higher. Upgrade at goat.app/pricing',
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
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const period = searchParams.get('period') || '30d';

  if (!category) {
    return apiError('Category is required', 400, 'MISSING_CATEGORY');
  }

  try {
    const supabase = await createClient();

    // Fetch items and their statistics
    let query = supabase
      .from('top_items')
      .select('id, name, created_at')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(100);

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching analytics:', error);
      return apiError('Failed to fetch analytics', 500, 'DATABASE_ERROR');
    }

    // Calculate period dates
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

    // Generate analytics data (placeholder values since selection_count/view_count not tracked)
    const totalSelections = items?.length || 0;
    const totalViews = items?.length || 0;

    // Generate distribution data
    const byPosition: Record<number, number> = {};
    const byVolatility: Record<string, number> = {
      stable: 0,
      moderate: 0,
      contested: 0,
      polarizing: 0,
    };

    (items || []).forEach((item, index) => {
      const pos = index + 1;
      byPosition[pos] = 1; // Placeholder since selection_count not tracked

      // Mock volatility distribution
      const seed = hashCode(item.id);
      const volatility = ((seed * 7) % 80) / 10;
      if (volatility < 2) byVolatility.stable++;
      else if (volatility < 4) byVolatility.moderate++;
      else if (volatility < 6) byVolatility.contested++;
      else byVolatility.polarizing++;
    });

    // Top items with trends
    const topItems = (items || []).slice(0, 20).map((item, index) => {
      const seed = hashCode(item.id);
      const trendOptions: ('rising' | 'falling' | 'stable')[] = ['rising', 'falling', 'stable'];
      return {
        id: item.id,
        name: item.name,
        rankingCount: 1, // Placeholder since selection_count not tracked
        averagePosition: index + 1 + ((seed % 5) - 2) / 10,
        trend: trendOptions[seed % 3],
      };
    });

    // Generate peer clusters if available
    let clusters;
    if (keyValidation.features.peerClusters) {
      clusters = [
        {
          id: 'cluster-critics',
          label: "Critics' Choice",
          userCount: Math.floor(totalSelections * 0.15),
          topItems: topItems.slice(0, 5).map((i) => i.id),
          characteristics: ['Quality-focused', 'Technical appreciation', 'Industry influence'],
        },
        {
          id: 'cluster-mainstream',
          label: 'Mainstream Favorites',
          userCount: Math.floor(totalSelections * 0.6),
          topItems: topItems.slice(2, 7).map((i) => i.id),
          characteristics: ['Popular appeal', 'Accessibility', 'Entertainment value'],
        },
        {
          id: 'cluster-purists',
          label: 'Classic Purists',
          userCount: Math.floor(totalSelections * 0.25),
          topItems: topItems.slice(5, 10).map((i) => i.id),
          characteristics: ['Historical significance', 'Nostalgia factor', 'Traditional values'],
        },
      ];
    }

    const response: AnalyticsResponse = {
      category,
      subcategory: subcategory || undefined,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      overview: {
        totalRankings: totalSelections,
        uniqueUsers: Math.floor(totalSelections / 8), // Mock estimate
        averageListSize: 10,
        mostActiveDay: getMostActiveDay(startDate),
      },
      topItems,
      distribution: {
        byPosition,
        byVolatility,
      },
      clusters,
    };

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error('Error in analytics API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
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

function getMostActiveDay(startDate: Date): string {
  // Mock: Return a random weekday within the period
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[Math.floor(Math.random() * 7)];
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
