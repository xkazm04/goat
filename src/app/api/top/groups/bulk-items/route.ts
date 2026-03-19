import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cachedFetch } from '@/lib/cache/server-cache';
import { getRequestId } from '@/lib/api/request-id';

export const dynamic = 'force-dynamic';

/** TTL for bulk items: 5 minutes (same as groups listing) */
const BULK_ITEMS_CACHE_TTL = 5 * 60 * 1000;

/** Maximum number of groups per request to prevent abuse */
const MAX_GROUPS_PER_REQUEST = 100;

/**
 * GET /api/top/groups/bulk-items?group_ids=id1,id2,...
 *
 * Returns all items for the requested groups in a single response,
 * keyed by group_id. Eliminates the N+1 waterfall of fetching items
 * one group at a time.
 *
 * Response shape:
 * {
 *   [groupId: string]: Array<{
 *     id, name, description, category, subcategory,
 *     item_year, item_year_to, image_url, created_at, updated_at, tags
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupIdsParam = searchParams.get('group_ids');

    if (!groupIdsParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: group_ids', requestId },
        { status: 400 }
      );
    }

    const groupIds = groupIdsParam.split(',').filter(Boolean);

    if (groupIds.length === 0) {
      return NextResponse.json({});
    }

    if (groupIds.length > MAX_GROUPS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many groups requested (max ${MAX_GROUPS_PER_REQUEST})`, requestId },
        { status: 400 }
      );
    }

    // Sort IDs for stable cache keys
    const sortedIds = [...groupIds].sort();
    const cacheKey = `bulk-items:${sortedIds.join(',')}`;

    const result = await cachedFetch(cacheKey, BULK_ITEMS_CACHE_TTL, async () => {
      const supabase = await createClient();

      // Single query: fetch all items for all requested groups
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          description,
          category,
          subcategory,
          item_year,
          item_year_to,
          image_url,
          created_at,
          updated_at,
          tags,
          group_id
        `)
        .in('group_id', groupIds)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Group items by group_id
      const grouped: Record<string, typeof items> = {};
      for (const item of items || []) {
        const gid = (item as Record<string, unknown>).group_id as string;
        if (!grouped[gid]) {
          grouped[gid] = [];
        }
        grouped[gid].push(item);
      }

      // Ensure all requested groups have an entry (even if empty)
      for (const gid of groupIds) {
        if (!grouped[gid]) {
          grouped[gid] = [];
        }
      }

      return grouped;
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in GET /api/top/groups/bulk-items:`, error);
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    );
  }
}
