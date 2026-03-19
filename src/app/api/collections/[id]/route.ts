import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transformCollectionRow, generateShareSlug } from '@/types/collection';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  noContentResponse,
  NotFoundError,
} from '@/lib/errors';
import { withTiming } from '@/lib/api/request-timing';

// Force dynamic rendering for this route since it uses cookies
export const dynamic = 'force-dynamic';

/**
 * GET /api/collections/[id] - Get a single collection by ID
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
    const { id } = (await context?.params) || {};

    if (!id) {
      throw new NotFoundError('Collection ID required');
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const includeStats = searchParams.get('include_stats') === 'true';
    const includeLists = searchParams.get('include_lists') === 'true';

    // Fetch the collection
    const { data, error } = await supabase
      .from('list_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Collection not found');
      }
      throw fromSupabaseError(error);
    }

    let collection = transformCollectionRow(data);
    const warnings: string[] = [];

    // Include stats if requested
    if (includeStats && collection.listIds.length > 0) {
      const { data: listsData, error: statsError } = await supabase
        .from('lists')
        .select('id, total_items, updated_at')
        .in('id', collection.listIds);

      if (statsError) {
        console.error('[collections] Stats query failed', {
          query: 'lists.stats',
          collectionId: id,
          listIds: collection.listIds.slice(0, 5),
          error: statsError.message,
          code: statsError.code,
        });
        warnings.push('stats_unavailable');
      } else {
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
    }

    // Include full list data if requested
    if (includeLists && collection.listIds.length > 0) {
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .in('id', collection.listIds);

      if (listsError) {
        console.error('[collections] Lists query failed', {
          query: 'lists.full',
          collectionId: id,
          listIds: collection.listIds.slice(0, 5),
          error: listsError.message,
          code: listsError.code,
        });
        warnings.push('lists_unavailable');
      } else {
        collection = {
          ...collection,
          lists: listsData || [],
        } as typeof collection & { lists: object[] };
      }
    }

    return successResponse({
      ...collection,
      ...(warnings.length > 0 && { _warnings: warnings }),
    });
  }
), 'collections/[id]');

/**
 * PUT /api/collections/[id] - Update a collection
 *
 * Body fields (all optional):
 * - name: Collection name
 * - description: Description text
 * - color: Accent color
 * - icon: Icon name
 * - cover_image: Cover image URL
 * - parent_id: Parent collection ID (null for root)
 * - is_public: Public visibility
 * - order: Display order
 * - list_ids: Array of list IDs in this collection
 */
export const PUT = withTiming(withErrorHandler(
  async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const { id } = (await context?.params) || {};

    if (!id) {
      throw new NotFoundError('Collection ID required');
    }

    const supabase = await createClient();
    const body = await request.json();

    // Check collection exists
    const { data: existing, error: fetchError } = await supabase
      .from('list_collections')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Collection not found');
    }

    // If changing parent_id, validate nesting depth
    const newParentId = body.parent_id ?? body.parentId;
    if (newParentId !== undefined && newParentId !== existing.parent_id) {
      if (newParentId === id) {
        throw fromSupabaseError({
          message: 'Collection cannot be its own parent',
          code: 'SELF_PARENT',
        });
      }

      if (newParentId !== null) {
        // Check if new parent exists
        const { data: parent, error: parentError } = await supabase
          .from('list_collections')
          .select('id, parent_id')
          .eq('id', newParentId)
          .single();

        if (parentError || !parent) {
          throw new NotFoundError('Parent collection not found');
        }

        // Check nesting depth
        if (parent.parent_id) {
          throw fromSupabaseError({
            message: 'Cannot nest collections more than 2 levels deep',
            code: 'NESTING_LIMIT',
          });
        }

        // Check if this collection has children (can't nest a collection with children)
        const { data: children } = await supabase
          .from('list_collections')
          .select('id')
          .eq('parent_id', id)
          .limit(1);

        if (children && children.length > 0) {
          throw fromSupabaseError({
            message:
              'Cannot nest a collection that has children (would exceed 2-level limit)',
            code: 'NESTING_LIMIT',
          });
        }
      }
    }

    // Handle share slug generation/removal
    const isPublic = body.is_public ?? body.isPublic;
    let shareSlug = existing.share_slug;

    if (isPublic !== undefined) {
      if (isPublic && !existing.share_slug) {
        // Generate new slug
        const { data: existingSlugs } = await supabase
          .from('list_collections')
          .select('share_slug')
          .not('share_slug', 'is', null);

        const slugs = (existingSlugs || [])
          .map((c) => c.share_slug)
          .filter(Boolean) as string[];
        shareSlug = generateShareSlug(body.name || existing.name, slugs);
      } else if (!isPublic) {
        shareSlug = null;
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.cover_image !== undefined || body.coverImage !== undefined) {
      updates.cover_image = body.cover_image ?? body.coverImage;
    }
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (newParentId !== undefined) updates.parent_id = newParentId;
    if (isPublic !== undefined) {
      updates.is_public = isPublic;
      updates.share_slug = shareSlug;
    }
    if (body.order !== undefined) updates.order = body.order;
    if (body.list_ids !== undefined || body.listIds !== undefined) {
      updates.list_ids = body.list_ids ?? body.listIds;
    }

    // Update the collection
    const { data, error } = await supabase
      .from('list_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw fromSupabaseError(error);
    }

    return successResponse(transformCollectionRow(data));
  }
), 'collections/[id]');

/**
 * DELETE /api/collections/[id] - Delete a collection
 *
 * Query params:
 * - cascade: If 'true', also delete child collections. Default: false (orphan children)
 */
export const DELETE = withTiming(withErrorHandler(
  async (
    request: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    const { id } = (await context?.params) || {};

    if (!id) {
      throw new NotFoundError('Collection ID required');
    }

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const cascade = searchParams.get('cascade') === 'true';

    // Check collection exists
    const { data: existing, error: fetchError } = await supabase
      .from('list_collections')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Collection not found');
    }

    if (cascade) {
      // Delete all child collections first
      const { error: childError } = await supabase
        .from('list_collections')
        .delete()
        .eq('parent_id', id);

      if (childError) {
        throw fromSupabaseError(childError);
      }
    } else {
      // Orphan children (set parent_id to null)
      const { error: orphanError } = await supabase
        .from('list_collections')
        .update({ parent_id: null })
        .eq('parent_id', id);

      if (orphanError) {
        throw fromSupabaseError(orphanError);
      }
    }

    // Delete the collection
    const { error } = await supabase
      .from('list_collections')
      .delete()
      .eq('id', id);

    if (error) {
      throw fromSupabaseError(error);
    }

    return noContentResponse();
  }
), 'collections/[id]');
