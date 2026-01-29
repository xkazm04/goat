import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ListItemCriteriaScores } from '@/lib/criteria/types';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Response type for list items with criteria scores
 */
interface ListItemResponse {
  id: string;
  listId: string;
  itemId: string;
  ranking: number;
  criteriaScores: ListItemCriteriaScores | null;
  item: {
    id: string;
    name: string;
    image_url: string | null;
    category: string;
  } | null;
}

// GET /api/lists/:id/items - Get all items with their criteria scores
export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};
    if (!id) notFound('List');

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeScores = searchParams.get('include_scores') !== 'false'; // default true

    // Always fetch with scores - filter on response if needed
    const { data, error } = await supabase
      .from('list_items')
      .select(`
        id,
        list_id,
        item_id,
        ranking,
        criteria_scores,
        items (
          id,
          name,
          image_url,
          category
        )
      `)
      .eq('list_id', id)
      .order('ranking', { ascending: true });

    if (error) throw fromSupabaseError(error);

    // Transform response - use 'any' for raw Supabase response
    const items: ListItemResponse[] = ((data as unknown[]) || []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: row.id as string,
        listId: row.list_id as string,
        itemId: row.item_id as string,
        ranking: row.ranking as number,
        criteriaScores: includeScores
          ? (row.criteria_scores as ListItemCriteriaScores | null) ?? null
          : null,
        item: row.items as ListItemResponse['item'],
      };
    });

    return successResponse({ items });
  }
);

// PUT /api/lists/:id/items - Batch update item scores (for sync)
export const PUT = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};
    if (!id) notFound('List');

    const supabase = await createClient();
    const body = await request.json();

    // Expect: { items: [{ itemId, criteriaScores }] }
    const updates = body.items || [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return successResponse({ updated: 0 });
    }

    // Update each item's scores
    let updatedCount = 0;
    for (const update of updates) {
      const { itemId, criteriaScores } = update;
      if (!itemId) continue;

      const { error } = await supabase
        .from('list_items')
        .update({ criteria_scores: criteriaScores })
        .eq('list_id', id)
        .eq('item_id', itemId);

      if (!error) updatedCount++;
    }

    return successResponse({ updated: updatedCount });
  }
);
