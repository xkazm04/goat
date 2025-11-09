/**
 * Collection API Service Layer
 * Unified API for collection groups and items with pagination support
 */

import { apiClient } from './client';
import { CollectionItem, CollectionGroup } from '@/app/features/Collection/types';

export interface CollectionApiParams {
  category?: string;
  subcategory?: string;
  searchTerm?: string;
  groupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface CollectionItemCreate {
  title: string;
  image_url?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CollectionItemUpdate extends Partial<CollectionItemCreate> {
  id: string;
}

export interface CollectionStatsResponse {
  totalItems: number;
  totalGroups: number;
  itemsByCategory: Record<string, number>;
  itemsByGroup: Record<string, number>;
}

const COLLECTION_ENDPOINT = '/top';

export const collectionApi = {
  /**
   * Fetch collection groups with optional filtering
   */
  getGroups: async (params?: Pick<CollectionApiParams, 'category' | 'subcategory'>): Promise<CollectionGroup[]> => {
    const response = await apiClient.get<any[]>(`${COLLECTION_ENDPOINT}/groups`, params);

    console.log('🔍 API response sample (first 3 groups):', response.slice(0, 3));

    // Transform API response to CollectionGroup format
    return response.map(group => ({
      id: group.id || group.group_name,
      name: group.group_name || group.name,
      items: group.items || [],
      category: group.category || params?.category,
      subcategory: group.subcategory || params?.subcategory,
      item_count: group.item_count || group.total_count || group.items?.length || 0, // Map to item_count for consistency
      count: group.item_count || group.total_count || group.items?.length || 0 // Keep count for backward compatibility
    }));
  },

  /**
   * Fetch items with pagination support
   */
  getItemsPaginated: async (params?: CollectionApiParams): Promise<PaginatedResponse<CollectionItem>> => {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 50;
    const offset = params?.offset || (page - 1) * pageSize;
    const limit = params?.limit || pageSize;

    // Build query parameters
    const queryParams = {
      category: params?.category,
      subcategory: params?.subcategory,
      search: params?.searchTerm,
      sort_by: params?.sortBy,
      offset,
      limit
    };

    const response = await apiClient.get<{
      items: any[];
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    }>(`${COLLECTION_ENDPOINT}/items`, queryParams);

    // Transform to CollectionItem format
    const items: CollectionItem[] = response.items.map(item => ({
      id: item.id,
      title: item.name || item.title,
      image_url: item.image_url,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      tags: item.tags || [],
      ranking: item.selection_count || item.ranking || undefined, // Map selection_count to ranking
      metadata: {
        group: item.group,
        group_id: item.group_id,
        item_year: item.item_year,
        item_year_to: item.item_year_to,
        created_at: item.created_at,
        updated_at: item.updated_at,
        selection_count: item.selection_count,
        view_count: item.view_count
      }
    }));

    const totalPages = Math.ceil(response.total / pageSize);

    return {
      data: items,
      total: response.total,
      page,
      pageSize,
      totalPages,
      hasMore: response.has_more,
      nextOffset: response.has_more ? offset + limit : undefined
    };
  },

  /**
   * Search items across groups
   */
  searchItems: async (searchTerm: string, params?: Omit<CollectionApiParams, 'searchTerm'>): Promise<CollectionItem[]> => {
    const response = await apiClient.get<{
      items: any[];
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    }>(`${COLLECTION_ENDPOINT}/items`, {
      search: searchTerm,
      category: params?.category,
      subcategory: params?.subcategory,
      limit: params?.limit || 100
    });

    return response.items.map(item => ({
      id: item.id,
      title: item.name || item.title,
      image_url: item.image_url,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      tags: item.tags || [],
      ranking: item.selection_count || item.ranking || undefined,
      metadata: {
        group: item.group,
        group_id: item.group_id,
        item_year: item.item_year,
        selection_count: item.selection_count,
        view_count: item.view_count
      }
    }));
  },

  /**
   * Create a new collection item
   */
  createItem: async (item: CollectionItemCreate): Promise<CollectionItem> => {
    const response = await apiClient.post<any>(`${COLLECTION_ENDPOINT}/items`, {
      name: item.title,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      image_url: item.image_url,
      tags: item.tags,
      ...item.metadata
    });

    return {
      id: response.id,
      title: response.name,
      image_url: response.image_url,
      description: response.description,
      category: response.category,
      subcategory: response.subcategory,
      tags: response.tags || [],
      metadata: {
        group: response.group,
        created_at: response.created_at
      }
    };
  },

  /**
   * Update an existing collection item
   */
  updateItem: async (item: CollectionItemUpdate): Promise<CollectionItem> => {
    const response = await apiClient.put<any>(`${COLLECTION_ENDPOINT}/items/${item.id}`, {
      name: item.title,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      image_url: item.image_url,
      tags: item.tags
    });

    return {
      id: response.id,
      title: response.name,
      image_url: response.image_url,
      description: response.description,
      category: response.category,
      subcategory: response.subcategory,
      tags: response.tags || [],
      metadata: {
        updated_at: response.updated_at
      }
    };
  },

  /**
   * Delete a collection item
   */
  deleteItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`${COLLECTION_ENDPOINT}/items/${itemId}`);
  },

  /**
   * Get collection statistics
   */
  getStats: async (params?: Pick<CollectionApiParams, 'category' | 'subcategory' | 'groupIds'>): Promise<CollectionStatsResponse> => {
    // This could be a dedicated stats endpoint or calculated client-side
    const groups = await collectionApi.getGroups(params);

    const stats: CollectionStatsResponse = {
      totalItems: 0,
      totalGroups: groups.length,
      itemsByCategory: {},
      itemsByGroup: {}
    };

    groups.forEach(group => {
      const itemCount = group.items?.length || 0;
      stats.totalItems += itemCount;
      stats.itemsByGroup[group.id] = itemCount;

      if (group.category) {
        stats.itemsByCategory[group.category] =
          (stats.itemsByCategory[group.category] || 0) + itemCount;
      }
    });

    return stats;
  },

  /**
   * Get a single item by ID
   */
  getItem: async (itemId: string): Promise<CollectionItem> => {
    const response = await apiClient.get<any>(`${COLLECTION_ENDPOINT}/items/${itemId}`);

    return {
      id: response.id,
      title: response.name || response.title,
      image_url: response.image_url,
      description: response.description,
      category: response.category,
      subcategory: response.subcategory,
      tags: response.tags || [],
      ranking: response.selection_count || response.ranking || undefined,
      metadata: {
        group: response.group,
        group_id: response.group_id,
        item_year: response.item_year,
        created_at: response.created_at,
        updated_at: response.updated_at,
        selection_count: response.selection_count,
        view_count: response.view_count
      }
    };
  }
};
