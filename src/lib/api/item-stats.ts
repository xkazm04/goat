import { apiClient } from './client';

export interface ItemStat {
  item_id: string;
  name: string;
  selection_count: number;
  view_count: number;
  average_ranking: number; // Position in ranking (1-based)
  percentile: number; // Percentile score (0-100)
}

export interface ItemStatsResponse {
  stats: ItemStat[];
  total_items: number;
}

export interface ItemStatsParams {
  item_ids?: string[]; // Specific items to fetch stats for
  category?: string; // Filter by category
}

const STATS_ENDPOINT = '/items';

export const itemStatsApi = {
  /**
   * Get statistics for items including average ranking
   */
  getItemStats: async (params?: ItemStatsParams): Promise<ItemStatsResponse> => {
    const queryParams: Record<string, string> = {};

    if (params?.item_ids && params.item_ids.length > 0) {
      queryParams.item_ids = params.item_ids.join(',');
    }

    if (params?.category) {
      queryParams.category = params.category;
    }

    return apiClient.get<ItemStatsResponse>(`${STATS_ENDPOINT}/stats`, queryParams);
  },

  /**
   * Get stats for a single item
   */
  getItemStat: async (itemId: string): Promise<ItemStat | null> => {
    const response = await itemStatsApi.getItemStats({ item_ids: [itemId] });
    return response.stats.find(stat => stat.item_id === itemId) || null;
  },
};
