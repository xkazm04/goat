/**
 * Personalization Recommendations API
 * Server-side content recommendations for new users
 */

import { NextRequest, NextResponse } from 'next/server';

import { showcaseData } from '@/lib/constants/showCaseExamples';

/**
 * Content item for recommendations
 */
interface ContentItem {
  id: number | string;
  category: string;
  subcategory?: string;
  title: string;
  popularity?: number;
  trending?: boolean;
  createdAt?: number;
}

const MAX_RECOMMENDATIONS = 100;

/**
 * Parse a limit into [min, max], falling back when absent or not a number.
 * `slice(0, NaN)` is an empty list and `slice(0, -1)` drops the LAST item, so
 * `?limit=abc` returned zero recommendations and `?limit=-1` returned all but
 * one, both as 200 responses that read as "nothing to recommend".
 */
function parseBoundedInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw === null || raw === '' ? fallback : parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Simple deterministic hash from a string, returning a number in [0, 1).
 * Ensures the same item always produces the same pseudo-random value.
 */
function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  // Normalize to [0, 1)
  return Math.abs(hash % 10000) / 10000;
}

/**
 * Derive stable popularity and trending values for an item.
 * Uses item id + category to produce deterministic scores.
 */
function deriveItemMetrics(item: { id: number | string; category: string }): {
  popularity: number;
  trending: boolean;
} {
  const key = `${item.id}-${item.category}`;
  const hash = deterministicHash(key);
  return {
    popularity: 70 + hash * 30, // 70–100 range, deterministic
    trending: deterministicHash(key + '-trending') > 0.7,
  };
}

/**
 * Get time of day
 */
function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get season
 */
function getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Score content for new users (server-side)
 */
function scoreForNewUser(
  item: ContentItem,
  timeOfDay: string,
  season: string,
  isWeekend: boolean
): number {
  let score = 50;

  // Popularity boost
  if (item.popularity) {
    score += (item.popularity / 100) * 30;
  }

  // Trending boost
  if (item.trending) {
    score += 20;
  }

  // Time-based preferences
  const timePreferences: Record<string, string[]> = {
    morning: ['Food', 'Technology', 'Stories'],
    afternoon: ['Technology', 'Art', 'Fashion'],
    evening: ['Games', 'Movies', 'Music', 'Sports'],
    night: ['Movies', 'Music', 'Games'],
  };

  if (timePreferences[timeOfDay]?.includes(item.category)) {
    score += 15;
  }

  // Seasonal preferences
  const seasonPreferences: Record<string, string[]> = {
    winter: ['Movies', 'Games', 'Food'],
    spring: ['Sports', 'Travel', 'Fashion'],
    summer: ['Travel', 'Sports', 'Music'],
    fall: ['Movies', 'Food', 'Art'],
  };

  if (seasonPreferences[season]?.includes(item.category)) {
    score += 10;
  }

  // Weekend boost for leisure
  if (isWeekend) {
    const leisureCategories = ['Games', 'Movies', 'Music', 'Sports'];
    if (leisureCategories.includes(item.category)) {
      score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * GET /api/personalization/recommend
 * Get recommendations for new/anonymous users
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseBoundedInt(searchParams.get('limit'), 10, 1, MAX_RECOMMENDATIONS);
    const timezone = searchParams.get('timezone') || 'UTC';

    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();

    const timeOfDay = getTimeOfDay(hour);
    const season = getSeason(month);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Convert showcase data to content items with deterministic metrics
    const items: ContentItem[] = showcaseData.map((item) => {
      const metrics = deriveItemMetrics(item);
      return {
        id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        title: item.title,
        popularity: metrics.popularity,
        trending: metrics.trending,
      };
    });

    // Score and sort items
    const scored = items.map((item) => ({
      ...item,
      score: scoreForNewUser(item, timeOfDay, season, isWeekend),
      reason: item.trending ? 'trending' : 'popular',
    }));

    scored.sort((a, b) => b.score - a.score);

    // Return top items
    const recommendations = scored.slice(0, limit);

    return NextResponse.json({
      recommendations,
      context: {
        timeOfDay,
        season,
        isWeekend,
        timezone,
      },
      meta: {
        total: items.length,
        returned: recommendations.length,
      },
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/personalization/recommend
 * Get personalized recommendations with user interests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interests = [], excludeIds = [] } = body;
    const limit = parseBoundedInt(
      body.limit === undefined || body.limit === null ? null : String(body.limit),
      10,
      1,
      MAX_RECOMMENDATIONS
    );

    // Convert showcase data to content items with deterministic metrics
    const items: ContentItem[] = showcaseData
      .filter((item) => !excludeIds.includes(item.id))
      .map((item) => {
        const metrics = deriveItemMetrics(item);
        return {
          id: item.id,
          category: item.category,
          subcategory: item.subcategory,
          title: item.title,
          popularity: metrics.popularity,
          trending: metrics.trending,
        };
      });

    // Score based on interests
    const scored = items.map((item) => {
      let score = 50;

      // Interest matching
      const interestMatch = interests.find(
        (i: { category: string; score: number }) => i.category === item.category
      );
      if (interestMatch) {
        score += (interestMatch.score / 100) * 40;
      }

      // Popularity
      if (item.popularity) {
        score += (item.popularity / 100) * 20;
      }

      // Trending
      if (item.trending) {
        score += 15;
      }

      return {
        ...item,
        score: Math.min(100, score),
        reason: interestMatch ? 'interest_match' : item.trending ? 'trending' : 'popular',
      };
    });

    scored.sort((a, b) => b.score - a.score);

    const recommendations = scored.slice(0, limit);

    return NextResponse.json({
      recommendations,
      meta: {
        total: items.length,
        returned: recommendations.length,
        interestCount: interests.length,
      },
    });
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
