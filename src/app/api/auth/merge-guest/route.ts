import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/merge-guest
 *
 * Merges guest data to the authenticated user's account.
 * Called automatically by useAuthUser() on SIGNED_IN when the user
 * had a guest UUID that differs from their new Supabase user ID.
 *
 * Updates all tables where user_id = guest_id to user.id.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify the caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guest_id } = body;

    if (!guest_id || typeof guest_id !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid guest_id' }, { status: 400 });
    }

    // Don't merge if guest_id is the same as user.id
    if (guest_id === user.id) {
      return NextResponse.json({ merged: true, skipped: true });
    }

    // Update all tables where user_id = guest_id to the authenticated user's ID.
    // Each update is independent -- partial success is acceptable.
    // Update each table with a user_id column individually.
    // list_items uses list_id (not user_id), so it's excluded.
    const results: Record<string, { updated: boolean; error?: string }> = {};

    const listsResult = await supabase
      .from('lists')
      .update({ user_id: user.id })
      .eq('user_id', guest_id);
    results.lists = listsResult.error
      ? { updated: false, error: listsResult.error.message }
      : { updated: true };

    const sharedResult = await supabase
      .from('shared_rankings')
      .update({ user_id: user.id })
      .eq('user_id', guest_id);
    results.shared_rankings = sharedResult.error
      ? { updated: false, error: sharedResult.error.message }
      : { updated: true };

    const collectionsResult = await supabase
      .from('list_collections')
      .update({ user_id: user.id })
      .eq('user_id', guest_id);
    results.list_collections = collectionsResult.error
      ? { updated: false, error: collectionsResult.error.message }
      : { updated: true };

    return NextResponse.json({ merged: true, results });
  } catch (error) {
    console.error('Error merging guest data:', error);
    return NextResponse.json(
      { error: 'Failed to merge guest data' },
      { status: 500 }
    );
  }
}
