import { apiClient } from './client';
import {
  TopList,
  ListWithItems,
  ListAnalytics,
  CreateListRequest,
  UpdateListRequest,
  CloneListRequest,
  SearchListsParams,
  VersionComparison,
  ListCreationResponse, // Import the new type
} from '@/types/top-lists';

const LISTS_ENDPOINT = '/lists';

export const topListsApi = {
  // Get lists with search/filter
  getLists: async (params?: SearchListsParams): Promise<TopList[]> => {
    return apiClient.get<TopList[]>(LISTS_ENDPOINT, params);
  },

  // Get single list by ID
  getList: async (listId: string, includeItems: boolean = true): Promise<ListWithItems> => {
    return apiClient.get<ListWithItems>(`${LISTS_ENDPOINT}/${listId}`, {
      include_items: includeItems,
    });
  },

  // Create new list (legacy endpoint)
  createList: async (data: CreateListRequest): Promise<TopList> => {
    return apiClient.post<TopList>(LISTS_ENDPOINT, data);
  },

  // NEW: Create list with automatic user handling
  createListWithUser: async (data: CreateListRequest): Promise<ListCreationResponse> => {
    return apiClient.post<ListCreationResponse>(`${LISTS_ENDPOINT}/create-with-user`, data);
  },

  // Update existing list
  updateList: async (listId: string, data: UpdateListRequest): Promise<TopList> => {
    return apiClient.put<TopList>(`${LISTS_ENDPOINT}/${listId}`, data);
  },

  // Delete list
  deleteList: async (listId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`${LISTS_ENDPOINT}/${listId}`);
  },

  // Clone list
  cloneList: async (
    listId: string, 
    userId: string, 
    modifications: CloneListRequest
  ): Promise<{ message: string; new_list_id: string }> => {
    return apiClient.post<{ message: string; new_list_id: string }>(
      `${LISTS_ENDPOINT}/${listId}/clone?user_id=${userId}`,
      modifications
    );
  },

  // Get list analytics
  getListAnalytics: async (listId: string): Promise<ListAnalytics> => {
    return apiClient.get<ListAnalytics>(`${LISTS_ENDPOINT}/${listId}/analytics`);
  },

  // Compare list versions
  compareVersions: async (
    listId: string, 
    version1: number, 
    version2: number
  ): Promise<VersionComparison> => {
    return apiClient.get<VersionComparison>(
      `${LISTS_ENDPOINT}/${listId}/versions/compare`,
      { version1, version2 }
    );
  },

  // Get user's lists
  getUserLists: async (userId: string, params?: Omit<SearchListsParams, 'user_id'>): Promise<TopList[]> => {
    return apiClient.get<TopList[]>(LISTS_ENDPOINT, {
      user_id: userId,
      ...params,
    });
  },

  // Get predefined lists
  getPredefinedLists: async (category?: string, subcategory?: string): Promise<TopList[]> => {
    return apiClient.get<TopList[]>(LISTS_ENDPOINT, {
      predefined: true,
      category,
      subcategory,
    });
  },
};