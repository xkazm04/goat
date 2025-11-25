import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/challenges - Get all challenges with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let query = supabase
      .from('challenges')
      .select('*, lists(id, title, category)')
      .order('start_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching challenges:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in GET /api/challenges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/challenges - Create a new challenge
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { list_id, category, title, description, start_date, end_date, prize_description } = body;

    if (!list_id || !category || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: list_id, category, and title are required' },
        { status: 400 }
      );
    }

    // Verify the list exists
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', list_id)
      .single();

    if (listError || !listData) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('challenges')
      .insert([
        {
          list_id,
          category,
          title,
          description,
          start_date: start_date || new Date().toISOString(),
          end_date,
          prize_description,
          status: start_date && new Date(start_date) > new Date() ? 'scheduled' : 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating challenge:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/challenges:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
