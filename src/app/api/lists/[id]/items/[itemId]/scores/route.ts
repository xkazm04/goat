import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  ListItemCriteriaScores,
  ListCriteriaConfig,
  CriterionScore,
} from '@/lib/criteria/types';
import { calculateWeightedScore } from '@/lib/criteria/calculateWeightedScore';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

// GET /api/lists/:id/items/:itemId/scores - Get scores for a specific item
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const params = (await context?.params) || {};
    const { id: listId, itemId } = params;

    if (!listId) notFound('List');
    if (!itemId) notFound('Item');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('list_items')
      .select('id, criteria_scores')
      .eq('list_id', listId)
      .eq('item_id', itemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') notFound('List item', `${listId}/${itemId}`);
      throw fromSupabaseError(error);
    }

    return successResponse({
      listItemId: data.id,
      criteriaScores: data.criteria_scores as ListItemCriteriaScores | null,
    });
  }
);

// PUT /api/lists/:id/items/:itemId/scores - Update scores for a specific item
export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const params = (await context?.params) || {};
    const { id: listId, itemId } = params;

    if (!listId) notFound('List');
    if (!itemId) notFound('Item');

    const supabase = await createClient();
    const body = await request.json();

    // Get the list's criteria config to calculate weighted score
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('criteria_config')
      .eq('id', listId)
      .single();

    if (listError) {
      if (listError.code === 'PGRST116') notFound('List', listId);
      throw fromSupabaseError(listError);
    }

    const criteriaConfig = list.criteria_config as ListCriteriaConfig | null;

    // Build criteria scores object
    const scores: CriterionScore[] = body.scores || [];
    const weightedScore = criteriaConfig
      ? calculateWeightedScore(scores, criteriaConfig.criteria)
      : 0;

    const criteriaScores: ListItemCriteriaScores = {
      profileId: body.profileId || criteriaConfig?.profileId || 'unknown',
      scores,
      weightedScore,
      justification: body.justification,
      scoredAt: new Date().toISOString(),
    };

    // Update the list item
    const { data, error } = await supabase
      .from('list_items')
      .update({ criteria_scores: criteriaScores })
      .eq('list_id', listId)
      .eq('item_id', itemId)
      .select('id, criteria_scores')
      .single();

    if (error) {
      if (error.code === 'PGRST116') notFound('List item', `${listId}/${itemId}`);
      throw fromSupabaseError(error);
    }

    return successResponse({
      listItemId: data.id,
      criteriaScores: data.criteria_scores as ListItemCriteriaScores,
    });
  }
);
