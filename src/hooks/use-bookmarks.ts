'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { bookmarkKeys } from '@/lib/query-keys/bookmarks';
import { CACHE_TTL_MS } from '@/lib/cache/unified-cache';
import { TopList } from '@/types/top-lists';

// Types
export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_smart: boolean;
  smart_rule: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  list_id: string;
  folder_id: string | null;
  notes: string | null;
  created_at: string;
  list: Pick<TopList, 'id' | 'title' | 'category' | 'subcategory' | 'size' | 'created_at' | 'description'> | null;
}

export interface BookmarksData {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
}

async function fetchBookmarks(userId: string): Promise<BookmarksData> {
  const res = await fetch(`/api/bookmarks?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  const json = await res.json();
  return json.data || json;
}

/**
 * Hook to manage bookmarks and folders for a user.
 */
export function useBookmarks(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: bookmarkKeys.user(userId),
    queryFn: () => fetchBookmarks(userId),
    enabled: !!userId,
    staleTime: CACHE_TTL_MS.SHORT,
  });

  const bookmarks = data?.bookmarks ?? [];
  const folders = data?.folders ?? [];

  // Set of bookmarked list IDs for quick lookup
  const bookmarkedListIds = useMemo(
    () => new Set(bookmarks.map(b => b.list_id)),
    [bookmarks]
  );

  const isBookmarked = useCallback(
    (listId: string) => bookmarkedListIds.has(listId),
    [bookmarkedListIds]
  );

  // Add bookmark mutation
  const addBookmark = useMutation({
    mutationFn: async ({ listId, folderId }: { listId: string; folderId?: string }) => {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bookmark',
          user_id: userId,
          list_id: listId,
          folder_id: folderId,
        }),
      });
      if (!res.ok) throw new Error('Failed to add bookmark');
      return res.json();
    },
    onMutate: async ({ listId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.user(userId) });
      const previous = queryClient.getQueryData<BookmarksData>(bookmarkKeys.user(userId));

      // Optimistic update
      queryClient.setQueryData<BookmarksData>(bookmarkKeys.user(userId), old => {
        if (!old) return old!;
        return {
          ...old,
          bookmarks: [
            {
              id: `temp-${listId}`,
              user_id: userId,
              list_id: listId,
              folder_id: folderId || null,
              notes: null,
              created_at: new Date().toISOString(),
              list: null,
            },
            ...old.bookmarks,
          ],
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bookmarkKeys.user(userId), context.previous);
      }
      toast({ title: 'Error', description: 'Failed to save bookmark' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(userId) });
    },
    onSuccess: () => {
      toast({ title: 'Saved', description: 'List bookmarked!' });
    },
  });

  // Remove bookmark mutation
  const removeBookmark = useMutation({
    mutationFn: async (listId: string) => {
      const res = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bookmark',
          user_id: userId,
          list_id: listId,
        }),
      });
      if (!res.ok) throw new Error('Failed to remove bookmark');
      return res.json();
    },
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.user(userId) });
      const previous = queryClient.getQueryData<BookmarksData>(bookmarkKeys.user(userId));

      queryClient.setQueryData<BookmarksData>(bookmarkKeys.user(userId), old => {
        if (!old) return old!;
        return {
          ...old,
          bookmarks: old.bookmarks.filter(b => b.list_id !== listId),
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bookmarkKeys.user(userId), context.previous);
      }
      toast({ title: 'Error', description: 'Failed to remove bookmark' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(userId) });
    },
  });

  // Toggle bookmark
  const toggleBookmark = useCallback(
    (listId: string) => {
      if (isBookmarked(listId)) {
        removeBookmark.mutate(listId);
      } else {
        addBookmark.mutate({ listId });
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  // Create folder mutation
  const createFolder = useMutation({
    mutationFn: async ({ name, icon, color }: { name: string; icon?: string; color?: string }) => {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'folder',
          user_id: userId,
          name,
          icon,
          color,
        }),
      });
      if (!res.ok) throw new Error('Failed to create folder');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(userId) });
    },
    onSuccess: () => {
      toast({ title: 'Folder Created', description: 'New folder ready!' });
    },
  });

  // Delete folder mutation
  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'folder', folder_id: folderId }),
      });
      if (!res.ok) throw new Error('Failed to delete folder');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(userId) });
    },
  });

  // Move bookmark to folder
  const moveToFolder = useMutation({
    mutationFn: async ({ bookmarkId, folderId }: { bookmarkId: string; folderId: string | null }) => {
      const res = await fetch('/api/bookmarks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bookmark',
          bookmark_id: bookmarkId,
          folder_id: folderId,
        }),
      });
      if (!res.ok) throw new Error('Failed to move bookmark');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.user(userId) });
    },
  });

  // Group bookmarks by folder
  const bookmarksByFolder = useMemo(() => {
    const grouped: Record<string, Bookmark[]> = { uncategorized: [] };
    for (const folder of folders) {
      grouped[folder.id] = [];
    }
    for (const bookmark of bookmarks) {
      const key = bookmark.folder_id || 'uncategorized';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(bookmark);
    }
    return grouped;
  }, [bookmarks, folders]);

  return {
    bookmarks,
    folders,
    bookmarksByFolder,
    isLoading,
    error,
    isBookmarked,
    toggleBookmark,
    addBookmark: addBookmark.mutate,
    removeBookmark: removeBookmark.mutate,
    createFolder: createFolder.mutate,
    deleteFolder: deleteFolder.mutate,
    moveToFolder: moveToFolder.mutate,
    isToggling: addBookmark.isPending || removeBookmark.isPending,
  };
}
