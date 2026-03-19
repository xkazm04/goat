import { NextRequest } from 'next/server';

import { withTiming } from '@/lib/api/request-timing';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  NotFoundError,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { transformCollectionRow } from '@/types/collection';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections/by-slug/[slug] - Get a public collection by share slug
 *
 * Query params:
 * - include_stats: Include computed statistics
 * - include_lists: Include full list data for contained lists
 */
export const GET = withTiming(withErrorHandler(
  async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const { slug } = (await context?.params) || {};

    if (!slug) {
      throw new NotFoundError('Collection slug required');
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const includeStats = searchParams.get('include_stats') === 'true';
    const includeLists = searchParams.get('include_lists') === 'true';

    // Fetch the collection by share_slug
    const { data, error } = await supabase
      .from('list_collections')
      .select('*')
      .eq('share_slug', slug)
      .eq('is_public', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Collection not found');
      }
      throw fromSupabaseError(error);
    }

    if (!data) {
      throw new NotFoundError('Collection not found');
    }

    let collection = transformCollectionRow(data);

    // Include stats if requested
    if (includeStats && collection.listIds.length > 0) {
      const { data: listsData } = await supabase
        .from('lists')
        .select('id, total_items, updated_at')
        .in('id', collection.listIds);

      const totalItems = (listsData || []).reduce(
        (sum, l) => sum + (l.total_items || 0),
        0
      );
      const lastActivity =
        listsData && listsData.length > 0
          ? listsData.reduce(
              (latest, l) =>
                l.updated_at > (latest || '') ? l.updated_at : latest,
              null as string | null
            )
          : null;

      collection = {
        ...collection,
        stats: {
          listCount: collection.listIds.length,
          totalItems,
          completedLists: 0,
          lastActivity,
        },
      } as typeof collection & { stats: object };
    }

    // Include full list data if requested
    if (includeLists && collection.listIds.length > 0) {
      const { data: listsData } = await supabase
        .from('lists')
        .select('*')
        .in('id', collection.listIds);

      collection = {
        ...collection,
        lists: listsData || [],
      } as typeof collection & { lists: object[] };
    }

    return successResponse(collection);
  }
), 'collections/by-slug');
