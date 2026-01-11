'use client';

import { useEffect, useMemo } from 'react';
import { useConsensusStore, useItemConsensus } from '@/stores/consensus-store';
import type {
  ItemConsensusWithClusters,
  VolatilityLevel,
  ConsensusBadge,
  ConsensusViewMode,
} from '@/types/consensus';
import {
  getVolatilityLevel,
  getVolatilityColor,
  getVolatilityBgColor,
  getConsensusBadges,
} from '@/types/consensus';
import { sortItemIds, type SortConfig } from '@/lib/sorting';

interface UseConsensusOptions {
  category: string;
  subcategory?: string;
  autoFetch?: boolean;
}

interface UseConsensusResult {
  /** Whether consensus data is loading */
  isLoading: boolean;

  /** Error if any */
  error: Error | null;

  /** Current view mode */
  viewMode: ConsensusViewMode;

  /** Set view mode */
  setViewMode: (mode: ConsensusViewMode) => void;

  /** Cycle through view modes */
  cycleViewMode: () => void;

  /** Get consensus for a specific item */
  getItemConsensus: (itemId: string) => ItemConsensusWithClusters | null;

  /** Check if consensus mode is active */
  isActive: boolean;

  /** Refetch consensus data */
  refetch: () => Promise<void>;
}

/**
 * Hook to access consensus ranking data
 *
 * @example
 * ```tsx
 * const { viewMode, getItemConsensus, isActive } = useConsensus({
 *   category: 'movies',
 *   autoFetch: true
 * });
 *
 * const consensus = getItemConsensus(item.id);
 * ```
 */
export function useConsensus(options: UseConsensusOptions): UseConsensusResult {
  const { category, subcategory, autoFetch = true } = options;

  const store = useConsensusStore();
  const {
    viewMode,
    setViewMode,
    cycleViewMode,
    fetchConsensus,
    getItemConsensus,
    isLoading,
    error,
  } = store;

  // Auto-fetch consensus data when category changes
  useEffect(() => {
    if (autoFetch && category && viewMode !== 'off') {
      fetchConsensus(category, subcategory);
    }
  }, [autoFetch, category, subcategory, viewMode, fetchConsensus]);

  const isActive = viewMode !== 'off';

  const refetch = async () => {
    await fetchConsensus(category, subcategory);
  };

  return {
    isLoading,
    error,
    viewMode,
    setViewMode,
    cycleViewMode,
    getItemConsensus,
    isActive,
    refetch,
  };
}

interface UseItemConsensusUIOptions {
  itemId: string;
}

interface UseItemConsensusUIResult {
  /** The consensus data for this item */
  consensus: ItemConsensusWithClusters | null;

  /** Volatility level classification */
  volatilityLevel: VolatilityLevel | null;

  /** Tailwind color class for volatility */
  volatilityColor: string;

  /** Tailwind background color class for volatility */
  volatilityBgColor: string;

  /** Badges earned by this item */
  badges: ConsensusBadge[];

  /** Formatted median rank string */
  formattedMedianRank: string;

  /** Formatted volatility string */
  formattedVolatility: string;

  /** Formatted confidence string */
  formattedConfidence: string;

  /** Should show consensus overlay */
  shouldShowOverlay: boolean;
}

/**
 * Hook for UI-specific consensus data for a single item
 *
 * @example
 * ```tsx
 * const {
 *   consensus,
 *   volatilityLevel,
 *   volatilityColor,
 *   badges
 * } = useItemConsensusUI({ itemId: item.id });
 * ```
 */
export function useItemConsensusUI(
  options: UseItemConsensusUIOptions
): UseItemConsensusUIResult {
  const { itemId } = options;

  const consensus = useItemConsensus(itemId);
  const viewMode = useConsensusStore((state) => state.viewMode);

  return useMemo(() => {
    if (!consensus) {
      return {
        consensus: null,
        volatilityLevel: null,
        volatilityColor: 'text-gray-400',
        volatilityBgColor: 'bg-gray-500/20',
        badges: [],
        formattedMedianRank: '-',
        formattedVolatility: '-',
        formattedConfidence: '-',
        shouldShowOverlay: false,
      };
    }

    const volatilityLevel = getVolatilityLevel(consensus.volatility);

    return {
      consensus,
      volatilityLevel,
      volatilityColor: getVolatilityColor(volatilityLevel),
      volatilityBgColor: getVolatilityBgColor(volatilityLevel),
      badges: getConsensusBadges(consensus),
      formattedMedianRank: `#${consensus.medianRank}`,
      formattedVolatility: `±${consensus.volatility.toFixed(1)}`,
      formattedConfidence: `${Math.round(consensus.confidence * 100)}%`,
      shouldShowOverlay: viewMode !== 'off',
    };
  }, [consensus, viewMode]);
}

/**
 * Hook to get consensus-sorted items
 * Uses the unified InventorySorter for consistent behavior
 */
export function useConsensusSortedItems(itemIds: string[]): string[] {
  const consensusData = useConsensusStore((state) => state.consensusData);
  const viewMode = useConsensusStore((state) => state.viewMode);

  return useMemo(() => {
    if (viewMode === 'off') {
      return itemIds;
    }

    // Determine sort configuration based on view mode
    const sortConfig: SortConfig = viewMode === 'volatility'
      ? { criteria: 'volatility', direction: 'desc', secondaryCriteria: 'alphabetical', secondaryDirection: 'asc' }
      : { criteria: 'consensus', direction: 'asc', secondaryCriteria: 'alphabetical', secondaryDirection: 'asc' };

    // Use unified sorter
    return sortItemIds(
      itemIds,
      sortConfig,
      (itemId) => consensusData[itemId] ?? null
    );
  }, [itemIds, consensusData, viewMode]);
}
