import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/items/stats - Get statistics for items including average ranking
 * Query params:
 *   - item_ids: comma-separated list of item IDs
 *   - category: filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const itemIdsParam = searchParams.get('item_ids');
    const category = searchParams.get('category');

    // Build query
    let query = supabase.from('items').select('id, name, selection_count, view_count');

    // Apply filters
    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(',').filter(Boolean);
      if (itemIds.length > 0) {
        query = query.in('id', itemIds);
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching item stats:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate average ranking based on selection_count
    // Higher selection_count = better (lower) ranking
    const items = data || [];

    // Sort by selection_count descending to get rankings
    const sortedItems = [...items].sort((a, b) =>
      (b.selection_count || 0) - (a.selection_count || 0)
    );

    // Create ranking map
    const stats = sortedItems.map((item, index) => ({
      item_id: item.id,
      name: item.name,
      selection_count: item.selection_count || 0,
      view_count: item.view_count || 0,
      average_ranking: index + 1, // Ranking position (1-based)
      percentile: items.length > 0 ? Math.round((1 - index / items.length) * 100) : 0,
    }));

    return NextResponse.json({
      stats,
      total_items: items.length,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/items/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
