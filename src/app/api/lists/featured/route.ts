import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

export interface FeaturedListsResponse {
  popular: TopListData[];
  trending: TopListData[];
  latest: TopListData[];
  awards: TopListData[];
}

interface TopListData {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  user_id?: string;
  predefined?: boolean;
  size: number;
  time_period?: string;
  created_at: string;
  updated_at?: string;
  description?: string;
  type?: 'top' | 'award';
  parent_list_id?: string;
}

// GET /api/lists/featured - Get all featured lists in one request
// Returns popular, trending, latest, and awards lists consolidated
export async function GET(request: NextRequest) {
  try {
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

    // Check for errors
    if (popularResult.error) {
      console.error('Error fetching popular lists:', popularResult.error);
      return NextResponse.json(
        { error: `Failed to fetch popular lists: ${popularResult.error.message}` },
        { status: 500 }
      );
    }

    if (trendingResult.error) {
      console.error('Error fetching trending lists:', trendingResult.error);
      return NextResponse.json(
        { error: `Failed to fetch trending lists: ${trendingResult.error.message}` },
        { status: 500 }
      );
    }

    if (latestResult.error) {
      console.error('Error fetching latest lists:', latestResult.error);
      return NextResponse.json(
        { error: `Failed to fetch latest lists: ${latestResult.error.message}` },
        { status: 500 }
      );
    }

    if (awardsResult.error) {
      console.error('Error fetching award lists:', awardsResult.error);
      return NextResponse.json(
        { error: `Failed to fetch award lists: ${awardsResult.error.message}` },
        { status: 500 }
      );
    }

    // Filter awards to only include parent awards (no parent_list_id) and limit to 10
    const filteredAwards = (awardsResult.data || [])
      .filter((list: TopListData) => !list.parent_list_id)
      .slice(0, 10);

    const response: FeaturedListsResponse = {
      popular: popularResult.data || [],
      trending: trendingResult.data || [],
      latest: latestResult.data || [],
      awards: filteredAwards,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/lists/featured:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
