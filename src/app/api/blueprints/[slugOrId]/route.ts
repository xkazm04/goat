import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  BlueprintRow,
  blueprintFromRow,
  UpdateBlueprintRequest,
} from '@/types/blueprint';
import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  forbidden,
  successResponse,
} from '@/lib/errors';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// GET /api/blueprints/[slugOrId] - Get a specific blueprint by slug or ID
export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};

    if (!slugOrId) {
      notFound('Blueprint');
    }

    // Try to find by slug first, then by ID
    let query = supabase.from('blueprints').select('*');

    if (isUUID(slugOrId)) {
      query = query.eq('id', slugOrId);
    } else {
      query = query.eq('slug', slugOrId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        notFound('Blueprint', slugOrId);
      }
      throw fromSupabaseError(error);
    }

    const blueprint = blueprintFromRow(data as BlueprintRow);

    // Increment usage count (view tracking)
    await supabase
      .from('blueprints')
      .update({ usage_count: (data.usage_count || 0) + 1 })
      .eq('id', data.id);

    return successResponse(blueprint);
  }
);

// PATCH /api/blueprints/[slugOrId] - Update a blueprint
export const PATCH = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};
    const body: UpdateBlueprintRequest = await request.json();

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

    const { data: existingData, error: findError } = await findQuery.single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        notFound('Blueprint', slugOrId);
      }
      throw fromSupabaseError(findError);
    }

    // Prevent editing system blueprints
    if (existingData.is_system) {
      forbidden('Cannot modify system blueprints');
    }

    // Prepare update data
    const updateData: Partial<BlueprintRow> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
    if (body.size !== undefined) updateData.size = body.size;
    if (body.timePeriod !== undefined) updateData.time_period = body.timePeriod;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isFeatured !== undefined) updateData.is_featured = body.isFeatured;
    if (body.color) {
      updateData.color_primary = body.color.primary;
      updateData.color_secondary = body.color.secondary;
      updateData.color_accent = body.color.accent;
    }

    // Update the blueprint
    const { data, error } = await supabase
      .from('blueprints')
      .update(updateData)
      .eq('id', existingData.id)
      .select()
      .single();

    if (error) {
      throw fromSupabaseError(error);
    }

    const blueprint = blueprintFromRow(data as BlueprintRow);

    return successResponse(blueprint);
  }
);

// DELETE /api/blueprints/[slugOrId] - Delete a blueprint
export const DELETE = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};

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

    const { data: existingData, error: findError } = await findQuery.single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        notFound('Blueprint', slugOrId);
      }
      throw fromSupabaseError(findError);
    }

    // Prevent deleting system blueprints
    if (existingData.is_system) {
      forbidden('Cannot delete system blueprints');
    }

    // Delete the blueprint
    const { error } = await supabase.from('blueprints').delete().eq('id', existingData.id);

    if (error) {
      throw fromSupabaseError(error);
    }

    return successResponse({ message: 'Blueprint deleted successfully' });
  }
);
