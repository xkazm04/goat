/**
 * GoatAPI - Unified API Facade
 *
 * A single, unified API client for all GOAT application endpoints.
 * Consolidates multiple specialized clients into one consistent interface
 * with request batching, deduplication, retry logic, and full TypeScript coverage.
 *
 * @example
 * ```ts
 * import { goatApi } from '@/lib/api';
 *
 * // Lists
 * const lists = await goatApi.lists.search({ category: 'movies' });
 * const list = await goatApi.lists.get('list-id');
 *
 * // Groups
 * const groups = await goatApi.groups.getByCategory('movies');
 * const group = await goatApi.groups.get('group-id');
 *
 * // Items
 * const items = await goatApi.items.search({ category: 'movies' });
 *
 * // Request batching
 * const [list, group] = await goatApi.batch([
 *   goatApi.lists.get('list-id'),
 *   goatApi.groups.get('group-id'),
 * ]);
 * ```
 */

import { apiClient } from './client';
import { createCacheKey, getGlobalAPICache } from '@/lib/cache';
import {
  GoatError,
  NetworkError,
  isGoatError,
  trackError,
} from '@/lib/errors';

// =============================================================================
// Types - Lists
// =============================================================================

import type {
  TopList,
  ListWithItems,
  ListAnalytics,
  CreateListRequest,
  UpdateListRequest,
  CloneListRequest,
  SearchListsParams,
  VersionComparison,
  ListCreationResponse,
  FeaturedListsResponse,
} from '@/types/top-lists';

// =============================================================================
// Types - Groups & Items
// =============================================================================

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

export interface GroupSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  offset?: number;
  minItemCount?: number;
}

export interface GroupCreateRequest {
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

// =============================================================================
// Types - Items
// =============================================================================

export interface Item {
  id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  group?: string;
  group_id?: string;
  selection_count?: number;
  view_count?: number;
  created_at: string;
  updated_at?: string;
  tags?: string[];
}

export interface ItemSearchParams {
  category?: string;
  subcategory?: string;
  search?: string;
  groupIds?: string[];
  sortBy?: 'name' | 'date' | 'popularity' | 'ranking';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ItemCreateRequest {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  group_id?: string;
  tags?: string[];
}

export interface ItemUpdateRequest extends Partial<ItemCreateRequest> {
  id: string;
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

// =============================================================================
// Types - Item Stats
// =============================================================================

export interface ItemStat {
  item_id: string;
  name: string;
  selection_count: number;
  view_count: number;
  average_ranking: number;
  percentile: number;
}

export interface ItemStatsResponse {
  stats: ItemStat[];
  total_items: number;
}

export interface ItemStatsParams {
  item_ids?: string[];
  category?: string;
}

// =============================================================================
// Types - Blueprints
// =============================================================================

import type {
  Blueprint,
  CreateBlueprintRequest,
  UpdateBlueprintRequest,
  SearchBlueprintsParams,
  BlueprintShareResponse,
} from '@/types/blueprint';

// =============================================================================
// Types - Consensus
// =============================================================================

import type {
  ItemConsensus,
  ItemConsensusWithClusters,
  ConsensusAPIResponse,
} from '@/types/consensus';

export interface ConsensusSubmission {
  listId: string;
  userId?: string;
  rankings: Array<{
    itemId: string;
    position: number;
  }>;
}

// =============================================================================
// Types - Research
// =============================================================================

export interface ItemResearchRequest {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  depth?: 'quick' | 'standard' | 'deep';
  handleDuplicates?: 'skip' | 'merge' | 'create';
}

export interface ItemResearchResponse {
  item?: Item;
  isValid: boolean;
  confidence: number;
  duplicates?: Array<{
    id: string;
    name: string;
    similarity: number;
  }>;
  sources?: Array<{
    name: string;
    url: string;
    confidence: number;
  }>;
  researchMethod: 'cache' | 'web' | 'llm';
}

export interface ItemValidationRequest {
  name: string;
  category: string;
  subcategory?: string;
}

// =============================================================================
// Types - Users
// =============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  defaultCategory?: string;
}

// =============================================================================
// Request Infrastructure
// =============================================================================

interface RequestConfig {
  /** @deprecated Cache is now handled by React Query - this option is ignored */
  cache?: 'none' | 'short' | 'standard' | 'long' | 'static' | number;
  /** @deprecated Cache tags - this option is ignored */
  tags?: string[];
  /** Enable request deduplication (default: true for GET) */
  dedupe?: boolean;
  /** Retry configuration */
  retry?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  /** Request timeout in ms */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
}

// Request deduplication map
const pendingRequests = new Map<string, Promise<unknown>>();

// Default retry configuration
const DEFAULT_RETRY = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
};

/**
 * Clean parameters - remove undefined/null/empty values
 */
function cleanParams<T extends object>(params: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Sleep for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute request with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RequestConfig['retry'] = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay } = { ...DEFAULT_RETRY, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retriable
      if (isGoatError(error) && !error.isRetriable()) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Calculate backoff delay with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay
      );

      console.log(`🔄 Retry attempt ${attempt}/${maxAttempts} in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Execute request with caching and deduplication
 */
async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: unknown,
  config: RequestConfig = {}
): Promise<T> {
  const cacheKey = createCacheKey(endpoint, data as Record<string, unknown>);

  // Request deduplication for GET requests (prevents duplicate in-flight requests)
  if (method === 'GET' && config.dedupe !== false) {
    const pending = pendingRequests.get(cacheKey) as Promise<T> | undefined;
    if (pending) {
      console.log('⚡ Deduplicating request:', endpoint);
      return pending;
    }
  }

  // Execute request with retry
  const requestFn = async (): Promise<T> => {
    switch (method) {
      case 'GET':
        return apiClient.get<T>(endpoint, data as Record<string, unknown>);
      case 'POST':
        return apiClient.post<T>(endpoint, data);
      case 'PUT':
        return apiClient.put<T>(endpoint, data);
      case 'PATCH':
        return apiClient.patch<T>(endpoint, data);
      case 'DELETE':
        return apiClient.delete<T>(endpoint);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  };

  const promise = executeWithRetry(requestFn, config.retry);

  // Track pending request for deduplication
  if (method === 'GET' && config.dedupe !== false) {
    pendingRequests.set(cacheKey, promise);
    promise.finally(() => {
      pendingRequests.delete(cacheKey);
    });
  }

  // Note: Response caching is handled by React Query at the hook level.
  // The APICache layer was removed to avoid double-caching conflicts.

  return promise;
}

// =============================================================================
// Lists API
// =============================================================================

const listsApi = {
  /**
   * Search lists with filters
   */
  search: (params?: SearchListsParams, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams(params || {}), {
      cache: 'standard',
      tags: ['lists'],
      ...config,
    });
  },

  /**
   * Get a single list by ID
   */
  get: (listId: string, includeItems = true, config?: RequestConfig): Promise<ListWithItems> => {
    return request<ListWithItems>(`/lists/${listId}`, 'GET', { include_items: includeItems }, {
      cache: 'standard',
      tags: ['lists', `list-${listId}`],
      ...config,
    });
  },

  /**
   * Create a new list
   */
  create: (data: CreateListRequest, config?: RequestConfig): Promise<TopList> => {
    return request<TopList>('/lists', 'POST', data, config);
  },

  /**
   * Create a list with automatic user handling
   */
  createWithUser: (data: CreateListRequest, config?: RequestConfig): Promise<ListCreationResponse> => {
    return request<ListCreationResponse>('/lists/create-with-user', 'POST', data, config);
  },

  /**
   * Update an existing list
   */
  update: (listId: string, data: UpdateListRequest, config?: RequestConfig): Promise<TopList> => {
    return request<TopList>(`/lists/${listId}`, 'PUT', data, config);
  },

  /**
   * Delete a list
   */
  delete: (listId: string, config?: RequestConfig): Promise<{ message: string }> => {
    return request<{ message: string }>(`/lists/${listId}`, 'DELETE', undefined, config);
  },

  /**
   * Clone a list
   */
  clone: (
    listId: string,
    userId: string,
    modifications: CloneListRequest,
    config?: RequestConfig
  ): Promise<{ message: string; new_list_id: string }> => {
    return request<{ message: string; new_list_id: string }>(
      `/lists/${listId}/clone?user_id=${userId}`,
      'POST',
      modifications,
      config
    );
  },

  /**
   * Get list analytics
   */
  getAnalytics: (listId: string, config?: RequestConfig): Promise<ListAnalytics> => {
    return request<ListAnalytics>(`/lists/${listId}/analytics`, 'GET', undefined, {
      cache: 'short',
      tags: ['analytics', `list-${listId}`],
      ...config,
    });
  },

  /**
   * Compare list versions
   */
  compareVersions: (
    listId: string,
    version1: number,
    version2: number,
    config?: RequestConfig
  ): Promise<VersionComparison> => {
    return request<VersionComparison>(
      `/lists/${listId}/versions/compare`,
      'GET',
      { version1, version2 },
      { cache: 'long', tags: [`list-${listId}`], ...config }
    );
  },

  /**
   * Get user's lists
   */
  getByUser: (userId: string, params?: Omit<SearchListsParams, 'user_id'>, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams({ user_id: userId, ...params }), {
      cache: 'short',
      tags: ['lists', `user-${userId}`],
      ...config,
    });
  },

  /**
   * Get predefined lists
   */
  getPredefined: (category?: string, subcategory?: string, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams({ predefined: true, category, subcategory }), {
      cache: 'long',
      tags: ['lists', 'predefined'],
      ...config,
    });
  },

  /**
   * Get featured lists (popular, trending, latest, awards)
   */
  getFeatured: (
    params?: {
      popular_limit?: number;
      trending_limit?: number;
      latest_limit?: number;
      awards_limit?: number;
    },
    config?: RequestConfig
  ): Promise<FeaturedListsResponse> => {
    return request<FeaturedListsResponse>('/lists/featured', 'GET', cleanParams(params || {}), {
      cache: 'standard',
      tags: ['lists', 'featured'],
      ...config,
    });
  },
};

// =============================================================================
// Groups API
// =============================================================================

const groupsApi = {
  /**
   * Search groups with filters
   */
  search: (params?: GroupSearchParams, config?: RequestConfig): Promise<ItemGroup[]> => {
    return request<ItemGroup[]>('/top/groups', 'GET', cleanParams(params || {}), {
      cache: 'long',
      tags: ['groups'],
      ...config,
    });
  },

  /**
   * Get groups by category with optimized backend filtering
   */
  getByCategory: (
    category: string,
    options?: {
      subcategory?: string;
      search?: string;
      limit?: number;
      minItemCount?: number;
    },
    config?: RequestConfig
  ): Promise<ItemGroup[]> => {
    const params = cleanParams({
      subcategory: options?.subcategory,
      search: options?.search,
      limit: options?.limit || 100,
      min_item_count: options?.minItemCount || 1,
    });

    return request<ItemGroup[]>(`/top/groups/categories/${category}`, 'GET', params, {
      cache: 'long',
      tags: ['groups', `category-${category}`],
      ...config,
    });
  },

  /**
   * Get a single group by ID
   */
  get: (groupId: string, includeItems = true, config?: RequestConfig): Promise<ItemGroupWithItems> => {
    return request<ItemGroupWithItems>(`/top/groups/${groupId}`, 'GET', { include_items: includeItems }, {
      cache: 'long',
      tags: ['groups', `group-${groupId}`],
      ...config,
    });
  },

  /**
   * Create a new group
   */
  create: (data: GroupCreateRequest, config?: RequestConfig): Promise<ItemGroup> => {
    return request<ItemGroup>('/top/groups', 'POST', data, config);
  },

  /**
   * Get items in a group (legacy pagination endpoint)
   */
  getItems: (
    groupId: string,
    options?: { limit?: number; offset?: number },
    config?: RequestConfig
  ): Promise<GroupItemsResponse> => {
    return request<GroupItemsResponse>(
      `/top/groups/${groupId}/items`,
      'GET',
      cleanParams({ limit: options?.limit || 50, offset: options?.offset || 0 }),
      { cache: 'long', tags: ['groups', `group-${groupId}`], ...config }
    );
  },

  /**
   * Get group name suggestions for autocomplete
   */
  getSuggestions: (
    query: string,
    options?: { category?: string; subcategory?: string; limit?: number },
    config?: RequestConfig
  ): Promise<GroupSuggestion> => {
    return request<GroupSuggestion>(
      '/top/groups/search/suggestions',
      'GET',
      cleanParams({ query, ...options, limit: options?.limit || 10 }),
      { cache: 'standard', tags: ['suggestions'], ...config }
    );
  },
};

// =============================================================================
// Items API
// =============================================================================

const itemsApi = {
  /**
   * Search items with filters
   */
  search: (params?: ItemSearchParams, config?: RequestConfig): Promise<PaginatedResponse<Item>> => {
    const queryParams = cleanParams({
      category: params?.category,
      subcategory: params?.subcategory,
      search: params?.search,
      sort_by: params?.sortBy,
      offset: params?.offset,
      limit: params?.limit,
    });

    return request<PaginatedResponse<Item>>('/top/items', 'GET', queryParams, {
      cache: 'standard',
      tags: ['items'],
      ...config,
    }).then(response => {
      // Handle both wrapped and unwrapped responses
      if (Array.isArray(response)) {
        return {
          data: response as unknown as Item[],
          total: (response as unknown as Item[]).length,
          page: 1,
          pageSize: (response as unknown as Item[]).length,
          totalPages: 1,
          hasMore: false,
        };
      }
      return response;
    });
  },

  /**
   * Get a single item by ID
   */
  get: (itemId: string, config?: RequestConfig): Promise<Item> => {
    return request<Item>(`/top/items/${itemId}`, 'GET', undefined, {
      cache: 'long',
      tags: ['items', `item-${itemId}`],
      ...config,
    });
  },

  /**
   * Create a new item
   */
  create: (data: ItemCreateRequest, config?: RequestConfig): Promise<Item> => {
    return request<Item>('/top/items', 'POST', data, config);
  },

  /**
   * Update an existing item
   */
  update: (itemId: string, data: Omit<ItemUpdateRequest, 'id'>, config?: RequestConfig): Promise<Item> => {
    return request<Item>(`/top/items/${itemId}`, 'PUT', data, config);
  },

  /**
   * Delete an item
   */
  delete: (itemId: string, config?: RequestConfig): Promise<void> => {
    return request<void>(`/top/items/${itemId}`, 'DELETE', undefined, config);
  },

  /**
   * Get item statistics
   */
  getStats: (params?: ItemStatsParams, config?: RequestConfig): Promise<ItemStatsResponse> => {
    const queryParams: Record<string, string> = {};
    if (params?.item_ids?.length) {
      queryParams.item_ids = params.item_ids.join(',');
    }
    if (params?.category) {
      queryParams.category = params.category;
    }

    return request<ItemStatsResponse>('/items/stats', 'GET', queryParams, {
      cache: 'short',
      tags: ['stats'],
      ...config,
    });
  },

  /**
   * Get stats for a single item
   */
  getStat: async (itemId: string, config?: RequestConfig): Promise<ItemStat | null> => {
    const response = await itemsApi.getStats({ item_ids: [itemId] }, config);
    return response.stats.find(stat => stat.item_id === itemId) || null;
  },

  /**
   * Get trending items
   */
  getTrending: (category?: string, limit = 10, config?: RequestConfig): Promise<Item[]> => {
    return request<Item[]>('/top/items/trending', 'GET', cleanParams({ category, limit }), {
      cache: 'short',
      tags: ['items', 'trending'],
      ...config,
    });
  },
};

// =============================================================================
// Blueprints API
// =============================================================================

const blueprintsApi = {
  /**
   * Search blueprints with filters
   */
  search: (params?: SearchBlueprintsParams, config?: RequestConfig): Promise<Blueprint[]> => {
    const queryParams = cleanParams({
      category: params?.category,
      subcategory: params?.subcategory,
      author_id: params?.authorId,
      is_featured: params?.isFeatured,
      search: params?.search,
      limit: params?.limit,
      offset: params?.offset,
      sort: params?.sort,
    });

    return request<Blueprint[]>('/blueprints', 'GET', queryParams, {
      cache: 'long',
      tags: ['blueprints'],
      ...config,
    });
  },

  /**
   * Get a single blueprint by slug or ID
   */
  get: (slugOrId: string, config?: RequestConfig): Promise<Blueprint> => {
    return request<Blueprint>(`/blueprints/${slugOrId}`, 'GET', undefined, {
      cache: 'long',
      tags: ['blueprints', `blueprint-${slugOrId}`],
      ...config,
    });
  },

  /**
   * Create a new blueprint
   */
  create: (data: CreateBlueprintRequest, config?: RequestConfig): Promise<BlueprintShareResponse> => {
    return request<BlueprintShareResponse>('/blueprints', 'POST', data, config);
  },

  /**
   * Update a blueprint
   */
  update: (slugOrId: string, data: UpdateBlueprintRequest, config?: RequestConfig): Promise<Blueprint> => {
    return request<Blueprint>(`/blueprints/${slugOrId}`, 'PATCH', data, config);
  },

  /**
   * Delete a blueprint
   */
  delete: (slugOrId: string, config?: RequestConfig): Promise<void> => {
    return request<void>(`/blueprints/${slugOrId}`, 'DELETE', undefined, config);
  },

  /**
   * Clone a blueprint
   */
  clone: (
    slugOrId: string,
    options?: { title?: string; userId?: string; timePeriod?: string; size?: number },
    config?: RequestConfig
  ): Promise<{ list: { id: string }; blueprint: Blueprint }> => {
    return request<{ list: { id: string }; blueprint: Blueprint }>(
      `/blueprints/${slugOrId}/clone`,
      'POST',
      options || {},
      config
    );
  },

  /**
   * Get featured blueprints
   */
  getFeatured: (limit = 20, config?: RequestConfig): Promise<Blueprint[]> => {
    return blueprintsApi.search({ isFeatured: true, limit }, config);
  },

  /**
   * Get blueprints by category
   */
  getByCategory: (category: string, config?: RequestConfig): Promise<Blueprint[]> => {
    return blueprintsApi.search({ category }, config);
  },

  /**
   * Get blueprints by author
   */
  getByAuthor: (authorId: string, config?: RequestConfig): Promise<Blueprint[]> => {
    return blueprintsApi.search({ authorId }, config);
  },
};

// =============================================================================
// Consensus API
// =============================================================================

const consensusApi = {
  /**
   * Get consensus data for a category
   */
  getByCategory: (category: string, config?: RequestConfig): Promise<ConsensusAPIResponse> => {
    return request<ConsensusAPIResponse>(`/consensus/${category}`, 'GET', undefined, {
      cache: 'standard',
      tags: ['consensus', `consensus-${category}`],
      ...config,
    });
  },

  /**
   * Get consensus data for a specific list
   */
  getByList: (listId: string, config?: RequestConfig): Promise<Record<string, ItemConsensusWithClusters>> => {
    return request<Record<string, ItemConsensusWithClusters>>(`/consensus/${listId}`, 'GET', undefined, {
      cache: 'standard',
      tags: ['consensus', `list-${listId}`],
      ...config,
    });
  },

  /**
   * Submit a ranking to update consensus
   */
  submit: (data: ConsensusSubmission, config?: RequestConfig): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>('/consensus/submit', 'POST', data, config);
  },
};

// =============================================================================
// Research API
// =============================================================================

const researchApi = {
  /**
   * Research an item (validate and enrich)
   */
  research: (data: ItemResearchRequest, config?: RequestConfig): Promise<ItemResearchResponse> => {
    return request<ItemResearchResponse>('/top/research', 'POST', data, config);
  },

  /**
   * Validate an item without full research
   */
  validate: (data: ItemValidationRequest, config?: RequestConfig): Promise<ItemResearchResponse> => {
    return request<ItemResearchResponse>('/top/research/validate', 'POST', data, config);
  },
};

// =============================================================================
// Users API
// =============================================================================

const usersApi = {
  /**
   * Get current user profile
   */
  me: (config?: RequestConfig): Promise<User> => {
    return request<User>('/users/me', 'GET', undefined, {
      cache: 'short',
      tags: ['user'],
      ...config,
    });
  },

  /**
   * Get user by ID
   */
  get: (userId: string, config?: RequestConfig): Promise<User> => {
    return request<User>(`/users/${userId}`, 'GET', undefined, {
      cache: 'standard',
      tags: ['users', `user-${userId}`],
      ...config,
    });
  },

  /**
   * Update user profile
   */
  update: (userId: string, data: Partial<User>, config?: RequestConfig): Promise<User> => {
    return request<User>(`/users/${userId}`, 'PATCH', data, config);
  },

  /**
   * Get user preferences
   */
  getPreferences: (userId: string, config?: RequestConfig): Promise<UserPreferences> => {
    return request<UserPreferences>(`/users/${userId}/preferences`, 'GET', undefined, {
      cache: 'short',
      tags: ['user', `user-${userId}`],
      ...config,
    });
  },

  /**
   * Update user preferences
   */
  updatePreferences: (userId: string, data: UserPreferences, config?: RequestConfig): Promise<UserPreferences> => {
    return request<UserPreferences>(`/users/${userId}/preferences`, 'PATCH', data, config);
  },
};

// =============================================================================
// Batch & Utility Functions
// =============================================================================

/**
 * Execute multiple requests in parallel
 */
async function batch<T extends readonly Promise<unknown>[]>(
  requests: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const results = await Promise.all(requests);
  return results as { [K in keyof T]: Awaited<T[K]> };
}

/**
 * Invalidate cache by tags
 */
function invalidateCache(options: {
  tags?: string[];
  pattern?: RegExp;
  all?: boolean;
}): number {
  const cache = getGlobalAPICache();
  return cache.invalidate(options);
}

/**
 * Get cache metrics
 */
function getCacheMetrics() {
  const cache = getGlobalAPICache();
  return cache.getMetrics();
}

/**
 * Get pending request count (for deduplication status)
 */
function getPendingRequestCount(): number {
  return pendingRequests.size;
}

// =============================================================================
// GoatAPI - Unified Export
// =============================================================================

export const goatApi = {
  // Domain APIs
  lists: listsApi,
  groups: groupsApi,
  items: itemsApi,
  blueprints: blueprintsApi,
  consensus: consensusApi,
  research: researchApi,
  users: usersApi,

  // Utilities
  batch,
  invalidateCache,
  getCacheMetrics,
  getPendingRequestCount,
} as const;

// Type for the GoatAPI
export type GoatAPI = typeof goatApi;

// Default export
export default goatApi;
