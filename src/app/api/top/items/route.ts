import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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



