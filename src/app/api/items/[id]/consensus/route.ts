/**
 * GET /api/items/[id]/consensus
 *
 * Returns consensus statistics for a specific item from item_consensus_cache.
 * Used by ItemContextMenu and ItemStatsTooltip for displaying community ranking data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ConsensusData {
  itemId: string;
  category: string;
  totalRankings: number;
  averagePosition: number | null;
  medianPosition: number | null;
  consensusLevel: 'unanimous' | 'strong' | 'moderate' | 'mixed' | 'controversial' | null;
  volatility: number | null;
  confidence: number | null;
  distribution: Record<string, number>;
  percentiles: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
  };
  lastCalculated: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch consensus data for the item
    // Note: item_consensus_cache table exists but isn't in generated types yet
    const { data, error } = await supabase
      .from('item_consensus_cache' as any)
      .select(`
        item_id,
        category,
        total_rankings,
        average_position,
        median_position,
        consensus_level,
        volatility,
        confidence,
        distribution,
        percentiles,
        last_calculated
      `)
      .eq('item_id', id)
      .single() as { data: any; error: any };

    if (error) {
      // Not found is not an error - just means no consensus data yet
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          itemId: id,
          hasData: false,
          message: 'No consensus data available for this item yet',
        });
      }
      throw error;
    }

    // Transform to camelCase for frontend
    const consensusData: ConsensusData = {
      itemId: data.item_id,
      category: data.category,
      totalRankings: data.total_rankings || 0,
      averagePosition: data.average_position,
      medianPosition: data.median_position,
      consensusLevel: data.consensus_level,
      volatility: data.volatility,
      confidence: data.confidence,
      distribution: data.distribution || {},
      percentiles: data.percentiles || { p25: null, p50: null, p75: null },
      lastCalculated: data.last_calculated,
    };

    return NextResponse.json({
      ...consensusData,
      hasData: true,
    });
  } catch (error) {
    console.error('[API] Error fetching item consensus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consensus data' },
      { status: 500 }
    );
  }
}
