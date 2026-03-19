import { NextRequest, NextResponse } from 'next/server';

import { getItemRating } from '@/lib/ranking-graph/RankingGraphService';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ranking-graph/[itemId]
 *
 * Returns the universal rating, cross-list insights, trajectory,
 * and related items for a specific item.
 *
 * Query params:
 *   - name: Item name (used for display, defaults to itemId)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const itemName = searchParams.get('name') || itemId;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const result = await getItemRating(itemId, itemName, supabase);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[RankingGraph API] Item rating error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item rating' },
      { status: 500 }
    );
  }
}
