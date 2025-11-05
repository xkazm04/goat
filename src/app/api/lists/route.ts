import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/lists - Get lists with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const userId = searchParams.get('user_id');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const predefined = searchParams.get('predefined');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Build query
    let query = supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }
    if (predefined !== null) {
      query = query.eq('predefined', predefined === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching lists:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in GET /api/lists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { title, category, size, user_id } = body;

    if (!title || !category || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, and size are required' },
        { status: 400 }
      );
    }

    // Insert the new list
    const { data, error } = await supabase
      .from('lists')
      .insert([
        {
          title: body.title,
          description: body.description,
          category: body.category,
          subcategory: body.subcategory,
          user_id: body.user_id,
          predefined: body.predefined || false,
          size: body.size,
          time_period: body.time_period,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating list:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/lists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
