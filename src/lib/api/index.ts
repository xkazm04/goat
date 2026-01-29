/**
 * GOAT API Module
 *
 * This module provides a unified API client for all GOAT application endpoints.
 *
 * @example Primary Usage (Recommended)
 * ```ts
 * import { goatApi } from '@/lib/api';
 *
 * // Lists
 * const lists = await goatApi.lists.search({ category: 'movies' });
 * const list = await goatApi.lists.get('list-id');
 * await goatApi.lists.create({ title: 'My List', category: 'movies', size: 10 });
 *
 * // Groups
 * const groups = await goatApi.groups.getByCategory('movies');
 * const group = await goatApi.groups.get('group-id');
 *
 * // Items
 * const items = await goatApi.items.search({ category: 'movies' });
 * const stats = await goatApi.items.getStats({ item_ids: ['id1', 'id2'] });
 *
 * // Blueprints
 * const blueprints = await goatApi.blueprints.getFeatured();
 *
 * // Batch requests
 * const [list, group] = await goatApi.batch([
 *   goatApi.lists.get('list-id'),
 *   goatApi.groups.get('group-id'),
 * ]);
 *
 * // Cache management
 * goatApi.invalidateCache({ tags: ['lists'] });
 * const metrics = goatApi.getCacheMetrics();
 * ```
 */

// =============================================================================
// Primary Export - Unified GoatAPI
// =============================================================================

export { goatApi, default as GoatAPI } from './goat-api';
export type { GoatAPI as GoatAPIType } from './goat-api';

// Re-export types from goat-api
export type {
  // Groups & Items
  ItemGroup,
  ItemGroupWithItems,
  GroupItem,
  GroupSearchParams,
  GroupCreateRequest,
  GroupItemsResponse,
  GroupSuggestion,
  // Items
  Item,
  ItemSearchParams,
  ItemCreateRequest,
  ItemUpdateRequest,
  PaginatedResponse,
  // Stats
  ItemStat,
  ItemStatsResponse,
  ItemStatsParams,
  // Consensus
  ConsensusSubmission,
  // Research
  ItemResearchRequest,
  ItemResearchResponse,
  ItemValidationRequest,
  // Users
  User,
  UserPreferences,
} from './goat-api';

// =============================================================================
// Core Client (for advanced usage)
// =============================================================================

export { ApiClient, apiClient, isApiErrorRetriable, getApiErrorMessage, getApiErrorCode } from './client';

// =============================================================================
// Cached Client (for backwards compatibility)
// =============================================================================

export { cachedApiClient, CACHE_CONFIGS } from './cached-client';
export type { CachedRequestOptions } from './cached-client';

// =============================================================================
// Legacy API Client (Deprecated - Use goatApi instead)
// =============================================================================

/**
 * @deprecated Use `goatApi.items` instead
 * This export is maintained for backwards compatibility during migration.
 */
export { collectionApi } from './collection';
export type {
  CollectionApiParams,
  PaginatedResponse as LegacyPaginatedResponse,
  CollectionItemCreate,
  CollectionItemUpdate,
  CollectionStatsResponse,
} from './collection';

// =============================================================================
// Request Batching & Deduplication
// =============================================================================

export {
  // BatchManager
  BatchManager,
  getGlobalBatchManager,
  resetGlobalBatchManager,
  batchGet,
  batchPost,
  type BatchRequest,
  type BatchResponse,
  type BatchResult,
  type BatchManagerOptions,
  type BatchManagerStats,
} from './BatchManager';

export {
  // Deduplicator
  Deduplicator,
  getGlobalDeduplicator,
  resetGlobalDeduplicator,
  type DeduplicatorOptions,
  type DeduplicatorStats,
} from './Deduplicator';

export {
  // WindowScheduler
  WindowScheduler,
  getGlobalWindowScheduler,
  resetGlobalWindowScheduler,
  type WindowSchedulerOptions,
  type BatchPriority,
} from './WindowScheduler';

export {
  // BatchAnalytics
  BatchAnalytics,
  getGlobalBatchAnalytics,
  resetGlobalBatchAnalytics,
  logBatchAnalytics,
  type BatchAnalyticsSnapshot,
  type BatchAnalyticsSummary,
  type BatchAnalyticsReport,
} from './BatchAnalytics';

// =============================================================================
// Utility Exports
// =============================================================================

// Wiki images (external API - not part of GoatAPI)
export { fetchWikipediaImage, fetchItemImage, batchFetchImages } from './wiki-images';
export type { WikiImageResult, WikiSearchResult } from './wiki-images';

// Public API utilities (server-side)
export {
  isValidApiKeyFormat,
  generateApiKey,
  extractApiKey,
  checkRateLimit,
  createApiHeaders,
  apiError,
  toPublicRankingItem,
  parseWidgetConfig,
  handleCors,
  validateApiKey,
} from './public-api';

// Re-export types from api-keys (used by public-api)
export type { ApiKeyTier, PublicRankingItem, WidgetConfig } from '@/types/api-keys';
