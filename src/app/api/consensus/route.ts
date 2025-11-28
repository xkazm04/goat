import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // For now, generate mock consensus data since we don't have a rankings table yet
    // In production, this would aggregate real user rankings
    const consensusData = await generateConsensusData(
      supabase,
      category,
      subcategory,
      itemIds
    );

    const response: ConsensusAPIResponse = {
      items: consensusData,
      category,
      lastUpdated: new Date().toISOString(),
      totalUsers: Math.floor(Math.random() * 500) + 100, // Mock for now
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
 * Generate consensus data for items
 *
 * This function generates realistic-looking consensus data.
 * In production, this would be replaced with actual database aggregations.
 */
async function generateConsensusData(
  supabase: any,
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
