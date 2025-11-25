import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/leaderboard - Get leaderboard entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get('category');
    const timeframe = searchParams.get('timeframe') || 'all-time';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Calculate date threshold based on timeframe
    let dateThreshold: Date | null = null;
    const now = new Date();

    switch (timeframe) {
      case 'daily':
        dateThreshold = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'weekly':
        dateThreshold = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        dateThreshold = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'all-time':
      default:
        dateThreshold = null;
        break;
    }

    // Build query to get user scores
    let entriesQuery = supabase
      .from('challenge_entries')
      .select(`
        user_id,
        score,
        submitted_at,
        challenges(category)
      `);

    if (dateThreshold) {
      entriesQuery = entriesQuery.gte('submitted_at', dateThreshold.toISOString());
    }

    if (category) {
      entriesQuery = entriesQuery.eq('challenges.category', category);
    }

    const { data: entries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('Error fetching leaderboard entries:', entriesError);
      return NextResponse.json(
        { error: entriesError.message },
        { status: 500 }
      );
    }

    // Aggregate scores by user
    const userScores = new Map<string, { total_score: number; entry_count: number }>();

    entries?.forEach((entry) => {
      const current = userScores.get(entry.user_id) || { total_score: 0, entry_count: 0 };
      userScores.set(entry.user_id, {
        total_score: current.total_score + entry.score,
        entry_count: current.entry_count + 1,
      });
    });

    // Get user badges
    const userIds = Array.from(userScores.keys());

    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .in('user_id', userIds);

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
    }

    const badgesByUser = new Map<string, any[]>();
    badges?.forEach((badge) => {
      const userBadges = badgesByUser.get(badge.user_id) || [];
      userBadges.push(badge);
      badgesByUser.set(badge.user_id, userBadges);
    });

    // Build leaderboard entries
    const leaderboardEntries = Array.from(userScores.entries()).map(([user_id, stats]) => ({
      user_id,
      score: stats.total_score,
      entry_count: stats.entry_count,
      badges: badgesByUser.get(user_id) || [],
      is_premium: false, // TODO: Implement premium status
    }));

    // Sort by score descending
    leaderboardEntries.sort((a, b) => b.score - a.score);

    // Add ranks
    const rankedEntries = leaderboardEntries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    // Apply pagination
    const paginatedEntries = rankedEntries.slice(offset, offset + limit);

    return NextResponse.json({
      entries: paginatedEntries,
      total: rankedEntries.length,
      category: category || 'all',
      timeframe,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
