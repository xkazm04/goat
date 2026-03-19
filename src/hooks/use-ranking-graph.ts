/**
 * useRankingGraph Hook
 *
 * React hook for accessing cross-list intelligence data.
 * Provides universal ratings, insights, anomalies, and suggestions
 * for items in the current list context.
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { useRankingGraphStore } from '@/stores/ranking-graph-store';

import type {
  UniversalRating,
  CrossListInsight,
  RankingTrajectory,
} from '@/lib/ranking-graph/types';

/**
 * Get universal rating data for a specific item
 */
export function useItemUniversalRating(itemId: string | null) {
  const { ratings, insights, trajectories, isLoadingItem, error, fetchItemRating } =
    useRankingGraphStore();

  const rating: UniversalRating | null = itemId ? ratings[itemId] ?? null : null;
  const itemInsights: CrossListInsight[] = itemId ? insights[itemId] ?? [] : [];
  const trajectory: RankingTrajectory | null = itemId ? trajectories[itemId] ?? null : null;
  const isLoading = isLoadingItem === itemId;

  const fetch = useCallback(() => {
    if (itemId) return fetchItemRating(itemId);
    return Promise.resolve(null);
  }, [itemId, fetchItemRating]);

  // Auto-fetch on mount if not cached
  useEffect(() => {
    if (itemId && !rating) {
      fetchItemRating(itemId);
    }
  }, [itemId, rating, fetchItemRating]);

  return {
    rating,
    insights: itemInsights,
    trajectory,
    isLoading,
    error,
    refetch: fetch,
  };
}

/**
 * Get anomalies and suggestions for the current list
 */
export function useListCrossListIntelligence(
  listId: string | null,
  category: string | null,
  userPositions: Record<string, number> | null,
  listSize: number
) {
  const {
    currentAnomalies,
    currentSuggestions,
    isLoading,
    error,
    fetchListSuggestions,
  } = useRankingGraphStore();

  const fetchSuggestions = useCallback(() => {
    if (listId && category && userPositions) {
      return fetchListSuggestions(listId, category, userPositions, listSize);
    }
    return Promise.resolve();
  }, [listId, category, userPositions, listSize, fetchListSuggestions]);

  // Memoize filtered results
  const topAnomalies = useMemo(
    () => currentAnomalies.slice(0, 5),
    [currentAnomalies]
  );

  const topSuggestions = useMemo(
    () => currentSuggestions.slice(0, 10),
    [currentSuggestions]
  );

  return {
    anomalies: currentAnomalies,
    topAnomalies,
    suggestions: currentSuggestions,
    topSuggestions,
    isLoading,
    error,
    fetchSuggestions,
  };
}

/**
 * Get a quick summary badge for an item (lightweight, no auto-fetch)
 */
export function useUniversalRatingBadge(itemId: string | null) {
  const rating = useRankingGraphStore(
    state => (itemId ? state.ratings[itemId] ?? null : null)
  );

  if (!rating) {
    return null;
  }

  return {
    tier: rating.universalTier,
    eloScore: rating.eloScore,
    confidence: rating.confidence,
    listCount: rating.listAppearances,
  };
}
