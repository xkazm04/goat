import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGraphOverview, getListSuggestions } from '@/lib/ranking-graph/RankingGraphService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ranking-graph
 *
 * Returns overview of the ranking graph (top items, rising items, controversial items).
 * Query params:
 *   - category: Optional category filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;

    const supabase = await createClient();
    const overview = await getGraphOverview(supabase, category);

    return NextResponse.json(overview);
  } catch (error) {
    console.error('[RankingGraph API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking graph overview' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ranking-graph
 *
 * Handles actions:
 *   - suggestions: Get anomalies and placement suggestions for a list
 *
 * Body:
 *   { action: 'suggestions', listId, category, userPositions, listSize }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'suggestions') {
      const { listId, category, userPositions, listSize } = body;

      if (!listId || !category || !userPositions || !listSize) {
        return NextResponse.json(
          { error: 'Missing required fields: listId, category, userPositions, listSize' },
          { status: 400 }
        );
      }

      const supabase = await createClient();
      const result = await getListSuggestions(
        listId,
        category,
        userPositions,
        listSize,
        supabase
      );

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[RankingGraph API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process ranking graph request' },
      { status: 500 }
    );
  }
}
