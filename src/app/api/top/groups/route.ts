import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/top/groups - Get all item groups with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Build query
    let query = supabase
      .from('item_groups')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching item groups:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Add item_count to each group
    if (data && data.length > 0) {
      const groupIds = data.map(g => g.id);

      const { data: itemCounts, error: countError } = await supabase
        .from('items')
        .select('group_id')
        .in('group_id', groupIds)
        .not('group_id', 'is', null);

      if (countError) {
        console.error('Error counting items:', countError);
        // Continue without counts
        return NextResponse.json(
          data.map(group => ({ ...group, item_count: 0 }))
        );
      }

      // Count items per group
      const countMap = new Map<string, number>();
      itemCounts?.forEach(item => {
        if (item.group_id) {
          const count = countMap.get(item.group_id) || 0;
          countMap.set(item.group_id, count + 1);
        }
      });

      const groupsWithCount = data.map(group => ({
        ...group,
        item_count: countMap.get(group.id) || 0
      }));

      return NextResponse.json(groupsWithCount);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/top/groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/top/groups - Create a new item group
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { name, category } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name and category are required' },
        { status: 400 }
      );
    }

    // Insert the new group
    const { data, error } = await supabase
      .from('item_groups')
      .insert([
        {
          name: body.name,
          category: body.category,
          subcategory: body.subcategory,
          description: body.description,
          image_url: body.image_url,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating item group:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Add item_count: 0 to the response
    const groupWithCount = {
      ...data,
      item_count: 0
    };

    return NextResponse.json(groupWithCount, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/top/groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
