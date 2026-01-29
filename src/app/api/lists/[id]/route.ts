import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ListItemWithItem, ListUpdate, ListRow } from '@/types/database';
import type { ListCriteriaConfig } from '@/lib/criteria/types';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';

/**
 * Transform list response from snake_case DB format to camelCase frontend format
 * Specifically handles criteria_config -> criteriaConfig transformation
 */
function transformListResponse(list: ListRow) {
  const { criteria_config, ...rest } = list;
  return {
    ...rest,
    criteriaConfig: criteria_config as ListCriteriaConfig | null,
  };
}

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

// GET /api/lists/:id - Get a single list by ID
export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};

    if (!id) {
      notFound('List');
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const includeItems = searchParams.get('include_items') === 'true';
    const includeCriteria = searchParams.get('include_criteria') !== 'false'; // default true

    const { data: list, error } = await supabase
      .from('lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        notFound('List', id);
      }
      throw fromSupabaseError(error);
    }

    // If include_items is true, fetch items for this list
    if (includeItems) {
      const { data: listItems, error: itemsError } = await supabase
        .from('list_items')
        .select(`
          ranking,
          item_id,
          items (
            id,
            name,
            description,
            image_url,
            category,
            subcategory,
            group_id,
            item_year
          )
        `)
        .eq('list_id', id)
        .order('ranking', { ascending: true });

      if (itemsError) {
        throw fromSupabaseError(itemsError);
      }

      // Transform the response to flatten the items structure
      // Map 'name' to 'title' for backwards compatibility with frontend
      const items = (listItems || []).map((li: ListItemWithItem) => ({
        ...li.items,
        title: li.items?.name, // Map name to title for frontend compatibility
        position: li.ranking,
      }));

      const response = transformListResponse(list);
      // Omit criteriaConfig if include_criteria=false
      if (!includeCriteria) {
        const { criteriaConfig: _, ...responseWithoutCriteria } = response;
        return successResponse({
          ...responseWithoutCriteria,
          items,
          total_items: items.length,
        });
      }
      return successResponse({
        ...response,
        items,
        total_items: items.length,
      });
    }

    // Omit criteriaConfig if include_criteria=false
    if (!includeCriteria) {
      const { criteriaConfig: _, ...responseWithoutCriteria } = transformListResponse(list);
      return successResponse(responseWithoutCriteria);
    }

    return successResponse(transformListResponse(list));
  }
);

// DELETE /api/lists/:id - Delete a list
export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};

    if (!id) {
      notFound('List');
    }

    const supabase = await createClient();

    // Delete the list (items should be deleted via CASCADE in the database)
    const { error } = await supabase.from('lists').delete().eq('id', id);

    if (error) {
      throw fromSupabaseError(error);
    }

    return successResponse({ message: 'List deleted successfully' });
  }
);

// PUT /api/lists/:id - Update a list
export const PUT = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const { id } = (await context?.params) || {};

    if (!id) {
      notFound('List');
    }

    const supabase = await createClient();
    const body = await request.json();

    // Prepare update data
    // Support both camelCase (frontend) and snake_case (legacy) for criteria_config
    const updateData: ListUpdate = {
      title: body.title,
      description: body.description,
      category: body.category,
      subcategory: body.subcategory,
      size: body.size,
      time_period: body.time_period,
      criteria_config: body.criteriaConfig ?? body.criteria_config,
    };

    // Update the list
    const { data, error } = await supabase
      .from('lists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw fromSupabaseError(error);
    }

    return successResponse(transformListResponse(data));
  }
);
