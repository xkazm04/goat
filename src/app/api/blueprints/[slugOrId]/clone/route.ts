import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlueprintRow, blueprintFromRow } from '@/types/blueprint';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  createdResponse,
} from '@/lib/errors';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// POST /api/blueprints/[slugOrId]/clone - Clone a blueprint and create a list
export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};
    const body = await request.json();

    if (!slugOrId) {
      notFound('Blueprint');
    }

    // First, find the blueprint
    let findQuery = supabase.from('blueprints').select('*');

    if (isUUID(slugOrId)) {
      findQuery = findQuery.eq('id', slugOrId);
    } else {
      findQuery = findQuery.eq('slug', slugOrId);
    }

    const { data: blueprintData, error: findError } = await findQuery.single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        notFound('Blueprint', slugOrId);
      }
      throw fromSupabaseError(findError);
    }

    const blueprint = blueprintFromRow(blueprintData as BlueprintRow);

    // Create a new list based on the blueprint
    const listData = {
      title: body.title || blueprint.title,
      category: body.category || blueprint.category,
      subcategory: body.subcategory || blueprint.subcategory,
      size: body.size || blueprint.size,
      time_period: body.timePeriod || blueprint.timePeriod,
      description: body.description || blueprint.description,
      user_id: body.userId,
      predefined: false,
      type: 'top',
      parent_list_id: blueprint.sourceListId, // Link to original if exists
    };

    // Insert the new list
    const { data: listResult, error: listError } = await supabase
      .from('lists')
      .insert([listData])
      .select()
      .single();

    if (listError) {
      throw fromSupabaseError(listError);
    }

    // Increment clone count on the blueprint
    await supabase
      .from('blueprints')
      .update({ clone_count: (blueprintData.clone_count || 0) + 1 })
      .eq('id', blueprintData.id);

    return createdResponse({
      list: listResult,
      blueprint,
    });
  }
);
