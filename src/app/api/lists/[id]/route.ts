import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/lists/:id - Get a single list by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeItems = searchParams.get('include_items') === 'true';

    let query = supabase
      .from('lists')
      .select('*')
      .eq('id', id)
      .single();

    const { data: list, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'List not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching list:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // If include_items is true, fetch items for this list
    if (includeItems) {
      const { data: listItems, error: itemsError } = await supabase
        .from('list_items')
        .select(`
          ranking,
          item_id,
          items (
            id,
            name,
            description,
            image_url,
            category,
            subcategory,
            group_id,
            item_year
          )
        `)
        .eq('list_id', id)
        .order('ranking', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items for list:', id, itemsError);
        return NextResponse.json(
          { error: 'Failed to fetch list items', details: itemsError.message },
          { status: 500 }
        );
      }

      // Transform the response to flatten the items structure
      // Map 'name' to 'title' for backwards compatibility with frontend
      const items = (listItems || []).map((li: any) => ({
        ...li.items,
        title: li.items?.name, // Map name to title for frontend compatibility
        position: li.ranking,
      }));

      return NextResponse.json({
        ...list,
        items,
        total_items: items.length,
      });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Unexpected error in GET /api/lists/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/:id - Delete a list
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Delete the list (items should be deleted via CASCADE in the database)
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting list:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/lists/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/lists/:id - Update a list
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const body = await request.json();

    // Update the list
    const { data, error } = await supabase
      .from('lists')
      .update({
        title: body.title,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        size: body.size,
        time_period: body.time_period,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating list:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in PUT /api/lists/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
