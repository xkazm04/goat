/**
 * AI Debate API Route
 *
 * POST /api/debate - Generate a debate challenge for an item placement
 */

import { NextRequest, NextResponse } from 'next/server';

import { generateDebateChallenge } from '@/lib/debate/debate-provider';

import type { DebateChallengeRequest } from '@/lib/debate/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as DebateChallengeRequest;

    // Validate required fields
    if (!body.itemName || !body.category || !body.userTier) {
      return NextResponse.json(
        { error: 'Missing required fields: itemName, category, userTier' },
        { status: 400 }
      );
    }

    // Validate position
    if (typeof body.userPosition !== 'number' || body.userPosition < 1) {
      return NextResponse.json(
        { error: 'userPosition must be a positive number' },
        { status: 400 }
      );
    }

    // Limit history to prevent prompt injection / excessive tokens
    if (body.history && body.history.length > 10) {
      body.history = body.history.slice(-10);
    }

    const response = await generateDebateChallenge(body);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Debate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate debate' },
      { status: 500 }
    );
  }
}
