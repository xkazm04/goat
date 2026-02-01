import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import {
  withErrorHandler,
  fromSupabaseError,
  assertRequired,
  createdResponse,
} from '@/lib/errors';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// POST /api/lists/create-with-user - Create a new list with automatic temp user handling
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const body = await request.json();

  // Validate required fields
  const { title, category, size } = body;
  assertRequired(title, 'title');
  assertRequired(category, 'category');
  assertRequired(size, 'size');

  let userId = body.user_id;
  let isNewUser = false;
  let user = null;

  // If no user_id provided, try to create or find a user
  if (!userId) {
    // For now, skip user creation and just leave user_id as null
    // The lists table allows null user_id
    userId = null;
    isNewUser = true;
    user = null;
  } else {
    // Check if user exists
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
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
    throw fromSupabaseError(listError);
  }

  return createdResponse({
    list,
    user: user || { id: userId, is_temporary: true },
    is_new_user: isNewUser,
  });
});
