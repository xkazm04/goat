import { NextRequest, NextResponse } from 'next/server';

import { getRequestId } from '@/lib/api/request-id';
import { createClient, escapeIlikeWildcards } from '@/lib/supabase/server';

// HTTP Status codes
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups/categories/[category] - Get item groups for a specific category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const supabase = await createClient();
    const { category } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const minItemCount = searchParams.get('min_item_count') ? parseInt(searchParams.get('min_item_count')!) : 1;

    // Build query with item count
    // We need to join with items table to count items in each group
    let query = supabase
      .from('item_groups')
      .select(`
        id,
        name,
        category,
        subcategory,
        description,
        image_url,
        created_at,
        updated_at
      `)
      .eq('category', category)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply optional filters
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    if (search) {
      query = query.ilike('name', `%${escapeIlikeWildcards(search)}%`);
    }

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      console.error(`[${requestId}] Error fetching item groups:`, groupsError);
      return NextResponse.json(
        { error: groupsError.message, requestId },
        { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    // Get item counts per group using individual count queries to avoid row-limit truncation
    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id);

      // Count items per group using batch count queries (avoids Supabase default 1000-row limit)
      const countMap = new Map<string, number>();
      const BATCH_SIZE = 20;
      for (let i = 0; i < groupIds.length; i += BATCH_SIZE) {
        const batch = groupIds.slice(i, i + BATCH_SIZE);
        const countPromises = batch.map(async (gid) => {
          const { count, error } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', gid);
          if (!error && count !== null) {
            countMap.set(gid, count);
          }
        });
        await Promise.all(countPromises);
      }

      // Add item_count and optionally filter by minimum
      const groupsWithCount = groups
        .map(group => ({
          ...group,
          item_count: countMap.get(group.id) || 0
        }));

      const filteredGroups = minItemCount > 0
        ? groupsWithCount.filter(group => group.item_count >= minItemCount)
        : groupsWithCount;

      return NextResponse.json(filteredGroups);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in GET /api/top/groups/categories/[category]:`, error);
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
}
