/**
 * useCacheInvalidation Hook
 *
 * React hook for tag-based cache invalidation using the unified caching system.
 * Provides convenient methods for invalidating related data across the application.
 */

'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateByEvent,
  invalidateByTags,
  invalidateByPrefix,
} from './query-cache-config';
import { type InvalidationEvent, CACHE_TAGS, getInvalidationTags } from './unified-cache';

export interface UseCacheInvalidationReturn {
  /**
   * Invalidate by predefined event type
   */
  invalidateByEvent: (event: InvalidationEvent, context?: Record<string, unknown>) => void;

  /**
   * Invalidate by specific tags
   */
  invalidateByTags: (tags: string[]) => void;

  /**
   * Invalidate by query key prefix
   */
  invalidateByPrefix: (prefix: string) => void;

  /**
   * Convenience methods for common scenarios
   */
  onListCreated: (listId?: string) => void;
  onListUpdated: (listId: string) => void;
  onListDeleted: (listId: string) => void;
  onItemRanked: (listId: string) => void;
  onUserUpdated: (userId?: string) => void;
  onGroupsUpdated: () => void;
  forceRefresh: () => void;

  /**
   * Invalidate a specific list's data
   */
  invalidateList: (listId: string) => void;

  /**
   * Invalidate all user data
   */
  invalidateUserData: () => void;
}

/**
 * Hook for cache invalidation with tag-based coordination.
 */
export function useCacheInvalidation(): UseCacheInvalidationReturn {
  const queryClient = useQueryClient();

  const handleInvalidateByEvent = useCallback(
    (event: InvalidationEvent, context?: Record<string, unknown>) => {
      invalidateByEvent(queryClient, event, context);
    },
    [queryClient]
  );

  const handleInvalidateByTags = useCallback(
    (tags: string[]) => {
      invalidateByTags(queryClient, tags);
    },
    [queryClient]
  );

  const handleInvalidateByPrefix = useCallback(
    (prefix: string) => {
      invalidateByPrefix(queryClient, prefix);
    },
    [queryClient]
  );

  // Convenience methods
  const onListCreated = useCallback(
    (listId?: string) => {
      handleInvalidateByEvent('list.updated', { listId, action: 'created' });
    },
    [handleInvalidateByEvent]
  );

  const onListUpdated = useCallback(
    (listId: string) => {
      handleInvalidateByEvent('list.updated', { listId, action: 'updated' });
      // Also invalidate specific list queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key.some((part) =>
            typeof part === 'string' && part.includes(listId)
          );
        },
      });
    },
    [handleInvalidateByEvent, queryClient]
  );

  const onListDeleted = useCallback(
    (listId: string) => {
      handleInvalidateByEvent('list.deleted', { listId });
      // Remove specific list from cache entirely
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return key.some((part) =>
            typeof part === 'string' && part.includes(listId)
          );
        },
      });
    },
    [handleInvalidateByEvent, queryClient]
  );

  const onItemRanked = useCallback(
    (listId: string) => {
      handleInvalidateByEvent('item.ranked', { listId });
    },
    [handleInvalidateByEvent]
  );

  const onUserUpdated = useCallback(
    (userId?: string) => {
      handleInvalidateByEvent('user.updated', { userId });
    },
    [handleInvalidateByEvent]
  );

  const onGroupsUpdated = useCallback(() => {
    handleInvalidateByEvent('groups.updated');
  }, [handleInvalidateByEvent]);

  const forceRefresh = useCallback(() => {
    handleInvalidateByEvent('app.refresh');
  }, [handleInvalidateByEvent]);

  const invalidateList = useCallback(
    (listId: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            key.includes(CACHE_TAGS.LISTS) ||
            key.includes(CACHE_TAGS.LIST_DETAIL) ||
            key.some((part) => typeof part === 'string' && part.includes(listId))
          );
        },
      });
    },
    [queryClient]
  );

  const invalidateUserData = useCallback(() => {
    handleInvalidateByTags([CACHE_TAGS.USER_DATA, CACHE_TAGS.USER_LISTS, CACHE_TAGS.PREFERENCES]);
  }, [handleInvalidateByTags]);

  return {
    invalidateByEvent: handleInvalidateByEvent,
    invalidateByTags: handleInvalidateByTags,
    invalidateByPrefix: handleInvalidateByPrefix,
    onListCreated,
    onListUpdated,
    onListDeleted,
    onItemRanked,
    onUserUpdated,
    onGroupsUpdated,
    forceRefresh,
    invalidateList,
    invalidateUserData,
  };
}

/**
 * Standalone function for invalidating outside of React components.
 * Useful for use in API callbacks or global event handlers.
 */
export function createCacheInvalidator(queryClient: ReturnType<typeof useQueryClient>) {
  return {
    invalidateByEvent: (event: InvalidationEvent, context?: Record<string, unknown>) =>
      invalidateByEvent(queryClient, event, context),
    invalidateByTags: (tags: string[]) => invalidateByTags(queryClient, tags),
    invalidateByPrefix: (prefix: string) => invalidateByPrefix(queryClient, prefix),
    getInvalidationTags,
  };
}
