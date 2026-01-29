import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PublicRankingsResponse, PublicRankingItem } from '@/types/api-keys';
import type { ItemConsensusWithClusters } from '@/types/consensus';
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

/**
 * GET /api/v1/rankings
 *
 * Public API endpoint for consensus rankings.
 * Returns ranked items for a category with consensus data.
 *
 * Query params:
 * - category (required): Category to get rankings for
 * - subcategory: Optional subcategory filter
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - sort: Sort order ('rank', 'volatility', 'confidence')
 * - order: Sort direction ('asc', 'desc')
 */
export async function GET(request: NextRequest) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Extract and validate API key
  const apiKey = extractApiKey(request);
  if (!apiKey) {
    return apiError('API key required. Include in Authorization header (Bearer) or X-API-Key header.', 401, 'MISSING_API_KEY');
  }

  const keyValidation = await validateApiKey(apiKey);
  if (!keyValidation || !keyValidation.valid) {
    return apiError('Invalid API key', 401, 'INVALID_API_KEY');
  }

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey, keyValidation.tier);
  if (!rateLimit.allowed) {
    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    return new NextResponse(
      JSON.stringify({
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          retryAfter: Math.ceil(rateLimit.resetIn / 1000),
        },
      }),
      { status: 429, headers }
    );
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
  const sort = searchParams.get('sort') || 'rank';
  const order = searchParams.get('order') || 'asc';

  if (!category) {
    return apiError('Category is required', 400, 'MISSING_CATEGORY');
  }

  try {
    const supabase = await createClient();

    // Fetch items from database
    let query = supabase
      .from('top_items')
      .select('id, name, title, image_url, category, subcategory', { count: 'exact' })
      .eq('category', category);

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    // Determine sort field
    let sortField = 'name';
    if (sort === 'rank') sortField = 'name';
    else if (sort === 'name') sortField = 'name';

    query = query
      .order(sortField, { ascending: order === 'asc' && sort !== 'rank' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data: items, error, count } = await query;

    if (error) {
      console.error('Error fetching rankings:', error);
      return apiError('Failed to fetch rankings', 500, 'DATABASE_ERROR');
    }

    // Normalize items to handle null/undefined
    const normalizedItems = (items || []).map(item => ({
      ...item,
      title: item.title ?? undefined,
      image_url: item.image_url ?? undefined,
      subcategory: item.subcategory ?? null,
    }));

    // Generate consensus data for items
    const consensusData = await generateConsensusData(normalizedItems, category);

    // Sort by consensus rank
    const sortedItems = normalizedItems
      .map((item, index) => ({
        item,
        consensus: consensusData[item.id],
        rank: index + 1 + (page - 1) * pageSize,
      }))
      .sort((a, b) => {
        if (sort === 'rank') {
          return order === 'asc'
            ? a.consensus.medianRank - b.consensus.medianRank
            : b.consensus.medianRank - a.consensus.medianRank;
        }
        if (sort === 'volatility') {
          return order === 'asc'
            ? a.consensus.volatility - b.consensus.volatility
            : b.consensus.volatility - a.consensus.volatility;
        }
        if (sort === 'confidence') {
          return order === 'asc'
            ? a.consensus.confidence - b.consensus.confidence
            : b.consensus.confidence - a.consensus.confidence;
        }
        return 0;
      });

    // Transform to public format
    const includeExtended = keyValidation.features.peerClusters;
    const rankings: PublicRankingItem[] = sortedItems.map(({ item, consensus }, index) =>
      toPublicRankingItem(item, consensus, index + 1 + (page - 1) * pageSize, includeExtended)
    );

    // Calculate total rankings
    const totalRankings = Object.values(consensusData).reduce(
      (sum, c) => sum + c.totalRankings,
      0
    );

    const response: PublicRankingsResponse = {
      rankings,
      meta: {
        category,
        subcategory: subcategory || undefined,
        totalItems: count || 0,
        totalRankings,
        lastUpdated: new Date().toISOString(),
        apiVersion: '1.0',
      },
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasMore: page * pageSize < (count || 0),
      },
    };

    const headers = createApiHeaders(rateLimit, keyValidation.tier);
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(response), { status: 200, headers });
  } catch (error) {
    console.error('Error in rankings API:', error);
    return apiError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * Generate consensus data for items (mock implementation)
 * In production, this would aggregate real user rankings
 */
async function generateConsensusData(
  items: Array<{ id: string; name?: string; selection_count?: number }>,
  category: string
): Promise<Record<string, ItemConsensusWithClusters>> {
  const consensusData: Record<string, ItemConsensusWithClusters> = {};

  const peerClusters = [
    { clusterId: 'critics', label: "Critics' Choice", userCount: 89, color: 'purple' },
    { clusterId: 'mainstream', label: 'Fan Favorites', userCount: 234, color: 'cyan' },
    { clusterId: 'purists', label: 'Classic Purists', userCount: 56, color: 'amber' },
  ];

  for (const item of items) {
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

    const itemPeerClusters = peerClusters.map((cluster) => ({
      ...cluster,
      clusterMedianRank: Math.max(
        1,
        Math.min(50, baseRank + (hashCode(item.id + cluster.clusterId) % 10) - 5)
      ),
    }));

    consensusData[item.id] = {
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
      peerClusters: itemPeerClusters,
    };
  }

  return consensusData;
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
