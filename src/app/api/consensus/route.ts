import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

import type { TypedSupabaseClient } from '@/lib/supabase/types';
import type {
  ItemConsensusWithClusters,
  ConsensusAPIResponse,
  PeerCluster,
} from '@/types/consensus';

/**
 * GET /api/consensus
 *
 * Returns consensus ranking data for items in a category.
 * This endpoint aggregates ranking data from all users to provide:
 * - Median/average ranks
 * - Volatility (how contested each item is)
 * - Peer clusters with similar ranking patterns
 * - Confidence scores
 *
 * Query params:
 * - category: Category to get consensus for (required)
 * - subcategory: Optional subcategory filter
 * - itemIds: Optional comma-separated list of specific item IDs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const itemIds = searchParams.get('itemIds')?.split(',').filter(Boolean);

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Try real consensus data from item_consensus_cache first
    const consensusData = await getRealConsensusData(supabase, category, itemIds)
      || await generateConsensusData(supabase, category, subcategory, itemIds);

    const response: ConsensusAPIResponse = {
      items: consensusData,
      category,
      lastUpdated: new Date().toISOString(),
      totalUsers: Object.values(consensusData).reduce((max, c) =>
        Math.max(max, c.totalRankings || 0), 0),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching consensus data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consensus data' },
      { status: 500 }
    );
  }
}

/**
 * Fetch real consensus data from item_consensus_cache table.
 * Returns null if no data exists so caller can fall back to mock.
 */
async function getRealConsensusData(
  supabase: TypedSupabaseClient,
  category: string,
  itemIds: string[] | undefined
): Promise<Record<string, ItemConsensusWithClusters> | null> {
  let query = supabase
    .from('item_consensus_cache')
    .select('*')
    .eq('category', category);

  if (itemIds && itemIds.length > 0) {
    query = query.in('item_id', itemIds);
  }

  const { data, error } = await query.limit(500);

  if (error || !data || data.length === 0) return null;

  const result: Record<string, ItemConsensusWithClusters> = {};

  for (const row of data) {
    const avg = Number(row.average_position) || 0;
    const median = row.median_position || Math.round(avg);
    const vol = Number(row.volatility) || 0;
    const stdDev = Number(row.position_std_dev) || 0;
    const dist = (row.distribution || {}) as Record<string, number>;

    // Convert string keys to number keys for distribution
    const distribution: Record<number, number> = {};
    for (const [k, v] of Object.entries(dist)) {
      distribution[Number(k)] = v as number;
    }

    result[row.item_id] = {
      itemId: row.item_id,
      medianRank: median,
      averageRank: avg,
      averagePosition: avg,
      volatility: vol * 10,
      totalRankings: row.total_rankings || 0,
      confidence: Number(row.confidence) || 0,
      distribution,
      modeRank: median,
      percentiles: (row.percentiles as { p25?: number; p50?: number; p75?: number }) || {
        p25: Math.max(1, Math.round(avg - stdDev)),
        p50: Math.round(avg),
        p75: Math.min(50, Math.round(avg + stdDev)),
      },
      peerClusters: [],
    };
  }

  return result;
}

/**
 * Generate consensus data for items
 *
 * This function generates realistic-looking consensus data.
 * In production, this would be replaced with actual database aggregations.
 */
async function generateConsensusData(
  supabase: TypedSupabaseClient,
  category: string,
  subcategory: string | null,
  itemIds: string[] | undefined
): Promise<Record<string, ItemConsensusWithClusters>> {
  // Fetch items from the database
  let query = supabase
    .from('top_items')
    .select('id, title, name')
    .eq('category', category);

  if (subcategory) {
    query = query.eq('subcategory', subcategory);
  }

  if (itemIds && itemIds.length > 0) {
    query = query.in('id', itemIds);
  }

  const { data: items, error } = await query.limit(200);

  if (error) {
    console.error('Error fetching items for consensus:', error);
    return {};
  }

  const consensusData: Record<string, ItemConsensusWithClusters> = {};

  // Define peer clusters (these would come from actual user clustering in production)
  const peerClusters: PeerCluster[] = [
    {
      clusterId: 'critics',
      label: "Critics' Choice",
      userCount: 89,
      clusterMedianRank: 0,
      color: 'purple',
    },
    {
      clusterId: 'mainstream',
      label: 'Fan Favorites',
      userCount: 234,
      clusterMedianRank: 0,
      color: 'cyan',
    },
    {
      clusterId: 'purists',
      label: 'Classic Purists',
      userCount: 56,
      clusterMedianRank: 0,
      color: 'amber',
    },
  ];

  for (const item of items || []) {
    // Generate deterministic but varied consensus data based on item ID
    const seed = hashCode(item.id);
    const baseRank = (seed % 50) + 1;
    const volatility = ((seed * 7) % 80) / 10; // 0-8 range
    const totalRankings = ((seed * 13) % 300) + 20;

    // Generate distribution
    const distribution: Record<number, number> = {};
    const spreadPositions = Math.min(10, Math.ceil(volatility * 1.5));

    for (let i = 0; i < spreadPositions; i++) {
      const position = Math.max(1, Math.min(50, baseRank + i - Math.floor(spreadPositions / 2)));
      const count = Math.floor(totalRankings / spreadPositions * (1 + Math.random() * 0.5));
      distribution[position] = count;
    }

    // Calculate confidence based on sample size and agreement
    const confidence = Math.min(0.95, (totalRankings / 200) * (1 - volatility / 10));

    // Generate peer cluster rankings
    const itemPeerClusters = peerClusters.map(cluster => ({
      ...cluster,
      clusterMedianRank: Math.max(
        1,
        Math.min(50, baseRank + (hashCode(item.id + cluster.clusterId) % 10) - 5)
      ),
    }));

    consensusData[item.id] = {
      itemId: item.id,
      medianRank: baseRank,
      averageRank: baseRank + (volatility / 5),
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

/**
 * Simple hash function for deterministic random values
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
