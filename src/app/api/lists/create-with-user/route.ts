import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// POST /api/lists/create-with-user - Create a new list with automatic temp user handling
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { title, category, size } = body;

    if (!title || !category || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, and size are required' },
        { status: 400 }
      );
    }

    let userId = body.user_id;
    let isNewUser = false;
    let user = null;

    // If no user_id provided, create a temporary user
    if (!userId) {
      userId = uuidv4();
      isNewUser = true;

      // Create temporary user in users table (if it exists)
      // Note: This assumes you have a users table. If not, you can skip this step
      // and just use the generated UUID directly
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            is_temporary: true,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (userError && userError.code !== '42P01') { // Ignore table not found error
        console.error('Error creating temp user:', userError);
        // Continue anyway with the generated UUID
      } else {
        user = userData;
      }
    } else {
      // Check if user exists
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      user = userData;
    }

    // Insert the new list
    const { data: list, error: listError } = await supabase
      .from('lists')
      .insert([
        {
          title: body.title,
          description: body.description,
          category: body.category,
          subcategory: body.subcategory,
          user_id: userId,
          predefined: body.predefined || false,
          size: body.size,
          time_period: body.time_period,
        },
      ])
      .select()
      .single();

    if (listError) {
      console.error('Error creating list:', listError);
      return NextResponse.json(
        { error: listError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      list,
      user: user || { id: userId, is_temporary: true },
      is_new_user: isNewUser,
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/lists/create-with-user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
