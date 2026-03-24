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

    // Build query - item_count is maintained by DB trigger on item_groups
    let query = supabase
      .from('item_groups')
      .select(`
        id,
        name,
        category,
        subcategory,
        description,
        image_url,
        item_count,
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

    // Filter by minimum item count at the DB level
    if (minItemCount > 0) {
      query = query.gte('item_count', minItemCount);
    }

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      console.error(`[${requestId}] Error fetching item groups:`, groupsError);
      return NextResponse.json(
        { error: groupsError.message, requestId },
        { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(groups || []);
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in GET /api/top/groups/categories/[category]:`, error);
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
}
