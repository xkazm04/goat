import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// HTTP Status codes
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups/categories/[category] - Get item groups for a specific category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
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
      query = query.ilike('name', `%${search}%`);
    }

    const { data: groups, error: groupsError } = await query;

    if (groupsError) {
      console.error('Error fetching item groups:', groupsError);
      return NextResponse.json(
        { error: groupsError.message },
        { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    // If we need to filter by item count, get counts for each group
    if (minItemCount > 0 && groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id);

      // Get item counts for all groups
      const { data: itemCounts, error: countError } = await supabase
        .from('items')
        .select('group_id')
        .in('group_id', groupIds)
        .not('group_id', 'is', null);

      if (countError) {
        console.error('Error counting items:', countError);
        return NextResponse.json(
          { error: countError.message },
          { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
        );
      }

      // Count items per group
      const countMap = new Map<string, number>();
      itemCounts?.forEach(item => {
        const count = countMap.get(item.group_id) || 0;
        countMap.set(item.group_id, count + 1);
      });

      // Filter groups by minimum item count and add item_count to response
      const filteredGroups = groups
        .map(group => ({
          ...group,
          item_count: countMap.get(group.id) || 0
        }))
        .filter(group => group.item_count >= minItemCount);

      return NextResponse.json(filteredGroups);
    }

    // If no min count filter, just add item_count: 0 to all groups
    const groupsWithCount = groups?.map(group => ({
      ...group,
      item_count: 0
    })) || [];

    return NextResponse.json(groupsWithCount);
  } catch (error) {
    console.error('Unexpected error in GET /api/top/groups/categories/[category]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
}
