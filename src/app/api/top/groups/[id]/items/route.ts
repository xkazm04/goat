import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups/[id]/items - Get items in a specific group (legacy endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // First verify the group exists
    const { data: group, error: groupError } = await supabase
      .from('item_groups')
      .select('id')
      .eq('id', id)
      .single();

    if (groupError) {
      if (groupError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Item group not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching item group:', groupError);
      return NextResponse.json(
        { error: groupError.message },
        { status: 500 }
      );
    }

    // Get items with pagination
    const { data: items, error: itemsError, count } = await supabase
      .from('items')
      .select(`
        id,
        name,
        description,
        category,
        subcategory,
        item_year,
        item_year_to,
        image_url,
        created_at
      `, { count: 'exact' })
      .eq('group_id', id)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return NextResponse.json(
        { error: itemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      group_id: id,
      items: items || [],
      count: count || 0
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/top/groups/[id]/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
