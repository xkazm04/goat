import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ListCriteriaConfig } from '@/lib/criteria/types';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lists/:id/criteria - Get criteria config for a list
 *
 * Returns focused criteria configuration without full list data.
 * Useful for criteria-focused operations that don't need list metadata.
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};
    if (!id) notFound('List');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('lists')
      .select('id, criteria_config')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') notFound('List', id);
      throw fromSupabaseError(error);
    }

    return successResponse({
      listId: data.id,
      criteriaConfig: data.criteria_config as ListCriteriaConfig | null,
    });
  }
);

/**
 * PUT /api/lists/:id/criteria - Update criteria config for a list
 *
 * Allows updating criteria configuration independently of other list fields.
 * Accepts criteriaConfig (camelCase) or criteria_config (snake_case) in body.
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};
    if (!id) notFound('List');

    const supabase = await createClient();
    const body = await request.json();

    // Accept criteriaConfig (camelCase) from frontend
    const criteriaConfig: ListCriteriaConfig | null = body.criteriaConfig ?? body.criteria_config ?? null;

    // Update criteria_config column
    const { data, error } = await supabase
      .from('lists')
      .update({
        criteria_config: criteriaConfig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, criteria_config')
      .single();

    if (error) {
      if (error.code === 'PGRST116') notFound('List', id);
      throw fromSupabaseError(error);
    }

    return successResponse({
      listId: data.id,
      criteriaConfig: data.criteria_config as ListCriteriaConfig | null,
    });
  }
);
