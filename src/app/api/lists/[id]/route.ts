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
      const { data: items, error: itemsError } = await supabase
        .from('top_items')
        .select('*')
        .eq('list_id', id)
        .order('rank', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      } else {
        return NextResponse.json({
          ...list,
          items: items || [],
          total_items: items?.length || 0,
        });
      }
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
