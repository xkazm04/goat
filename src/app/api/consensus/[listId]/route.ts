/**
 * Consensus API Route
 * GET /api/consensus/[listId]
 * Returns community consensus data for a specific list
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  CommunityRanking,
  ItemConsensus,
  ConsensusLevel,
  CONSENSUS_THRESHOLDS,
} from '@/lib/consensus/types';

/**
 * Simulate community data (replace with actual database queries)
 */
function generateMockCommunityData(
  listId: string,
  categoryId: string,
  listSize: number = 50
): CommunityRanking {
  const items: ItemConsensus[] = [];

  for (let i = 0; i < listSize; i++) {
    // Simulate varying consensus levels
    const baseConsensus = Math.random();
    const consensusScore = Math.round(baseConsensus * 100);
    const controversyScore = 100 - consensusScore;

    // Simulate position distribution
    const avgPosition = i + Math.random() * 5 - 2.5;
    const stdDev = (1 - baseConsensus) * 10;
    const variance = stdDev * stdDev;

    // Determine consensus level
    let consensusLevel: ConsensusLevel;
    if (consensusScore >= CONSENSUS_THRESHOLDS.unanimous) {
      consensusLevel = 'unanimous';
    } else if (consensusScore >= CONSENSUS_THRESHOLDS.strong) {
      consensusLevel = 'strong';
    } else if (consensusScore >= CONSENSUS_THRESHOLDS.moderate) {
      consensusLevel = 'moderate';
    } else if (consensusScore >= CONSENSUS_THRESHOLDS.mixed) {
      consensusLevel = 'mixed';
    } else {
      consensusLevel = 'controversial';
    }

    // Build rank distribution
    const rankDistribution = new Map<number, number>();
    const sampleSize = Math.floor(Math.random() * 500) + 100;

    for (let j = 0; j < sampleSize; j++) {
      const pos = Math.round(avgPosition + (Math.random() - 0.5) * stdDev * 2);
      const clampedPos = Math.max(0, Math.min(listSize - 1, pos));
      rankDistribution.set(clampedPos, (rankDistribution.get(clampedPos) || 0) + 1);
    }

    items.push({
      itemId: `item-${listId}-${i}`,
      itemName: `Item ${i + 1}`,
      averagePosition: avgPosition,
      medianPosition: Math.round(avgPosition),
      modePosition: Math.round(avgPosition),
      positionStandardDeviation: stdDev,
      positionVariance: variance,
      rankDistribution,
      percentileDistribution: Array.from({ length: 101 }, (_, p) =>
        Math.round(avgPosition + (p / 100 - 0.5) * stdDev * 2)
      ),
      consensusLevel,
      consensusScore,
      controversyScore,
      sampleSize,
      lastUpdated: Date.now(),
    });
  }

  // Sort by average position
  items.sort((a, b) => a.averagePosition - b.averagePosition);

  // Calculate overall consensus
  const overallConsensus = Math.round(
    items.reduce((sum, item) => sum + item.consensusScore, 0) / items.length
  );

  // Find most controversial and most agreed
  const sortedByControversy = [...items].sort(
    (a, b) => b.controversyScore - a.controversyScore
  );
  const sortedByConsensus = [...items].sort(
    (a, b) => b.consensusScore - a.consensusScore
  );

  return {
    listId,
    categoryId,
    totalRankings: items.reduce((sum, item) => sum + item.sampleSize, 0) / items.length,
    items,
    overallConsensus,
    mostControversial: sortedByControversy.slice(0, 5),
    mostAgreed: sortedByConsensus.slice(0, 5),
    lastUpdated: Date.now(),
  };
}

/**
 * GET handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category') || 'default';
    const listSize = parseInt(searchParams.get('size') || '50', 10);

    // In production, this would fetch from database
    const communityData = generateMockCommunityData(listId, categoryId, listSize);

    // Convert Map to array for JSON serialization
    const serializedItems = communityData.items.map((item) => ({
      ...item,
      rankDistribution: Array.from(item.rankDistribution.entries()),
    }));

    const response = {
      ...communityData,
      items: serializedItems,
      mostControversial: communityData.mostControversial.map((item) => ({
        ...item,
        rankDistribution: Array.from(item.rankDistribution.entries()),
      })),
      mostAgreed: communityData.mostAgreed.map((item) => ({
        ...item,
        rankDistribution: Array.from(item.rankDistribution.entries()),
      })),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Failed to get consensus data:', error);
    return NextResponse.json(
      { error: 'Failed to get consensus data' },
      { status: 500 }
    );
  }
}
