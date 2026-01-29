import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  ListItemCriteriaScores,
  ListCriteriaConfig,
  CriterionScore,
  Criterion,
} from '@/lib/criteria/types';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Calculate weighted score from criteria scores and list config
 */
function calculateWeightedScore(
  scores: CriterionScore[],
  criteria: Criterion[]
): number {
  if (!scores.length || !criteria.length) return 0;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const score of scores) {
    const criterion = criteria.find((c) => c.id === score.criterionId);
    if (!criterion) continue;

    // Normalize score to 0-1 range
    const range = criterion.maxScore - criterion.minScore;
    if (range === 0) continue;
    const normalized = (score.score - criterion.minScore) / range;
    weightedSum += normalized * criterion.weight;
  }

  // Return as 0-100 scale, rounded to 2 decimal places
  return Math.round((weightedSum / totalWeight) * 100 * 100) / 100;
}

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
