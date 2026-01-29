import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  ServerError,
} from '@/lib/errors';
import type { FeaturedListsData, ListData } from '@/types/api-responses';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/lists/featured - Get all featured lists in one request
// Returns popular, trending, latest, and awards lists consolidated
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Allow customizing limits per category (default: 10)
  const popularLimit = parseInt(searchParams.get('popular_limit') || '10');
  const trendingLimit = parseInt(searchParams.get('trending_limit') || '10');
  const latestLimit = parseInt(searchParams.get('latest_limit') || '10');
  const awardsLimit = parseInt(searchParams.get('awards_limit') || '20'); // Awards need more to filter

  // Execute all 4 queries in parallel for better performance
  const [popularResult, trendingResult, latestResult, awardsResult] = await Promise.all([
    // Popular lists - ordered by created_at for now (could be view_count in future)
    supabase
      .from('lists')
      .select('*')
      .eq('type', 'top')
      .order('created_at', { ascending: false })
      .limit(popularLimit),

    // Trending lists - ordered by updated_at (recently active)
    supabase
      .from('lists')
      .select('*')
      .eq('type', 'top')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(trendingLimit),

    // Latest lists - ordered by created_at
    supabase
      .from('lists')
      .select('*')
      .eq('type', 'top')
      .order('created_at', { ascending: false })
      .limit(latestLimit),

    // Award lists - filter out child awards (only parent awards)
    supabase
      .from('lists')
      .select('*')
      .eq('type', 'award')
      .order('created_at', { ascending: false })
      .limit(awardsLimit),
  ]);

  // Check for errors and throw with proper error handling
  if (popularResult.error) {
    throw fromSupabaseError(popularResult.error);
  }

  if (trendingResult.error) {
    throw fromSupabaseError(trendingResult.error);
  }

  if (latestResult.error) {
    throw fromSupabaseError(latestResult.error);
  }

  if (awardsResult.error) {
    throw fromSupabaseError(awardsResult.error);
  }

  // Filter awards to only include parent awards (no parent_list_id) and limit to 10
  const filteredAwards = (awardsResult.data || [])
    .filter((list) => !list.parent_list_id)
    .slice(0, 10);

  // Convert to ListData format (handling null vs undefined)
  const toListData = (list: typeof popularResult.data extends (infer T)[] | null ? T : never): ListData => ({
    id: list.id,
    title: list.title,
    category: list.category,
    subcategory: list.subcategory,
    description: list.description,
    size: list.size,
    time_period: list.time_period,
    user_id: list.user_id,
    is_public: list.is_public,
    featured: list.featured,
    total_items: list.total_items,
    created_at: list.created_at,
    updated_at: list.updated_at,
  });

  const response: FeaturedListsData = {
    popular: (popularResult.data || []).map(toListData),
    trending: (trendingResult.data || []).map(toListData),
    latest: (latestResult.data || []).map(toListData),
    awards: filteredAwards.map(toListData),
  };

  return successResponse(response);
});
