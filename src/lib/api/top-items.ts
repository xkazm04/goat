import { apiClient } from './client';

export interface TopItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  group?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TopItemCreate {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  group?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  tags?: string[];
}

export interface ItemSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  tags?: string[];
  year_from?: number;
  year_to?: number;
  sort_by?: 'name' | 'popularity' | 'recent' | 'ranking';
  limit?: number;
  offset?: number;
}

export interface ItemsResponse {
  items: TopItem[];
  total: number;
  has_more: boolean;
  next_offset?: number;
}

export interface ItemGroup {
  group_name: string;
  items: TopItem[];
  total_count: number;
}

export interface GroupedItemsResponse {
  groups: ItemGroup[];
  total_items: number;
  total_groups: number;
}

const ITEMS_ENDPOINT = '/top';

export const topItemsApi = {
  // Create a new item
  createItem: async (item: TopItemCreate): Promise<TopItem> => {
    return apiClient.post<TopItem>(ITEMS_ENDPOINT, item);
  },

  // Get items with search/filter
  searchItems: async (params?: ItemSearchParams): Promise<TopItem[]> => {
    return apiClient.get<TopItem[]>(`${ITEMS_ENDPOINT}/items`, params);
  },

  // Get items grouped by their group field
  getItemsGrouped: async (params?: ItemSearchParams): Promise<GroupedItemsResponse> => {
    const items = await apiClient.get<TopItem[]>(`${ITEMS_ENDPOINT}/items`, {
      ...params,
      limit: params?.limit || 1000,
    });

    const grouped = items.reduce((acc, item) => {
      const groupName = item.group || 'Ungrouped';
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(item);
      return acc;
    }, {} as Record<string, TopItem[]>);

    const groups: ItemGroup[] = Object.entries(grouped).map(([groupName, items]) => ({
      group_name: groupName,
      items,
      total_count: items.length,
    }));

    return {
      groups,
      total_items: items.length,
      total_groups: groups.length,
    };
  },

  // Get paginated items for infinite scroll
  getItemsPaginated: async (params?: ItemSearchParams): Promise<{
    items: TopItem[];
    total: number;
    has_more: boolean;
    next_offset?: number;
  }> => {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    
    const items = await apiClient.get<TopItem[]>(`${ITEMS_ENDPOINT}/items`, params);
    
    const total = items.length;
    const paginatedItems = items.slice(offset, offset + limit);
    const has_more = offset + limit < total;
    const next_offset = has_more ? offset + limit : undefined;

    return {
      items: paginatedItems,
      total,
      has_more,
      next_offset,
    };
  },

  // Get trending items
  getTrendingItems: async (category?: string, limit: number = 20): Promise<TopItem[]> => {
    return apiClient.get<TopItem[]>(`${ITEMS_ENDPOINT}/items/trending`, {
      category,
      limit,
    });
  },

  // Get single item by ID
  getItem: async (itemId: string): Promise<TopItem> => {
    return apiClient.get<TopItem>(`${ITEMS_ENDPOINT}/items/${itemId}`);
  },
};