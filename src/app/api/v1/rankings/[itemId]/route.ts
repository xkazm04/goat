import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PublicRankingItem } from '@/types/api-keys';
import {
  extractApiKey,
  validateApiKey,
  checkRateLimit,
  createApiHeaders,
  apiError,
  handleCors,
  toPublicRankingItem,
} from '@/lib/api/public-api';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

/**
 * GET /api/v1/rankings/[itemId]
 *
 * Get ranking data for a specific item.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const { itemId } = await context.params;

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
    const supabase = await createClient();

    const { data: item, error } = await supabase
      .from('top_items')
      .select('id, name, title, image_url, category, subcategory, selection_count, view_count')
      .eq('id', itemId)
      .single();

    if (error || !item) {
      return apiError('Item not found', 404, 'ITEM_NOT_FOUND');
    }

    // Generate consensus data
    const consensus = generateItemConsensus(item);

    const includeExtended = keyValidation.features.peerClusters;
    const rankingItem: PublicRankingItem = toPublicRankingItem(
      item,
      consensus,
      consensus.medianRank,
      includeExtended
    );

    // Add trend data if available
    if (keyValidation.features.trends) {
      rankingItem.extended = rankingItem.extended || {
        distribution: consensus.distribution,
        percentiles: consensus.percentiles,
      };
      rankingItem.extended.trend = {
        direction: consensus.medianRank < 10 ? 'up' : consensus.medianRank > 30 ? 'down' : 'stable',
        change: Math.floor(Math.random() * 5) - 2,
        period: '7d',
      };
    }

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(
      JSON.stringify({
        item: rankingItem,
        meta: {
          category: item.category,
          lastUpdated: new Date().toISOString(),
          apiVersion: '1.0',
        },
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error fetching item ranking:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

function generateItemConsensus(item: { id: string; selection_count?: number }) {
  const seed = hashCode(item.id);
  const baseRank = (seed % 50) + 1;
  const volatility = ((seed * 7) % 80) / 10;
  const totalRankings = Math.max(20, (item.selection_count || 0) + ((seed * 13) % 300));

  const distribution: Record<number, number> = {};
  const spreadPositions = Math.min(10, Math.ceil(volatility * 1.5));
  for (let i = 0; i < spreadPositions; i++) {
    const position = Math.max(1, Math.min(50, baseRank + i - Math.floor(spreadPositions / 2)));
    distribution[position] = Math.floor(totalRankings / spreadPositions);
  }

  const confidence = Math.min(0.95, (totalRankings / 200) * (1 - volatility / 10));

  const peerClusters = [
    { clusterId: 'critics', label: "Critics' Choice", userCount: 89, color: 'purple', clusterMedianRank: Math.max(1, baseRank - 2) },
    { clusterId: 'mainstream', label: 'Fan Favorites', userCount: 234, color: 'cyan', clusterMedianRank: baseRank },
    { clusterId: 'purists', label: 'Classic Purists', userCount: 56, color: 'amber', clusterMedianRank: Math.min(50, baseRank + 3) },
  ];

  return {
    itemId: item.id,
    medianRank: baseRank,
    averageRank: baseRank + volatility / 5,
    volatility,
    totalRankings,
    confidence,
    distribution,
    modeRank: baseRank,
    percentiles: {
      p25: Math.max(1, baseRank - Math.floor(volatility)),
      p50: baseRank,
      p75: Math.min(50, baseRank + Math.floor(volatility)),
    },
    peerClusters,
  };
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
