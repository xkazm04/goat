/**
 * GoatAPI - Unified API Facade
 *
 * A single, unified API client for all GOAT application endpoints.
 * Consolidates multiple specialized clients into one consistent interface
 * with retry logic, circuit breaking, and full TypeScript coverage.
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
 * ```
 */

import { withCoalescing } from '@/lib/cache/query-cache-config';
import {
  GoatError,
  isGoatError,
} from '@/lib/errors';

import { getGlobalCircuitBreaker } from './CircuitBreaker';
import { apiClient } from './client';
import { generateRequestId } from './request-id';

// =============================================================================
// Types - Lists
// =============================================================================


// =============================================================================
// Types - Groups & Items (from @/types/groups)
// =============================================================================

import type {
  Blueprint,
  CreateBlueprintRequest,
  UpdateBlueprintRequest,
  SearchBlueprintsParams,
  BlueprintShareResponse,
} from '@/types/blueprint';
import type {
  ItemConsensusWithClusters,
  ConsensusAPIResponse,
} from '@/types/consensus';
import type {
  ItemGroup,
  ItemGroupWithItems,
  GroupItem,
  GroupSearchParams,
  GroupCreateRequest,
  GroupItemsResponse,
  GroupSuggestion,
} from '@/types/groups';

export type {
  ItemGroup,
  ItemGroupWithItems,
  GroupItem,
  GroupSearchParams,
  GroupCreateRequest,
  GroupItemsResponse,
  GroupSuggestion,
} from '@/types/groups';

// =============================================================================
// Types - Items (from @/types/items)
// =============================================================================

import type {
  Item,
  ItemSearchParams,
  ItemCreateRequest,
  ItemUpdateRequest,
  PaginatedResponse,
  ItemStat,
  ItemStatsResponse,
  ItemStatsParams,

  ItemResearchRequest,
  ItemResearchResponse,
  ItemValidationRequest} from '@/types/items';

export type {
  Item,
  ItemSearchParams,
  ItemCreateRequest,
  ItemUpdateRequest,
  PaginatedResponse,
  ItemStat,
  ItemStatsResponse,
  ItemStatsParams,
} from '@/types/items';

// =============================================================================
// Types - Blueprints
// =============================================================================


// =============================================================================
// Types - Consensus
// =============================================================================


// =============================================================================
// Types - Research & Users (from @/types/items, @/types/users)
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
  CreatorAnalyticsSummary,
} from '@/types/top-lists';

export type {
  ItemResearchRequest,
  ItemResearchResponse,
  ItemValidationRequest,
} from '@/types/items';

import type {
  User,
  UserPreferences,
  ConsensusSubmission,
} from '@/types/users';

export type {
  User,
  UserPreferences,
  ConsensusSubmission,
} from '@/types/users';

// =============================================================================
// Server Response Shapes
// =============================================================================

/** Server-side paginated response from /api/top/items (format: 'paginated') */
interface ServerPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// =============================================================================
// Request Infrastructure
// =============================================================================

/**
 * Per-request configuration.
 *
 * **Retry ownership**: React Query owns all retry logic (see unified-cache.ts
 * `getRetryConfig`). GoatAPI intentionally does NOT retry — a single failed
 * fetch surfaces immediately so React Query can apply its own backoff/retry
 * strategy without multiplicative retry storms.
 */
interface RequestConfig {
  /** Request timeout in ms */
  timeout?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
}

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
 * Execute request with retry logic and GET request coalescing.
 * Identical in-flight GET requests share a single network call via withCoalescing.
 */
async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data?: unknown,
  config: RequestConfig = {}
): Promise<T> {
  const requestId = generateRequestId();
  const circuitBreaker = getGlobalCircuitBreaker();

  // Circuit breaker: fail fast if endpoint is unhealthy
  if (!circuitBreaker.canRequest(endpoint)) {
    // If HALF_OPEN, wait for probe to complete instead of failing immediately
    const probeResult = await circuitBreaker.waitForProbe(endpoint);
    if (!probeResult) {
      console.warn(`[${requestId}] Circuit open for ${endpoint} — failing fast`);
      throw new GoatError('NETWORK_CONNECTION_REFUSED', `Circuit open for ${endpoint} — failing fast`, {
        category: 'network',
        status: 503,
        details: { context: { circuitState: 'OPEN', endpoint, requestId } },
      });
    }
  }

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

  const executeFn = () => requestFn();

  try {
    // Coalesce identical in-flight GET requests to avoid duplicate network calls
    const result = method === 'GET'
      ? await withCoalescing<T>(
          `${method}:${endpoint}:${data ? JSON.stringify(data) : ''}`,
          executeFn
        )
      : await executeFn();

    circuitBreaker.recordSuccess(endpoint);
    return result;
  } catch (error) {
    circuitBreaker.recordFailure(endpoint, error);
    console.error(`[${requestId}] ${method} ${endpoint} failed:`, isGoatError(error) ? error.code : error);
    throw error;
  }
}

// =============================================================================
// Lists API
// =============================================================================

const listsApi = {
  /**
   * Search lists with filters
   */
  search: (params?: SearchListsParams, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams(params || {}), config);
  },

  /**
   * Get a single list by ID
   */
  get: (listId: string, includeItems = true, config?: RequestConfig): Promise<ListWithItems> => {
    return request<ListWithItems>(`/lists/${listId}`, 'GET', { include_items: includeItems }, config);
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
    return request<ListAnalytics>(`/lists/${listId}/analytics`, 'GET', undefined, config);
  },

  /**
   * Get creator analytics summary for all lists owned by a user
   */
  getCreatorAnalytics: (userId: string, config?: RequestConfig): Promise<CreatorAnalyticsSummary> => {
    return request<CreatorAnalyticsSummary>(`/lists/analytics?user_id=${encodeURIComponent(userId)}`, 'GET', undefined, config);
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
      config
    );
  },

  /**
   * Get user's lists
   */
  getByUser: (userId: string, params?: Omit<SearchListsParams, 'user_id'>, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams({ user_id: userId, ...params }), config);
  },

  /**
   * Get predefined lists
   */
  getPredefined: (category?: string, subcategory?: string, config?: RequestConfig): Promise<TopList[]> => {
    return request<TopList[]>('/lists', 'GET', cleanParams({ predefined: true, category, subcategory }), config);
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
    return request<FeaturedListsResponse>('/lists/featured', 'GET', cleanParams(params || {}), config);
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
    return request<ItemGroup[]>('/top/groups', 'GET', cleanParams(params || {}), config);
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

    return request<ItemGroup[]>(`/top/groups/categories/${category}`, 'GET', params, config);
  },

  /**
   * Get a single group by ID
   */
  get: (groupId: string, includeItems = true, config?: RequestConfig): Promise<ItemGroupWithItems> => {
    return request<ItemGroupWithItems>(`/top/groups/${groupId}`, 'GET', { include_items: includeItems }, config);
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
      config
    );
  },

  /**
   * Bulk-fetch items for multiple groups in a single request.
   * Returns a map of groupId → items array.
   */
  getBulkItems: (
    groupIds: string[],
    config?: RequestConfig
  ): Promise<Record<string, GroupItem[]>> => {
    return request<Record<string, GroupItem[]>>(
      '/top/groups/bulk-items',
      'GET',
      { group_ids: groupIds.join(',') },
      config
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
      config
    );
  },
};

// =============================================================================
// Items API
// =============================================================================

const itemsApi = {
  /**
   * Search items with filters.
   *
   * The /api/top/items endpoint returns the server 'paginated' format
   * ({ items, total, limit, offset, has_more }). This method transforms
   * it into the client-side PaginatedResponse<Item> shape.
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

    return request<ServerPaginatedResponse<Item> | Item[]>('/top/items', 'GET', queryParams, config).then(response => {
      // Fallback: if the server ever returns a raw array, wrap it
      if (Array.isArray(response)) {
        return {
          data: response,
          total: response.length,
          page: 1,
          pageSize: response.length,
          totalPages: 1,
          hasMore: false,
        };
      }

      // Transform server paginated format to client PaginatedResponse
      const pageSize = response.limit || 50;
      const page = Math.floor(response.offset / pageSize) + 1;
      return {
        data: response.items,
        total: response.total,
        page,
        pageSize,
        totalPages: Math.ceil(response.total / pageSize),
        hasMore: response.has_more,
      };
    });
  },

  /**
   * Get a single item by ID
   */
  get: (itemId: string, config?: RequestConfig): Promise<Item> => {
    return request<Item>(`/top/items/${itemId}`, 'GET', undefined, config);
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

    return request<ItemStatsResponse>('/items/stats', 'GET', queryParams, config);
  },

  /**
   * Get stats for a single item (auto-batched via microtask)
   * Multiple concurrent getStat calls are collected and sent as a single getStats request.
   */
  getStat: (() => {
    let pendingIds: string[] = [];
    let pendingResolvers: Array<{ itemId: string; resolve: (v: ItemStat | null) => void; reject: (e: unknown) => void }> = [];
    let scheduled = false;

    return (itemId: string, _config?: RequestConfig): Promise<ItemStat | null> => {
      return new Promise((resolve, reject) => {
        pendingIds.push(itemId);
        pendingResolvers.push({ itemId, resolve, reject });

        if (!scheduled) {
          scheduled = true;
          queueMicrotask(async () => {
            const ids = Array.from(new Set(pendingIds));
            const resolvers = [...pendingResolvers];
            pendingIds = [];
            pendingResolvers = [];
            scheduled = false;

            try {
              const response = await itemsApi.getStats({ item_ids: ids });
              for (const { itemId: id, resolve: res } of resolvers) {
                res(response.stats.find(stat => stat.item_id === id) || null);
              }
            } catch (error) {
              for (const { reject: rej } of resolvers) {
                rej(error);
              }
            }
          });
        }
      });
    };
  })(),

  /**
   * Get trending items
   */
  getTrending: (category?: string, limit = 10, config?: RequestConfig): Promise<Item[]> => {
    return request<Item[]>('/top/items/trending', 'GET', cleanParams({ category, limit }), config);
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

    return request<Blueprint[]>('/blueprints', 'GET', queryParams, config);
  },

  /**
   * Get a single blueprint by slug or ID
   */
  get: (slugOrId: string, config?: RequestConfig): Promise<Blueprint> => {
    return request<Blueprint>(`/blueprints/${slugOrId}`, 'GET', undefined, config);
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
    return request<ConsensusAPIResponse>(`/consensus/${category}`, 'GET', undefined, config);
  },

  /**
   * Get consensus data for a specific list
   */
  getByList: (listId: string, config?: RequestConfig): Promise<Record<string, ItemConsensusWithClusters>> => {
    return request<Record<string, ItemConsensusWithClusters>>(`/consensus/${listId}`, 'GET', undefined, config);
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
    return request<User>('/users/me', 'GET', undefined, config);
  },

  /**
   * Get user by ID
   */
  get: (userId: string, config?: RequestConfig): Promise<User> => {
    return request<User>(`/users/${userId}`, 'GET', undefined, config);
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
    return request<UserPreferences>(`/users/${userId}/preferences`, 'GET', undefined, config);
  },

  /**
   * Update user preferences
   */
  updatePreferences: (userId: string, data: UserPreferences, config?: RequestConfig): Promise<UserPreferences> => {
    return request<UserPreferences>(`/users/${userId}/preferences`, 'PATCH', data, config);
  },
};

// =============================================================================
// GoatAPI - Unified Export
// =============================================================================

export const goatApi = {
  lists: listsApi,
  groups: groupsApi,
  items: itemsApi,
  blueprints: blueprintsApi,
  consensus: consensusApi,
  research: researchApi,
  users: usersApi,
} as const;

// Type for the GoatAPI
export type GoatAPI = typeof goatApi;

// Default export
export default goatApi;
