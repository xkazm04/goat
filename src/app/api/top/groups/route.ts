import { NextRequest, NextResponse } from 'next/server';

import { getRequestId } from '@/lib/api/request-id';
import { cachedFetch } from '@/lib/cache/server-cache';
import { createClient, requireAuth, escapeIlikeWildcards } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

/** TTL for group listings: 5 minutes (reference data, rarely changes) */
const GROUPS_CACHE_TTL = 5 * 60 * 1000;

// GET /api/top/groups - Get all item groups with optional filters
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '100'), 500));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Build a cache key from the query parameters
    const cacheKey = `groups:${category || ''}:${subcategory || ''}:${search || ''}:${limit}:${offset}`;

    // Only cache when there's no free-text search (search results are too varied)
    const shouldCache = !search;
    const ttl = shouldCache ? GROUPS_CACHE_TTL : 0;

    const groupsWithCount = await cachedFetch(cacheKey, ttl, async () => {
      // Build query — use resource embedding to get item counts via SQL aggregate
      // instead of fetching all item rows client-side
      let query = supabase
        .from('item_groups')
        .select('*, items(count)')
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      }
      if (search) {
        query = query.ilike('name', `%${escapeIlikeWildcards(search)}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      // Transform embedded count into flat item_count field
      return (data || []).map(group => {
        const { items, ...rest } = group as Record<string, unknown>;
        const countArr = items as { count: number }[] | undefined;
        return {
          ...rest,
          item_count: countArr?.[0]?.count ?? 0,
        };
      });
    });

    return NextResponse.json(groupsWithCount, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in GET /api/top/groups:`, error);
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    );
  }
}

// POST /api/top/groups - Create a new item group
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { name, category } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name and category are required' },
        { status: 400 }
      );
    }

    // Insert the new group
    const { data, error } = await supabase
      .from('item_groups')
      .insert([
        {
          name: body.name,
          category: body.category,
          subcategory: body.subcategory,
          description: body.description,
          image_url: body.image_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(`[${requestId}] Error creating item group:`, error);
      return NextResponse.json(
        { error: 'Failed to create item group', requestId },
        { status: 500 }
      );
    }

    // Add item_count: 0 to the response
    const groupWithCount = {
      ...data,
      item_count: 0
    };

    return NextResponse.json(groupWithCount, { status: 201 });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in POST /api/top/groups:`, error);
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    );
  }
}
