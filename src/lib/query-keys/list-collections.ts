/**
 * List Collection Query Keys
 * Centralized query key factory for list collections/folders caching
 */

import type { CollectionQueryParams } from '@/types/collection';

export const listCollectionKeys = {
  // Root key for all list collection queries
  all: ['list-collections'] as const,

  // List of collections for a user
  lists: () => [...listCollectionKeys.all, 'list'] as const,
  userCollections: (userId: string) =>
    [...listCollectionKeys.lists(), 'user', userId] as const,
  filteredCollections: (params: CollectionQueryParams) =>
    [...listCollectionKeys.lists(), 'filtered', params] as const,

  // Single collection detail
  details: () => [...listCollectionKeys.all, 'detail'] as const,
  detail: (collectionId: string) =>
    [...listCollectionKeys.details(), collectionId] as const,
  detailWithStats: (collectionId: string) =>
    [...listCollectionKeys.details(), collectionId, 'with-stats'] as const,

  // Collection by share slug (for public viewing)
  shared: () => [...listCollectionKeys.all, 'shared'] as const,
  sharedBySlug: (slug: string) =>
    [...listCollectionKeys.shared(), 'slug', slug] as const,

  // Collection tree (hierarchical structure)
  tree: () => [...listCollectionKeys.all, 'tree'] as const,
  userTree: (userId: string) =>
    [...listCollectionKeys.tree(), 'user', userId] as const,

  // Collection children
  children: () => [...listCollectionKeys.all, 'children'] as const,
  collectionChildren: (parentId: string) =>
    [...listCollectionKeys.children(), parentId] as const,

  // Collection statistics
  stats: () => [...listCollectionKeys.all, 'stats'] as const,
  collectionStats: (collectionId: string) =>
    [...listCollectionKeys.stats(), collectionId] as const,
  userStats: (userId: string) =>
    [...listCollectionKeys.stats(), 'user', userId] as const,

  // Search within collections
  search: () => [...listCollectionKeys.all, 'search'] as const,
  searchCollections: (userId: string, searchTerm: string) =>
    [...listCollectionKeys.search(), userId, searchTerm] as const,

  // Mutations - used for cache invalidation tracking
  mutations: {
    create: () =>
      [...listCollectionKeys.all, 'mutations', 'create'] as const,
    update: (collectionId: string) =>
      [...listCollectionKeys.all, 'mutations', 'update', collectionId] as const,
    delete: (collectionId: string) =>
      [...listCollectionKeys.all, 'mutations', 'delete', collectionId] as const,
    reorder: () =>
      [...listCollectionKeys.all, 'mutations', 'reorder'] as const,
    addLists: (collectionId: string) =>
      [...listCollectionKeys.all, 'mutations', 'add-lists', collectionId] as const,
    removeLists: (collectionId: string) =>
      [...listCollectionKeys.all, 'mutations', 'remove-lists', collectionId] as const,
    share: (collectionId: string) =>
      [...listCollectionKeys.all, 'mutations', 'share', collectionId] as const,
  },
};

// Type for cache invalidation keys - more permissive to avoid tuple type issues
type InvalidationKey = readonly unknown[];

/**
 * Helper to get all keys that should be invalidated when a collection changes
 */
export function getCollectionInvalidationKeys(
  userId: string,
  collectionId?: string,
  parentId?: string | null
): InvalidationKey[] {
  const keys: InvalidationKey[] = [
    listCollectionKeys.userCollections(userId),
    listCollectionKeys.userTree(userId),
    listCollectionKeys.userStats(userId),
  ];

  if (collectionId) {
    keys.push(
      listCollectionKeys.detail(collectionId),
      listCollectionKeys.detailWithStats(collectionId),
      listCollectionKeys.collectionStats(collectionId)
    );
  }

  if (parentId) {
    keys.push(listCollectionKeys.collectionChildren(parentId));
  }

  return keys;
}
