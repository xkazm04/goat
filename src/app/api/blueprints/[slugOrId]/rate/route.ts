import { NextRequest } from 'next/server';

import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  badRequest,
  successResponse,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { RateTemplateRequest } from '@/types/blueprint';

export const dynamic = 'force-dynamic';

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// POST /api/blueprints/[slugOrId]/rate - Rate a community template
export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};
    const body: RateTemplateRequest = await request.json();

    if (!slugOrId) {
      notFound('Blueprint');
    }

    const { rating } = body;
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      badRequest('Rating must be an integer between 1 and 5');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      badRequest('You must be signed in to rate templates');
    }

    // Find the blueprint (new columns from migration may not be in generated types)
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bpAny = blueprintData as any;
    if (!bpAny.is_community) {
      badRequest('Only community templates can be rated');
    }

    // blueprint_ratings table added via migration — not yet in generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { error: rateError } = await db
      .from('blueprint_ratings')
      .upsert(
        {
          blueprint_id: bpAny.id,
          user_id: user!.id,
          rating,
        },
        { onConflict: 'blueprint_id,user_id' }
      );

    if (rateError) {
      throw fromSupabaseError(rateError);
    }

    // Fetch updated stats (trigger recalculates avg_rating/rating_count)
    const { data: updated } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', bpAny.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedAny = updated as any;

    return successResponse({
      avgRating: updatedAny?.avg_rating ?? 0,
      ratingCount: updatedAny?.rating_count ?? 0,
      userRating: rating,
    });
  }
);

// GET /api/blueprints/[slugOrId]/rate - Get current user's rating
export const GET = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};

    if (!slugOrId) {
      notFound('Blueprint');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return successResponse({ userRating: null });
    }

    let findQuery = supabase.from('blueprints').select('id');
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: ratingData } = await db
      .from('blueprint_ratings')
      .select('rating')
      .eq('blueprint_id', blueprintData.id)
      .eq('user_id', user.id)
      .maybeSingle();

    return successResponse({ userRating: ratingData?.rating ?? null });
  }
);
