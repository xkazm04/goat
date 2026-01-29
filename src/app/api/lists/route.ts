import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ListRow } from '@/types/database';
import type { ListCriteriaConfig } from '@/lib/criteria/types';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  createdResponse,
  assertRequired,
} from '@/lib/errors';

/**
 * Transform list response from snake_case DB format to camelCase frontend format
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

// GET /api/lists - Get lists with optional filters
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Extract query parameters
  const userId = searchParams.get('user_id');
  const category = searchParams.get('category');
  const subcategory = searchParams.get('subcategory');
  const predefined = searchParams.get('predefined');
  const type = searchParams.get('type');
  const parentListId = searchParams.get('parent_list_id');
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

  // Build query
  let query = supabase
    .from('lists')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (subcategory) {
    query = query.eq('subcategory', subcategory);
  }
  if (predefined !== null) {
    query = query.eq('predefined', predefined === 'true');
  }
  if (type) {
    query = query.eq('type', type);
  }
  if (parentListId) {
    query = query.eq('parent_list_id', parentListId);
  }

  const { data, error } = await query;

  if (error) {
    throw fromSupabaseError(error);
  }

  // Transform all lists to include camelCase criteriaConfig
  const transformedData = (data || []).map(transformListResponse);
  return successResponse(transformedData);
});

// POST /api/lists - Create a new list
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const body = await request.json();

  // Validate required fields
  const { title, category, size } = body;
  assertRequired(title, 'title');
  assertRequired(category, 'category');
  assertRequired(size, 'size');

  // Insert the new list
  // Support both camelCase (frontend) and snake_case (legacy) for criteria_config
  const { data, error } = await supabase
    .from('lists')
    .insert([
      {
        title: body.title,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        user_id: body.user_id,
        predefined: body.predefined || false,
        size: body.size,
        time_period: body.time_period,
        type: body.type || 'top',
        parent_list_id: body.parent_list_id,
        criteria_config: body.criteriaConfig ?? body.criteria_config ?? null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw fromSupabaseError(error);
  }

  return createdResponse(transformListResponse(data));
});
