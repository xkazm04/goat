import { NextRequest } from 'next/server';

import { withTiming } from '@/lib/api/request-timing';
import { cachedFetch } from '@/lib/cache/server-cache';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  createdResponse,
  assertRequired,
} from '@/lib/errors';
import { createClient, requireAuth, sanitizeFilterValue, escapeIlikeWildcards } from '@/lib/supabase/server';
import { transformCollectionRow, generateShareSlug } from '@/types/collection';

import type { ListCollectionRow } from '@/types/database';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections - Get collections with optional filters
 *
 * Query params:
 * - user_id: Filter by user ID (required for user's collections)
 * - parent_id: Filter by parent collection ID (null for root collections)
 * - include_children: Include nested children in response
 * - include_stats: Include computed statistics
 * - search: Search term for name/description
 * - sort_by: Sort field (name, created, modified, order)
 * - sort_order: Sort direction (asc, desc)
 * - limit: Max results (default 100)
 * - offset: Pagination offset (default 0)
 */
export const GET = withTiming(withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Extract query parameters
  const userId = searchParams.get('user_id');
  const parentId = searchParams.get('parent_id');
  const includeChildren = searchParams.get('include_children') === 'true';
  const includeStats = searchParams.get('include_stats') === 'true';
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sort_by') || 'order';
  const sortOrder = searchParams.get('sort_order') || 'asc';
  const limit = Math.max(1, Math.min(
    parseInt(searchParams.get('limit') || '100'),
    500
  ));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

  // Cache simple collection lookups (no stats, no children, no search).
  // User-specific data is keyed per user with a shorter TTL.
  const isSimpleQuery = !includeStats && !includeChildren && !search;
  /** TTL for collection lookups: 2 minutes */
  const COLLECTIONS_CACHE_TTL = 2 * 60 * 1000;
  const cacheKey = isSimpleQuery
    ? `collections:${userId || 'all'}:${parentId || 'root'}:${sortBy}:${sortOrder}:${limit}:${offset}`
    : '';

  const fetchCollections = async () => {
    // Build query
    let query = supabase
      .from('list_collections')
      .select('*')
      .order(
        sortBy === 'created'
          ? 'created_at'
          : sortBy === 'modified'
            ? 'updated_at'
            : sortBy === 'name'
              ? 'name'
              : 'order',
        { ascending: sortOrder === 'asc' }
      )
      .range(offset, offset + limit - 1);

    // Apply filters
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Handle parent_id filter (null means root collections)
    if (parentId === 'null' || parentId === '') {
      query = query.is('parent_id', null);
    } else if (parentId) {
      query = query.eq('parent_id', parentId);
    }

    // Search by name or description
    if (search) {
      query = query.or(`name.ilike.%${sanitizeFilterValue(escapeIlikeWildcards(search))}%,description.ilike.%${sanitizeFilterValue(escapeIlikeWildcards(search))}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw fromSupabaseError(error);
    }

    return (data || []).map(transformCollectionRow);
  };

  // Use cache for simple queries, bypass for complex ones
  let collections = isSimpleQuery
    ? await cachedFetch(cacheKey, COLLECTIONS_CACHE_TTL, fetchCollections)
    : await fetchCollections();

  const warnings: string[] = [];

  // If including stats, fetch list data for each collection
  if (includeStats && collections.length > 0) {
    const allListIds = collections.flatMap((c) => c.listIds);
    const uniqueListIds = Array.from(new Set(allListIds));

    if (uniqueListIds.length > 0) {
      const { data: listsData, error: statsError } = await supabase
        .from('lists')
        .select('id, total_items, updated_at')
        .in('id', uniqueListIds);

      if (statsError) {
        console.error('[collections] Stats query failed', {
          query: 'lists.stats',
          listIds: uniqueListIds.slice(0, 5),
          listIdCount: uniqueListIds.length,
          error: statsError.message,
          code: statsError.code,
        });
        warnings.push('stats_unavailable');
      } else {
        const listsMap = new Map(
          (listsData || []).map((l) => [l.id, l])
        );

        collections = collections.map((collection) => {
          const collectionLists = collection.listIds
            .map((id) => listsMap.get(id))
            .filter(Boolean);

          return {
            ...collection,
            stats: {
              listCount: collection.listIds.length,
              totalItems: collectionLists.reduce(
                (sum, l) => sum + (l?.total_items || 0),
                0
              ),
              completedLists: 0, // Would need additional logic to determine
              lastActivity:
                collectionLists.length > 0
                  ? collectionLists.reduce((latest, l) =>
                      l && l.updated_at > (latest || '')
                        ? l.updated_at
                        : latest,
                      null as string | null
                    )
                  : null,
            },
          };
        });
      }
    }
  }

  // If including children, recursively fetch nested collections
  if (includeChildren && collections.length > 0) {
    const collectionIds = collections.map((c) => c.id);
    const { data: childrenData, error: childrenError } = await supabase
      .from('list_collections')
      .select('*')
      .in('parent_id', collectionIds);

    if (childrenError) {
      console.error('[collections] Children query failed', {
        query: 'list_collections.children',
        parentIds: collectionIds.slice(0, 5),
        parentIdCount: collectionIds.length,
        error: childrenError.message,
        code: childrenError.code,
      });
      warnings.push('children_unavailable');
    } else if (childrenData && childrenData.length > 0) {
      const childrenByParent = new Map<string, typeof collections>();

      childrenData.forEach((child) => {
        const transformed = transformCollectionRow(child as ListCollectionRow);
        const parentChildren =
          childrenByParent.get(child.parent_id!) || [];
        parentChildren.push(transformed);
        childrenByParent.set(child.parent_id!, parentChildren);
      });

      collections = collections.map((c) => ({
        ...c,
        children: childrenByParent.get(c.id) || [],
      }));
    }
  }

  return successResponse({
    data: collections,
    ...(warnings.length > 0 && { _warnings: warnings }),
  });
}), 'collections');

/**
 * POST /api/collections - Create a new collection
 *
 * Body:
 * - name: Collection name (required)
 * - description: Optional description
 * - color: Optional accent color
 * - icon: Optional icon name
 * - cover_image: Optional cover image URL
 * - parent_id: Optional parent collection ID for nesting
 * - is_public: Whether collection is publicly viewable
 * - user_id: Owner user ID (required)
 */
export const POST = withTiming(withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  const body = await request.json();

  // Validate required fields
  assertRequired(body.name, 'name');

  // Use authenticated user's ID — ignore client-provided user_id
  body.user_id = auth.userId;

  // If parent_id is provided, validate it exists and check nesting depth
  if (body.parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from('list_collections')
      .select('id, parent_id')
      .eq('id', body.parent_id)
      .eq('user_id', auth.userId)
      .single();

    if (parentError || !parent) {
      throw fromSupabaseError(
        parentError || { message: 'Parent collection not found', code: '404' }
      );
    }

    // Check if parent already has a parent (max 2 levels deep)
    if (parent.parent_id) {
      throw fromSupabaseError({
        message: 'Cannot nest collections more than 2 levels deep',
        code: 'NESTING_LIMIT',
      });
    }
  }

  // Get current max order for the parent level
  const { data: existingCollections } = await supabase
    .from('list_collections')
    .select('order')
    .eq('user_id', body.user_id)
    .is('parent_id', body.parent_id || null)
    .order('order', { ascending: false })
    .limit(1);

  const nextOrder =
    existingCollections && existingCollections.length > 0
      ? (existingCollections[0].order || 0) + 1
      : 0;

  // Generate share slug if making public
  let shareSlug = null;
  if (body.is_public) {
    const { data: existingSlugs } = await supabase
      .from('list_collections')
      .select('share_slug')
      .not('share_slug', 'is', null);

    const slugs = (existingSlugs || [])
      .map((c) => c.share_slug)
      .filter(Boolean) as string[];
    shareSlug = generateShareSlug(body.name, slugs);
  }

  // Insert with retry-on-conflict for slug collisions.
  // Two concurrent requests can read the same set of slugs and generate
  // identical slugs. We rely on a database unique constraint on share_slug
  // and retry with a random suffix up to 3 times.
  const MAX_SLUG_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from('list_collections')
      .insert([
        {
          name: body.name,
          description: body.description || null,
          cover_image: body.cover_image || body.coverImage || null,
          color: body.color || null,
          icon: body.icon || null,
          parent_id: body.parent_id || body.parentId || null,
          user_id: body.user_id,
          list_ids: body.list_ids || body.listIds || [],
          is_public: body.is_public || body.isPublic || false,
          share_slug: shareSlug,
          order: nextOrder,
        },
      ])
      .select()
      .single();

    if (!error) {
      return createdResponse(transformCollectionRow(data));
    }

    // PostgreSQL unique violation: code 23505
    const isUniqueViolation = error.code === '23505' && shareSlug;
    if (isUniqueViolation && attempt < MAX_SLUG_RETRIES) {
      // Regenerate slug with random suffix
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const slugBase: string = shareSlug!.replace(/-[a-z0-9]{6}$/, ''); // strip previous suffix if present
      shareSlug = `${slugBase}-${randomSuffix}`;
      continue;
    }

    throw fromSupabaseError(error);
  }

  // Should not reach here, but satisfy TypeScript
  throw fromSupabaseError({ message: 'Failed to create collection after retries', code: 'SLUG_COLLISION' });
}), 'collections');
