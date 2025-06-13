import { apiClient } from './client';

export interface ItemGroup {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  image_url?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

// Enhanced ItemGroup that includes items
export interface ItemGroupWithItems extends ItemGroup {
  items: GroupItem[];
}

export interface GroupItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  created_at: string;
}

export interface ItemGroupSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ItemGroupCreate {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  image_url?: string;
}

export interface GroupItemsResponse {
  group_id: string;
  items: GroupItem[];
  count: number;
}

export interface GroupSuggestion {
  query: string;
  suggestions: string[];
}

const ITEM_GROUPS_ENDPOINT = '/top/groups';

// Helper function to clean parameters
const cleanParams = (params: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
};

export const itemGroupsApi = {
  // Get item groups with filtering
  getItemGroups: async (params?: ItemGroupSearchParams): Promise<ItemGroup[]> => {
    const cleanedParams = params ? cleanParams(params) : {};
    return apiClient.get<ItemGroup[]>(ITEM_GROUPS_ENDPOINT, cleanedParams);
  },

  getGroupsByCategory: async (
    category: string,
    subcategory?: string,
    search?: string,
    limit: number = 100, 
    minItemCount: number = 1
  ): Promise<ItemGroup[]> => {
    const params = cleanParams({
      subcategory,
      search,
      limit,
      min_item_count: minItemCount, 
    });
    
    console.log(`🔍 API: Fetching groups for category=${category}, subcategory=${subcategory}, minItemCount=${minItemCount}`);
    
    try {
      const groups = await apiClient.get<ItemGroup[]>(`${ITEM_GROUPS_ENDPOINT}/categories/${category}`, params);
      
      console.log(`✅ API: Received ${groups.length} groups for category=${category}`);
      
      // Backend now handles all filtering, so we can trust the results
      return groups;
      
    } catch (error) {
      console.error(`❌ API: Failed to fetch groups for category ${category}:`, error);
      throw error;
    }
  },

  // Get single group by ID - NOW INCLUDES ITEMS BY DEFAULT!
  getGroup: async (groupId: string, includeItems: boolean = true): Promise<ItemGroupWithItems> => {
    const params = cleanParams({
      include_items: includeItems,
    });
    
    return apiClient.get<ItemGroupWithItems>(`${ITEM_GROUPS_ENDPOINT}/${groupId}`, params);
  },

  // Create new group
  createGroup: async (data: ItemGroupCreate): Promise<ItemGroup> => {
    return apiClient.post<ItemGroup>(ITEM_GROUPS_ENDPOINT, data);
  },

  // Get items in a specific group - legacy endpoint
  getGroupItems: async (
    groupId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<GroupItemsResponse> => {
    const params = cleanParams({
      limit,
      offset,
    });
    
    return apiClient.get<GroupItemsResponse>(`${ITEM_GROUPS_ENDPOINT}/${groupId}/items`, params);
  },

  // Get group name suggestions for autocomplete
  getGroupSuggestions: async (
    query: string,
    category?: string,
    subcategory?: string,
    limit: number = 10
  ): Promise<GroupSuggestion> => {
    const params = cleanParams({
      query,
      category,
      subcategory,
      limit,
    });
    
    return apiClient.get<GroupSuggestion>(`${ITEM_GROUPS_ENDPOINT}/search/suggestions`, params);
  },
};