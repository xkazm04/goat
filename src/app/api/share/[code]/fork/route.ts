import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/supabase/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration for fork API');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

interface RouteParams {
  params: Promise<{ code: string }>;
}

interface SharedRankingItem {
  position: number;
  title: string;
  description?: string;
  image_url?: string;
  item_id?: string;
}

// POST - Fork a shared ranking into a new editable list for the current user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Fetch the original shared ranking
    const { data: original, error: fetchError } = await supabase
      .from('shared_rankings')
      .select('*')
      .eq('share_code', code)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: 'Shared ranking not found' },
        { status: 404 }
      );
    }

    const items = (original.items || []) as SharedRankingItem[];
    const listSize = items.length || 10;

    // 2. Create a new list for the forking user
    const { data: newList, error: listError } = await supabase
      .from('lists')
      .insert({
        title: `Remix: ${original.title}`,
        category: original.category,
        subcategory: original.subcategory,
        size: listSize,
        time_period: original.time_period || 'all-time',
        user_id: auth.userId,
        predefined: false,
        type: 'top',
        parent_list_id: original.list_id,
      })
      .select()
      .single();

    if (listError || !newList) {
      console.error('Error creating forked list:', listError);
      return NextResponse.json(
        { error: 'Failed to create forked list' },
        { status: 500 }
      );
    }

    // 3. Copy list_items from the original ranking's items
    // Items in shared_rankings may have item_id references; resolve them
    const itemsWithIds = items.filter((item) => item.item_id);

    if (itemsWithIds.length > 0) {
      const listItemsToInsert = itemsWithIds.map((item) => ({
        list_id: newList.id,
        item_id: item.item_id!,
        ranking: item.position,
      }));

      const { error: itemsError } = await supabase
        .from('list_items')
        .insert(listItemsToInsert);

      if (itemsError) {
        console.error('Error copying list items:', itemsError);
        // Non-fatal: list was created, items just didn't copy
      }
    }

    // 4. Increment fork_count atomically (avoids lost concurrent forks). Falls
    //    back to a read-modify-write if the RPC isn't present yet, so the app is
    //    safe to deploy before the migration that adds increment_share_fork_count
    //    (supabase/migrations/20260616000000_add_increment_counter_rpcs.sql).
    const { error: rpcError } = await supabase.rpc('increment_share_fork_count', {
      share_id: original.id,
    });
    if (rpcError) {
      await supabase
        .from('shared_rankings')
        .update({ fork_count: (original.fork_count || 0) + 1 })
        .eq('id', original.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        list: newList,
        forked_from: {
          share_code: original.share_code,
          title: original.title,
          user_id: original.user_id,
        },
        items_copied: itemsWithIds.length,
        grid_items: items.map((item, index) => ({
          id: `fork-${newList.id}-${index}`,
          item_id: item.item_id || `temp-${index}`,
          title: item.title,
          description: item.description || '',
          image_url: item.image_url || '',
          position: item.position - 1, // Convert to 0-based for grid
          matched: true,
        })),
      },
    });
  } catch (error) {
    console.error('Error in fork API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get fork count for a shared ranking
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Share code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('shared_rankings')
      .select('fork_count')
      .eq('share_code', code)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Shared ranking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { fork_count: data.fork_count || 0 },
    });
  } catch (error) {
    console.error('Error in fork count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
