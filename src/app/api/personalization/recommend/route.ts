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
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const timezone = searchParams.get('timezone') || 'UTC';

    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();

    const timeOfDay = getTimeOfDay(hour);
    const season = getSeason(month);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Convert showcase data to content items
    const items: ContentItem[] = showcaseData.map((item) => ({
      id: item.id,
      category: item.category,
      subcategory: item.subcategory,
      title: item.title,
      popularity: 70 + Math.random() * 30, // Simulated popularity
      trending: Math.random() > 0.7, // Randomly mark some as trending
    }));

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
    const { interests = [], limit = 10, excludeIds = [] } = body;

    // Convert showcase data to content items
    const items: ContentItem[] = showcaseData
      .filter((item) => !excludeIds.includes(item.id))
      .map((item) => ({
        id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        title: item.title,
        popularity: 70 + Math.random() * 30,
        trending: Math.random() > 0.7,
      }));

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
