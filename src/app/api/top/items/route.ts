import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/top/items - Get items with filtering, sorting, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = (searchParams.get('sort_order') || 'asc').toLowerCase();
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const groupId = searchParams.get('group_id');
    const missingImage = searchParams.get('missing_image') === 'true';

    console.log('🔍 Items API params:', { category, subcategory, search, sortBy, sortOrder, limit, offset, groupId, missingImage });

    // Build query
    let query = supabase.from('items').select('*', { count: 'exact' });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }
    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (missingImage) {
      query = query.is('image_url', null);
    }

    // Apply sorting
    // Note: 'ranking' is not a column in items table, default to selection_count for ranking-like behavior
    const validSortFields = ['name', 'created_at', 'updated_at', 'item_year', 'selection_count', 'view_count'];
    let sortField = sortBy;

    // Map frontend sort fields to actual database columns
    if (sortBy === 'ranking') {
      sortField = 'selection_count'; // Use selection_count as a proxy for ranking
    } else if (!validSortFields.includes(sortBy)) {
      sortField = 'name'; // Default fallback
    }

    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    console.log('🔍 Final sort field:', sortField, 'order:', sortOrder);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      console.error('Query details - sortField:', sortField, 'sortOrder:', sortOrder);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      limit,
      offset,
      has_more: count ? offset + limit < count : false,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/top/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/top/items - Create a new item
 */
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

    // Prepare item data
    const itemData: any = {
      name: String(name).trim(),
      category: String(category).trim(),
    };

    // Optional fields
    if (body.subcategory) {
      itemData.subcategory = String(body.subcategory).trim();
    }
    if (body.description) {
      itemData.description = String(body.description).trim();
    }
    if (body.image_url) {
      itemData.image_url = String(body.image_url).trim();
    }
    if (body.reference_url) {
      itemData.reference_url = String(body.reference_url).trim();
    }
    if (body.item_year !== undefined && body.item_year !== null) {
      const year = parseInt(String(body.item_year));
      if (!isNaN(year)) {
        itemData.item_year = year;
      }
    }
    if (body.item_year_to !== undefined && body.item_year_to !== null) {
      const yearTo = parseInt(String(body.item_year_to));
      if (!isNaN(yearTo)) {
        itemData.item_year_to = yearTo;
      }
    }
    if (body.group) {
      itemData.group = String(body.group).trim();
    }
    if (body.group_id) {
      itemData.group_id = String(body.group_id).trim();
    }

    // Insert the new item
    const { data, error } = await supabase
      .from('items')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      console.error('Error creating item:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An item with this name, category, and subcategory already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/top/items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







