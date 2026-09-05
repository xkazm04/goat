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
    // Execute queries in parallel for better performance
    // All queries exclude child/fork lists (parent_list_id IS NULL) to show only
    // top-level templates — user rankings are aggregated into consensus stats instead

    // Step 1: Fetch engagement data from shared_rankings to differentiate popular vs trending
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const [engagementData, recentEngagementData, latest, awards] = await Promise.all([
      // All-time engagement: shared_rankings grouped by list_id
      timedQuery(() =>
        supabase
          .from('shared_rankings')
          .select('list_id, view_count, fork_count')
          .not('list_id', 'is', null)
      ),

      // Recent engagement (last 7 days): shared_rankings created recently
      timedQuery(() =>
        supabase
          .from('shared_rankings')
          .select('list_id, view_count, fork_count, created_at')
          .not('list_id', 'is', null)
          .gte('created_at', sevenDaysAgoISO)
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

    // Step 2: Aggregate engagement scores per list_id
    // Popular = total views + (forks * 10) — all-time engagement
    const popularScores = new Map<string, number>();
    if (engagementData.result.data) {
      for (const row of engagementData.result.data) {
        if (!row.list_id) continue;
        const prev = popularScores.get(row.list_id) ?? 0;
        popularScores.set(row.list_id, prev + (row.view_count ?? 0) + (row.fork_count ?? 0) * 10);
      }
    }

    // Trending = recent views + (recent forks * 10) — last 7 days only
    const trendingScores = new Map<string, number>();
    if (recentEngagementData.result.data) {
      for (const row of recentEngagementData.result.data) {
        if (!row.list_id) continue;
        const prev = trendingScores.get(row.list_id) ?? 0;
        trendingScores.set(row.list_id, prev + (row.view_count ?? 0) + (row.fork_count ?? 0) * 10);
      }
    }

    // Step 3: Get the top list IDs for popular and trending
    const popularListIds = Array.from(popularScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, popularLimit)
      .map(([id]) => id);

    const trendingListIds = Array.from(trendingScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, trendingLimit)
      .map(([id]) => id);

    // Step 4: Fetch the actual list data for popular and trending
    const [popular, trending] = await Promise.all([
      timedQuery(async () => {
        if (popularListIds.length === 0) {
          // Fallback: if no engagement data, use updated_at as proxy
          return supabase
            .from('lists')
            .select('*')
            .eq('type', 'top')
            .is('parent_list_id', null)
            .order('updated_at', { ascending: false })
            .limit(popularLimit);
        }
        return supabase
          .from('lists')
          .select('*')
          .in('id', popularListIds)
          .eq('type', 'top')
          .is('parent_list_id', null);
      }),

      timedQuery(async () => {
        if (trendingListIds.length === 0) {
          // Fallback: if no recent engagement, use recently created lists
          return supabase
            .from('lists')
            .select('*')
            .eq('type', 'top')
            .is('parent_list_id', null)
            .order('created_at', { ascending: false })
            .limit(trendingLimit);
        }
        return supabase
          .from('lists')
          .select('*')
          .in('id', trendingListIds)
          .eq('type', 'top')
          .is('parent_list_id', null);
      }),
    ]);

    const popularResult = popular.result;
    const trendingResult = trending.result;
    const latestResult = latest.result;
    const awardsResult = awards.result;

    // Check for errors and throw with proper error handling
    const errors = [
      { name: 'engagement', error: engagementData.result.error },
      { name: 'recentEngagement', error: recentEngagementData.result.error },
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

    // Sort popular and trending by their engagement scores (Supabase `in()` doesn't preserve order)
    const sortedPopular = (popularResult.data || [])
      .map(toListData)
      .sort((a, b) => (popularScores.get(b.id) ?? 0) - (popularScores.get(a.id) ?? 0));

    const sortedTrending = (trendingResult.data || [])
      .map(toListData)
      .sort((a, b) => (trendingScores.get(b.id) ?? 0) - (trendingScores.get(a.id) ?? 0));

    const result: FeaturedListsData = {
      popular: sortedPopular,
      trending: sortedTrending,
      latest: (latestResult.data || []).map(toListData),
      awards: filteredAwards.map(toListData),
    };

    return result;
  });

  return successResponse(response);
});
