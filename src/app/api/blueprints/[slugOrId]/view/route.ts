import { NextRequest } from 'next/server';

import {
  withErrorHandler,
  fromSupabaseError,
  notFound,
  successResponse,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// POST /api/blueprints/[slugOrId]/view - Record a single blueprint view.
//
// View tracking is decoupled from the detail GET so that React Query
// refetches/remounts and the clone/highlighted-template flows (which also read
// the blueprint) don't inflate the count. Callers fire this once per real view.
export const POST = withErrorHandler(
  async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    const supabase = await createClient();
    const { slugOrId } = (await context?.params) || {};

    if (!slugOrId) {
      notFound('Blueprint');
    }

    // Resolve the blueprint id (by slug or id) without selecting the whole row.
    let query = supabase.from('blueprints').select('id, usage_count');

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

    // Increment usage count atomically (avoids lost concurrent increments).
    // Falls back to read-modify-write if the RPC isn't present yet (safe to
    // deploy before 20260616000000_add_increment_counter_rpcs.sql is applied).
    const { error: usageRpcError } = await supabase.rpc('increment_blueprint_usage_count', {
      blueprint_id: data.id,
    });
    if (usageRpcError) {
      await supabase
        .from('blueprints')
        .update({ usage_count: (data.usage_count || 0) + 1 })
        .eq('id', data.id);
    }

    return successResponse({ tracked: true });
  }
);
