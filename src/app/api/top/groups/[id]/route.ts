import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups/[id] - Get a single item group with optional items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Check if items should be included (default: true)
    const includeItems = searchParams.get('include_items') !== 'false';

    // Get the group
    const { data: group, error: groupError } = await supabase
      .from('item_groups')
      .select('*')
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

    // If items should be included, fetch them
    if (includeItems) {
      const { data: items, error: itemsError } = await supabase
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
        `)
        .eq('group_id', id)
        .order('name', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        // Return group without items instead of failing
        return NextResponse.json({
          ...group,
          items: [],
          item_count: 0
        });
      }

      return NextResponse.json({
        ...group,
        items: items || [],
        item_count: items?.length || 0
      });
    }

    // Get just the count if items not included
    const { count, error: countError } = await supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', id);

    if (countError) {
      console.error('Error counting items:', countError);
    }

    return NextResponse.json({
      ...group,
      item_count: count || 0
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/top/groups/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
