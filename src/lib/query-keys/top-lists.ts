import { SearchListsParams } from '@/types/top-lists';

export interface FeaturedListsParams {
  popular_limit?: number;
  trending_limit?: number;
  latest_limit?: number;
  awards_limit?: number;
}

export const topListsKeys = {
  all: ['top-lists'] as const,
  lists: () => [...topListsKeys.all, 'list'] as const,
  list: (id: string, includeItems?: boolean) =>
    [...topListsKeys.lists(), id, { includeItems }] as const,
  listSearch: (params: SearchListsParams) =>
    [...topListsKeys.lists(), 'search', params] as const,
  userLists: (userId: string, params?: Omit<SearchListsParams, 'user_id'>) =>
    [...topListsKeys.lists(), 'user', userId, params] as const,
  predefinedLists: (category?: string, subcategory?: string) =>
    [...topListsKeys.lists(), 'predefined', { category, subcategory }] as const,
  featured: (params?: FeaturedListsParams) =>
    [...topListsKeys.lists(), 'featured', params] as const,
  analytics: (id: string) =>
    [...topListsKeys.all, 'analytics', id] as const,
  versions: (id: string, version1: number, version2: number) =>
    [...topListsKeys.all, 'versions', id, { version1, version2 }] as const,

  creation: () => [...topListsKeys.all, 'creation'] as const,
  creationWithUser: (data: any) =>
    [...topListsKeys.creation(), 'with-user', data] as const,
};