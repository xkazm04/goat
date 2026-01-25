/**
 * Share Chain API Route
 * Handles share chain data and visualization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getChallengeManager,
  getShareChainTracker,
} from '@/lib/challenges';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/challenges/[id]/chain
 * Get share chain data for a challenge
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    const { id: challengeId } = await context.params;

    const challengeManager = getChallengeManager();
    const challenge = await challengeManager.getChallenge(challengeId);

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const shareChainTracker = getShareChainTracker();
    const chain = await shareChainTracker.getChain(challengeId);

    if (!chain) {
      return NextResponse.json({
        chain: null,
        visualization: null,
        summary: null,
      });
    }

    // Get visualization data
    const visualization = shareChainTracker.generateVisualizationData(chain);

    // Get summary text
    const summary = shareChainTracker.getChainSummaryText(chain);

    // Get viral potential score
    const viralPotential = shareChainTracker.calculateViralPotential(chain);

    // Get user's path in the chain if authenticated
    let userPath = null;
    if (userId) {
      userPath = await shareChainTracker.getChainPath(challengeId, userId);
    }

    return NextResponse.json({
      chain,
      visualization,
      summary,
      viralPotential,
      userPath,
    });
  } catch (error) {
    console.error('Error fetching share chain:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share chain' },
      { status: 500 }
    );
  }
}
