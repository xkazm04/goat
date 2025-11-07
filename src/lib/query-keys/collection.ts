/**
 * Collection Query Keys
 * Centralized query key factory for collection data caching
 */

export interface CollectionQueryParams {
  category?: string;
  subcategory?: string;
  searchTerm?: string;
  selectedGroupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export const collectionKeys = {
  // Root key
  all: ['collection'] as const,

  // Groups queries
  groups: () => [...collectionKeys.all, 'groups'] as const,
  groupsList: (params: Pick<CollectionQueryParams, 'category' | 'subcategory'>) =>
    [...collectionKeys.groups(), 'list', params] as const,
  groupDetail: (groupId: string) =>
    [...collectionKeys.groups(), 'detail', groupId] as const,

  // Items queries
  items: () => [...collectionKeys.all, 'items'] as const,
  itemsList: (params: CollectionQueryParams) =>
    [...collectionKeys.items(), 'list', params] as const,
  itemsSearch: (params: Pick<CollectionQueryParams, 'searchTerm' | 'category' | 'subcategory'>) =>
    [...collectionKeys.items(), 'search', params] as const,
  itemsPaginated: (params: CollectionQueryParams) =>
    [...collectionKeys.items(), 'paginated', params] as const,
  itemsInfinite: (params: CollectionQueryParams) =>
    [...collectionKeys.items(), 'infinite', params] as const,
  itemDetail: (itemId: string) =>
    [...collectionKeys.items(), 'detail', itemId] as const,

  // Stats queries
  stats: () => [...collectionKeys.all, 'stats'] as const,
  statsForGroups: (groupIds: string[]) =>
    [...collectionKeys.stats(), 'groups', groupIds] as const,
  statsForFilter: (params: CollectionQueryParams) =>
    [...collectionKeys.stats(), 'filter', params] as const,

  // Mutations - used for cache invalidation
  mutations: {
    createItem: () => [...collectionKeys.all, 'mutations', 'create-item'] as const,
    updateItem: (itemId: string) => [...collectionKeys.all, 'mutations', 'update-item', itemId] as const,
    deleteItem: (itemId: string) => [...collectionKeys.all, 'mutations', 'delete-item', itemId] as const,
  }
};
