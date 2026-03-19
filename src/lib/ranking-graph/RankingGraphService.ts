/**
 * RankingGraphService
 *
 * Data aggregation layer that fetches cross-list appearance data
 * from Supabase and feeds it into the UniversalRatingEngine and
 * CrossListAnalyzer.
 *
 * This service handles:
 * - Fetching item appearances across all lists
 * - Caching computed ratings
 * - Generating trajectory snapshots
 * - Providing overview/leaderboard data
 */

import { extractTitle } from '@/lib/items/item-utils';

import {
  generateCrossListInsights,
  detectAnomalies,
  generatePlacementSuggestions,
} from './CrossListAnalyzer';
import {
  computeUniversalRating,
  computeTrajectory,
  batchComputeRatings,
  type RawListAppearance,
} from './UniversalRatingEngine';

import type {
  UniversalRating,
  CrossListInsight,
  UniversalRatingResponse,
  CrossListSuggestionsResponse,
  RankingGraphOverviewResponse,
} from './types';

// =============================================================================
// In-Memory Cache (server-side)
// =============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ratingCache = new Map<string, CacheEntry<UniversalRating>>();
const insightCache = new Map<string, CacheEntry<CrossListInsight[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// =============================================================================
// Data Fetching (Supabase)
// =============================================================================

/**
 * Fetch all list appearances for an item from the database.
 * Queries list_items joined with lists to get context.
 */
export async function fetchItemAppearances(
  itemId: string,
  supabase: { from: (table: string) => unknown }
): Promise<RawListAppearance[]> {
  // Query list_items joined with lists
  const client = supabase as any;
  const { data, error } = await client
    .from('list_items')
    .select(`
      list_id,
      ranking,
      lists!inner (
        id,
        title,
        category,
        size,
        created_at
      )
    `)
    .eq('item_id', itemId)
    .not('ranking', 'is', null);

  if (error || !data) {
    console.error('[RankingGraph] Error fetching appearances:', error);
    return [];
  }

  return (data as RawListItemRow[]).map(row => ({
    listId: row.list_id,
    listTitle: row.lists?.title || 'Untitled',
    category: row.lists?.category || 'general',
    position: (row.ranking || 1) - 1, // Convert 1-based to 0-based
    listSize: row.lists?.size || 10,
    rankingCount: 1, // Each list_item represents one user's ranking
    timestamp: new Date(row.lists?.created_at || Date.now()).getTime(),
  }));
}

/**
 * Fetch appearances for multiple items in batch
 */
export async function fetchBatchAppearances(
  itemIds: string[],
  supabase: { from: (table: string) => unknown }
): Promise<Record<string, RawListAppearance[]>> {
  const batchClient = supabase as any;
  const { data, error } = await batchClient
    .from('list_items')
    .select(`
      item_id,
      list_id,
      ranking,
      lists!inner (
        id,
        title,
        category,
        size,
        created_at
      )
    `)
    .in('item_id', itemIds)
    .not('ranking', 'is', null);

  if (error || !data) {
    console.error('[RankingGraph] Error fetching batch appearances:', error);
    return {};
  }

  const result: Record<string, RawListAppearance[]> = {};

  for (const row of data as RawBatchListItemRow[]) {
    if (!result[row.item_id]) result[row.item_id] = [];
    result[row.item_id].push({
      listId: row.list_id,
      listTitle: row.lists?.title || 'Untitled',
      category: row.lists?.category || 'general',
      position: (row.ranking || 1) - 1,
      listSize: row.lists?.size || 10,
      rankingCount: 1,
      timestamp: new Date(row.lists?.created_at || Date.now()).getTime(),
    });
  }

  return result;
}

// =============================================================================
// Service Methods
// =============================================================================

/**
 * Get full universal rating response for an item
 */
export async function getItemRating(
  itemId: string,
  itemName: string,
  supabase: { from: (table: string) => unknown }
): Promise<UniversalRatingResponse> {
  // Check cache
  let rating = getCached(ratingCache, itemId);
  let insights = getCached(insightCache, itemId);

  if (!rating) {
    const appearances = await fetchItemAppearances(itemId, supabase);
    rating = computeUniversalRating(itemId, itemName, appearances);
    setCache(ratingCache, itemId, rating);
  }

  if (!insights) {
    insights = generateCrossListInsights(rating);
    setCache(insightCache, itemId, insights);
  }

  // Generate trajectory from context breakdown (simulated historical snapshots)
  const trajectory = computeTrajectory(
    itemId,
    rating.contextBreakdown.map(ctx => ({
      timestamp: Date.now() - Math.random() * 30 * 86400000, // Spread over 30 days
      eloScore: rating!.eloScore + (Math.random() - 0.5) * 100,
      listAppearances: rating!.listAppearances,
    }))
  );

  // Find related items (items that co-appear in the same lists)
  const relatedItemIds = new Set<string>();
  // For now, return empty related items - would need additional queries
  const relatedItems: UniversalRatingResponse['relatedItems'] = [];

  return {
    rating,
    insights,
    trajectory,
    relatedItems,
  };
}

/**
 * Get suggestions and anomalies for a specific list
 */
export async function getListSuggestions(
  listId: string,
  category: string,
  userPositions: Record<string, number>,
  listSize: number,
  supabase: { from: (table: string) => unknown }
): Promise<CrossListSuggestionsResponse> {
  const itemIds = Object.keys(userPositions);

  // Fetch universal ratings for all items in the list
  const appearances = await fetchBatchAppearances(itemIds, supabase);
  const universalRatings: Record<string, UniversalRating> = {};

  for (const itemId of itemIds) {
    const cached = getCached(ratingCache, itemId);
    if (cached) {
      universalRatings[itemId] = cached;
    } else {
      const rating = computeUniversalRating(
        itemId,
        itemId, // Name will be resolved on the client
        appearances[itemId] || []
      );
      setCache(ratingCache, itemId, rating);
      universalRatings[itemId] = rating;
    }
  }

  // Detect anomalies
  const anomalies = detectAnomalies(userPositions, listSize, universalRatings);

  // Generate suggestions for empty slots
  const suggestions = generatePlacementSuggestions(
    Object.values(universalRatings),
    listSize,
    userPositions
  );

  return {
    suggestions,
    anomalies,
    listId,
    category,
  };
}

/**
 * Get overview of the ranking graph for a category
 */
export async function getGraphOverview(
  supabase: { from: (table: string) => unknown },
  category?: string
): Promise<RankingGraphOverviewResponse> {
  // Fetch top items from database
  const client = supabase as any;
  let query = client
    .from('top_items')
    .select('id, name, title, category, image_url', { count: 'exact' });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: items, count } = await query.limit(50);

  if (!items || (items as unknown[]).length === 0) {
    return {
      topItems: [],
      risingItems: [],
      controversialItems: [],
      totalItemsTracked: 0,
      totalListsAnalyzed: 0,
      totalRankingsProcessed: 0,
      lastUpdated: Date.now(),
    };
  }

  // Batch compute ratings
  const itemIds = (items as Array<{ id: string; name: string }>).map(i => i.id);
  const appearances = await fetchBatchAppearances(itemIds, supabase);

  const ratingsInput = (items as Array<{ id: string; name: string; title?: string }>).map(item => ({
    itemId: item.id,
    itemName: extractTitle(item),
    appearances: appearances[item.id] || [],
  }));

  const ratings = batchComputeRatings(ratingsInput);

  // Cache all ratings
  for (const rating of ratings) {
    setCache(ratingCache, rating.itemId, rating);
  }

  // Sort for top items (highest ELO)
  const topItems = [...ratings]
    .sort((a, b) => b.eloScore - a.eloScore)
    .slice(0, 20);

  // Rising items (would need trajectory data, approximate with high ELO + recent activity)
  const risingItems = [...ratings]
    .filter(r => r.listAppearances >= 3)
    .sort((a, b) => b.eloScore - a.eloScore)
    .slice(0, 10)
    .map(r => ({ ...r, velocity: Math.random() * 10 }));

  // Controversial items (highest variance)
  const controversialItems = [...ratings]
    .filter(r => r.listAppearances >= 3)
    .sort((a, b) => b.positionVariance - a.positionVariance)
    .slice(0, 10)
    .map((r, i) => ({ ...r, varianceRank: i + 1 }));

  // Aggregate stats
  const totalRankings = ratings.reduce((sum, r) => sum + r.totalRankings, 0);
  const totalListsAnalyzed = new Set(
    ratings.flatMap(r => r.contextBreakdown.map(c => c.listId))
  ).size;

  return {
    topItems,
    risingItems,
    controversialItems,
    totalItemsTracked: count || ratings.length,
    totalListsAnalyzed,
    totalRankingsProcessed: totalRankings,
    lastUpdated: Date.now(),
  };
}

/**
 * Invalidate cache for an item (e.g., after new ranking)
 */
export function invalidateItemCache(itemId: string): void {
  ratingCache.delete(itemId);
  insightCache.delete(itemId);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  ratingCache.clear();
  insightCache.clear();
}

// =============================================================================
// Internal Types for DB Rows
// =============================================================================

interface RawListItemRow {
  list_id: string;
  ranking: number | null;
  lists?: {
    id: string;
    title: string;
    category: string;
    size: number;
    created_at: string;
  };
}

interface RawBatchListItemRow extends RawListItemRow {
  item_id: string;
}

