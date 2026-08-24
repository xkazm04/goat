import { NextRequest } from 'next/server';

import { cachedFetch } from '@/lib/cache/server-cache';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

import type { FeaturedListsData, ListData } from '@/types/api-responses';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

async function timedQuery<T>(queryFn: () => PromiseLike<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await queryFn();
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { result, durationMs };
}

// GET /api/lists/featured - Get all featured lists in one request
// Returns popular, trending, latest, and awards lists consolidated
export const GET = withErrorHandler(async (request: NextRequest) => {
  const correlationId = crypto.randomUUID();
  const requestStart = performance.now();

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Allow customizing limits per category with strict clamping to prevent resource exhaustion
  const MAX_LIMIT = 50;
  const safeLimit = (raw: string | null, defaultVal: number): number => {
    const parsed = parseInt(raw ?? '', 10);
    const value = Number.isNaN(parsed) || parsed < 1 ? defaultVal : parsed;
    return Math.min(value, MAX_LIMIT);
  };
  const popularLimit = safeLimit(searchParams.get('popular_limit'), 10);
  const trendingLimit = safeLimit(searchParams.get('trending_limit'), 10);
  const latestLimit = safeLimit(searchParams.get('latest_limit'), 10);
  const awardsLimit = safeLimit(searchParams.get('awards_limit'), 20);

  // Cache key based on limit params (featured lists are public reference data)
  const cacheKey = `featured-lists:${popularLimit}:${trendingLimit}:${latestLimit}:${awardsLimit}`;
  /** TTL for featured lists: 3 minutes (moderately dynamic but still cacheable) */
  const FEATURED_CACHE_TTL = 3 * 60 * 1000;

  const response = await cachedFetch<FeaturedListsData>(cacheKey, FEATURED_CACHE_TTL, async () => {
    // Execute all 4 queries in parallel for better performance
    // All queries exclude child/fork lists (parent_list_id IS NULL) to show only
    // top-level templates — user rankings are aggregated into consensus stats instead
    const [popular, trending, latest, awards] = await Promise.all([
      // Popular lists - ordered by updated_at as engagement proxy (recently active = popular)
      timedQuery(() =>
        supabase
          .from('lists')
          .select('*')
          .eq('type', 'top')
          .is('parent_list_id', null)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(popularLimit)
      ),

      // Trending lists - ordered by updated_at (recently active)
      timedQuery(() =>
        supabase
          .from('lists')
          .select('*')
          .eq('type', 'top')
          .is('parent_list_id', null)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(trendingLimit)
      ),

      // Latest lists - ordered by created_at
      timedQuery(() =>
        supabase
          .from('lists')
          .select('*')
          .eq('type', 'top')
          .is('parent_list_id', null)
          .order('created_at', { ascending: false })
          .limit(latestLimit)
      ),

      // Award lists - only parent awards
      timedQuery(() =>
        supabase
          .from('lists')
          .select('*')
          .eq('type', 'award')
          .is('parent_list_id', null)
          .order('created_at', { ascending: false })
          .limit(awardsLimit)
      ),
    ]);

    const popularResult = popular.result;
    const trendingResult = trending.result;
    const latestResult = latest.result;
    const awardsResult = awards.result;

    // Check for errors and throw with proper error handling
    const errors = [
      { name: 'popular', error: popularResult.error },
      { name: 'trending', error: trendingResult.error },
      { name: 'latest', error: latestResult.error },
      { name: 'awards', error: awardsResult.error },
    ].filter((e) => e.error);

    if (errors.length > 0) {
      const errorDetails = errors.map((e) => ({
        query: e.name,
        message: e.error!.message,
        code: e.error!.code,
        details: e.error!.details,
        hint: e.error!.hint,
      }));
      console.error('[featured] Supabase query errors:', JSON.stringify(errorDetails, null, 2));
      throw fromSupabaseError(errors[0].error!);
    }

    // Awards already filtered at DB level (parent_list_id IS NULL)
    const filteredAwards = (awardsResult.data || []).slice(0, 10);

    // Convert to ListData format - pick known fields, omit columns that may not exist in DB
    const toListData = (list: typeof popularResult.data extends (infer T)[] | null ? T : never): ListData => ({
      id: list.id,
      title: list.title,
      category: list.category,
      subcategory: list.subcategory,
      description: list.description,
      size: list.size,
      time_period: list.time_period,
      user_id: list.user_id,
      created_at: list.created_at,
      updated_at: list.updated_at,
      type: list.type as ListData['type'],
      parent_list_id: list.parent_list_id,
    });

    const result: FeaturedListsData = {
      popular: (popularResult.data || []).map(toListData),
      trending: (trendingResult.data || []).map(toListData),
      latest: (latestResult.data || []).map(toListData),
      awards: filteredAwards.map(toListData),
    };

    const totalMs = Math.round((performance.now() - requestStart) * 100) / 100;
    console.log(JSON.stringify({
      endpoint: '/api/lists/featured',
      correlationId,
      popularMs: popular.durationMs,
      trendingMs: trending.durationMs,
      latestMs: latest.durationMs,
      awardsMs: awards.durationMs,
      totalMs,
      resultCounts: {
        popular: result.popular.length,
        trending: result.trending.length,
        latest: result.latest.length,
        awards: result.awards.length,
      },
    }));

    return result;
  });

  return successResponse(response);
});
