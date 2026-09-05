import { NextRequest } from 'next/server';

import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  forbidden,
  unauthorized,
  successResponse,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import {
  BlueprintRow,
  blueprintFromRow,
  UpdateBlueprintRequest,
} from '@/types/blueprint';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * The route is the ONLY authorization door for blueprint writes: migration
 * 20260315000002 replaced the owner-scoped RLS policies with
 * `"Anyone can update/delete blueprints" USING (true)`. Before 2026-09-05 PATCH
 * and DELETE checked nothing but `is_system`, so any anonymous request could
 * rewrite or remove any community template.
 *
 * A row with no `author_id` (published without a session) has no owner and is
 * therefore not editable through the API at all — that is the conservative
 * reading, not an oversight.
 */
async function assertCanMutate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  existing: Pick<BlueprintRow, 'is_system' | 'author_id'>,
  verb: 'modify' | 'delete',
): Promise<void> {
  if (existing.is_system) {
    forbidden(`Cannot ${verb} system blueprints`);
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    unauthorized(`You must be signed in to ${verb} a blueprint`);
  }
  if (!existing.author_id || existing.author_id !== user.id) {
    forbidden(`You can only ${verb} your own blueprints`);
  }
}

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

    // View counting is intentionally NOT done here. This GET runs on every
    // React Query refetch/remount and is also hit by the clone/highlighted-
    // template flows, so incrementing here over-counts a single real view.
    // View tracking lives in the dedicated fire-once POST /view route, called
    // once when a user actually opens a blueprint deep link.

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

    // The generated Database type predates the author_id column (migration
    // 20251205000000); the file already reads rows as BlueprintRow for that reason.
    await assertCanMutate(supabase, existingData as unknown as BlueprintRow, 'modify');

    // Prepare update data. `is_featured` is server-owned curation, not a field
    // the author may set on their own template — it is deliberately absent.
    const updateData: Partial<BlueprintRow> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
    if (body.size !== undefined) updateData.size = body.size;
    if (body.timePeriod !== undefined) updateData.time_period = body.timePeriod;
    if (body.description !== undefined) updateData.description = body.description;
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

    await assertCanMutate(supabase, existingData as unknown as BlueprintRow, 'delete');

    // Delete the blueprint
    const { error } = await supabase.from('blueprints').delete().eq('id', existingData.id);

    if (error) {
      throw fromSupabaseError(error);
    }

    return successResponse({ message: 'Blueprint deleted successfully' });
  }
);
