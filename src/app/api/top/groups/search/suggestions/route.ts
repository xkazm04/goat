import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups/search/suggestions - Get group name suggestions for autocomplete
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const query = searchParams.get('query');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    // Query is required for suggestions
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Build query for group names matching the search
    let dbQuery = supabase
      .from('item_groups')
      .select('name')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(limit);

    // Apply optional filters
    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }
    if (subcategory) {
      dbQuery = dbQuery.eq('subcategory', subcategory);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error fetching group suggestions:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Extract just the names for suggestions
    const suggestions = data?.map(group => group.name) || [];

    return NextResponse.json({
      query,
      suggestions
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/top/groups/search/suggestions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
