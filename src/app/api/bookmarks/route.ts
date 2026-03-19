import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  createdResponse,
  assertRequired,
} from '@/lib/errors';
import { withTiming } from '@/lib/api/request-timing';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookmarks - Get user's bookmarks and folders
 * Query params:
 * - user_id: required
 * - folder_id: optional, filter by folder
 */
export const GET = withTiming(withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  assertRequired(userId, 'user_id');

  // Fetch bookmarks with list data
  let bookmarksQuery = supabase
    .from('user_bookmarks')
    .select('*')
    .eq('user_id', userId!)
    .order('created_at', { ascending: false });

  const folderId = searchParams.get('folder_id');
  if (folderId === 'null') {
    bookmarksQuery = bookmarksQuery.is('folder_id', null);
  } else if (folderId) {
    bookmarksQuery = bookmarksQuery.eq('folder_id', folderId);
  }

  // Fetch bookmarks and folders in parallel
  const [bookmarksResult, foldersResult] = await Promise.all([
    bookmarksQuery,
    supabase
      .from('bookmark_folders')
      .select('*')
      .eq('user_id', userId!)
      .order('order', { ascending: true }),
  ]);

  if (bookmarksResult.error) throw fromSupabaseError(bookmarksResult.error);
  if (foldersResult.error) throw fromSupabaseError(foldersResult.error);

  // Fetch list details for bookmarked lists
  const listIds = (bookmarksResult.data || []).map(b => b.list_id);
  let lists: Record<string, any> = {};

  if (listIds.length > 0) {
    const { data: listsData } = await supabase
      .from('lists')
      .select('id, title, category, subcategory, size, created_at, description')
      .in('id', listIds);

    if (listsData) {
      lists = Object.fromEntries(listsData.map(l => [l.id, l]));
    }
  }

  return successResponse({
    bookmarks: (bookmarksResult.data || []).map(b => ({
      ...b,
      list: lists[b.list_id] || null,
    })),
    folders: foldersResult.data || [],
  });
}), 'bookmarks');

/**
 * POST /api/bookmarks - Create a bookmark or folder
 * Body:
 * - type: 'bookmark' | 'folder'
 * - For bookmark: user_id, list_id, folder_id? notes?
 * - For folder: user_id, name, icon?, color?
 */
export const POST = withTiming(withErrorHandler<any>(async (request: NextRequest) => {
  const supabase = await createClient();
  const body = await request.json();

  assertRequired(body.user_id, 'user_id');
  assertRequired(body.type, 'type');

  if (body.type === 'folder') {
    assertRequired(body.name, 'name');

    // Get next order value
    const { data: existing } = await supabase
      .from('bookmark_folders')
      .select('order')
      .eq('user_id', body.user_id)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].order + 1) : 0;

    const { data, error } = await supabase
      .from('bookmark_folders')
      .insert({
        user_id: body.user_id,
        name: body.name,
        icon: body.icon || null,
        color: body.color || null,
        order: nextOrder,
      })
      .select()
      .single();

    if (error) throw fromSupabaseError(error);
    return createdResponse(data);
  }

  // Bookmark
  assertRequired(body.list_id, 'list_id');

  const { data, error } = await supabase
    .from('user_bookmarks')
    .insert({
      user_id: body.user_id,
      list_id: body.list_id,
      folder_id: body.folder_id || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation = already bookmarked
    if (error.code === '23505') {
      return successResponse({ message: 'Already bookmarked', alreadyExists: true });
    }
    throw fromSupabaseError(error);
  }

  return createdResponse(data);
}), 'bookmarks');

/**
 * DELETE /api/bookmarks - Remove a bookmark or folder
 * Body:
 * - type: 'bookmark' | 'folder'
 * - For bookmark: user_id, list_id
 * - For folder: folder_id
 */
export const DELETE = withTiming(withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const body = await request.json();

  assertRequired(body.type, 'type');

  if (body.type === 'folder') {
    assertRequired(body.folder_id, 'folder_id');

    // Move bookmarks in this folder to uncategorized
    await supabase
      .from('user_bookmarks')
      .update({ folder_id: null })
      .eq('folder_id', body.folder_id);

    const { error } = await supabase
      .from('bookmark_folders')
      .delete()
      .eq('id', body.folder_id);

    if (error) throw fromSupabaseError(error);
    return successResponse({ message: 'Folder deleted' });
  }

  // Remove bookmark
  assertRequired(body.user_id, 'user_id');
  assertRequired(body.list_id, 'list_id');

  const { error } = await supabase
    .from('user_bookmarks')
    .delete()
    .eq('user_id', body.user_id)
    .eq('list_id', body.list_id);

  if (error) throw fromSupabaseError(error);
  return successResponse({ message: 'Bookmark removed' });
}), 'bookmarks');

/**
 * PATCH /api/bookmarks - Update bookmark (move to folder) or folder
 */
export const PATCH = withTiming(withErrorHandler<any>(async (request: NextRequest) => {
  const supabase = await createClient();
  const body = await request.json();

  assertRequired(body.type, 'type');

  if (body.type === 'folder') {
    assertRequired(body.folder_id, 'folder_id');

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.order !== undefined) updates.order = body.order;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('bookmark_folders')
      .update(updates)
      .eq('id', body.folder_id)
      .select()
      .single();

    if (error) throw fromSupabaseError(error);
    return successResponse(data);
  }

  // Move bookmark to different folder
  assertRequired(body.bookmark_id, 'bookmark_id');

  const { data, error } = await supabase
    .from('user_bookmarks')
    .update({ folder_id: body.folder_id || null })
    .eq('id', body.bookmark_id)
    .select()
    .single();

  if (error) throw fromSupabaseError(error);
  return successResponse(data);
}), 'bookmarks');
