/**
 * Streaks API Route
 * Handles user streak data
 */

import { NextRequest, NextResponse } from 'next/server';

import { getStreakTracker, type StreakType } from '@/lib/challenges';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/challenges/streaks
 * Get user's streak data
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const streakTracker = getStreakTracker();
    const streakData = await streakTracker.getUserData(userId);

    // Get statistics
    const stats = await streakTracker.getStreakStatistics(userId);

    // Check for active streaks
    const hasActiveStreak = Array.from(streakData.streaks.values()).some(
      s => s.currentStreak > 0
    );

    // Convert Map to object for JSON serialization
    const streaksObj: Record<string, object> = {};
    streakData.streaks.forEach((streak, type) => {
      streaksObj[type] = streak;
    });

    return NextResponse.json({
      streaks: streaksObj,
      statistics: stats,
      milestonesAchieved: streakData.milestonesAchieved,
      highestScore: streakData.highestScore,
      totalChallenges: streakData.totalChallengesCompleted,
      hasActiveStreak,
    });
  } catch (error) {
    console.error('Error fetching streaks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streaks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/challenges/streaks
 * Record streak activity
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const body = await request.json();
    const { type, score, timeZone } = body as {
      type: StreakType;
      score?: number;
      timeZone?: string;
    };
    // Client's IANA zone so the daily streak is computed in the user's local day.
    const userTimeZone = typeof timeZone === 'string' && timeZone ? timeZone : undefined;

    if (!type) {
      return NextResponse.json(
        { error: 'Missing streak type' },
        { status: 400 }
      );
    }

    const validTypes: StreakType[] = ['daily_challenge', 'any_challenge', 'collaborative'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid streak type' },
        { status: 400 }
      );
    }

    const streakTracker = getStreakTracker();
    const result = await streakTracker.recordActivity(userId, type, score, userTimeZone);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error recording streak:', error);
    return NextResponse.json(
      { error: 'Failed to record streak' },
      { status: 500 }
    );
  }
}
