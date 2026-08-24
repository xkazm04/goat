/**
 * useTierIntegration Hook
 * Connects the ranking store's smart tier functionality with the grid store for automatic tier calculation
 *
 * Consolidated: Now uses ranking-store instead of separate tier-store
 */

import { useEffect, useCallback, useMemo } from "react";

import { getTierForPositionGeneric, isTierTransitionGeneric, rangeFromTierDef } from "@/lib/tiers/boundary";
import { useGridStore } from "@/stores/grid-store";
import {
  useRankingStore,
  selectSmartTierConfiguration,
  selectCurrentSmartTiers,
  selectSmartTieredItems,
  selectSmartTierSummary,
  selectIsSmartTierCalculating,
  selectSmartTiersEnabled,
  useSmartTierForPosition,
  useIsSmartTierBoundary,
} from "@/stores/ranking-store";

import type { TierDefinition, TieredItem, TierSummary } from "@/lib/tiers/types";

interface TierIntegrationOptions {
  autoCalculate?: boolean;
  debounceMs?: number;
}

interface TierIntegrationResult {
  // State
  tiersEnabled: boolean;
  currentTiers: TierDefinition[];
  tieredItems: TieredItem[];
  summary: TierSummary | null;
  isCalculating: boolean;

  // Helpers
  getTierForPosition: (position: number) => TierDefinition | null;
  isTierBoundary: (position: number) => boolean;

  // Actions
  enableTiers: () => void;
  disableTiers: () => void;
  toggleTiers: () => void;
  recalculate: () => void;
}

/**
 * Hook that integrates tier system with grid state
 * Now uses unified ranking-store for tier calculations
 */
export function useTierIntegration(
  listSize: number,
  options: TierIntegrationOptions = {}
): TierIntegrationResult {
  const { autoCalculate = true, debounceMs = 100 } = options;

  // Grid store state
  const gridItems = useGridStore((state) => state.gridItems);

  // Ranking store state (smart tier)
  const tiersEnabled = useRankingStore(selectSmartTiersEnabled);
  const currentTiers = useRankingStore(selectCurrentSmartTiers);
  const tieredItems = useRankingStore(selectSmartTieredItems);
  const summary = useRankingStore(selectSmartTierSummary);
  const isCalculating = useRankingStore(selectIsSmartTierCalculating);

  // Ranking store actions
  const setSmartTierEnabled = useRankingStore((state) => state.setSmartTierEnabled);
  const calculateSmartTiers = useRankingStore((state) => state.calculateSmartTiers);
  const recalculateSmartTiers = useRankingStore((state) => state.recalculateSmartTiers);

  // Get filled positions from grid
  const filledPositions = useMemo(() => {
    return gridItems
      .filter((item) => item.context.matched)
      .map((item) => item.position);
  }, [gridItems]);

  // Auto-calculate tiers when grid changes
  useEffect(() => {
    if (!autoCalculate || !tiersEnabled || listSize === 0) return;

    // Debounce the calculation
    const timeoutId = setTimeout(() => {
      calculateSmartTiers(listSize, filledPositions);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [autoCalculate, tiersEnabled, listSize, filledPositions, calculateSmartTiers, debounceMs]);

  // Get tier for a specific position (delegates to canonical boundary lookup)
  const getTierForPosition = useCallback(
    (position: number): TierDefinition | null => {
      if (!tiersEnabled || currentTiers.length === 0) return null;
      return getTierForPositionGeneric(position, currentTiers, rangeFromTierDef)
        ?? currentTiers[currentTiers.length - 1] ?? null;
    },
    [tiersEnabled, currentTiers]
  );

  // Check if position is at a tier boundary (delegates to canonical boundary lookup)
  const isTierBoundary = useCallback(
    (position: number): boolean => {
      if (!tiersEnabled || currentTiers.length === 0) return false;
      return isTierTransitionGeneric(position, currentTiers, rangeFromTierDef);
    },
    [tiersEnabled, currentTiers]
  );

  // Actions
  const enableTiers = useCallback(() => setSmartTierEnabled(true), [setSmartTierEnabled]);
  const disableTiers = useCallback(() => setSmartTierEnabled(false), [setSmartTierEnabled]);
  const toggleTiers = useCallback(
    () => setSmartTierEnabled(!tiersEnabled),
    [setSmartTierEnabled, tiersEnabled]
  );
  const recalculate = useCallback(() => {
    if (tiersEnabled && listSize > 0) {
      calculateSmartTiers(listSize, filledPositions);
    }
  }, [tiersEnabled, listSize, filledPositions, calculateSmartTiers]);

  return {
    // State
    tiersEnabled,
    currentTiers,
    tieredItems,
    summary,
    isCalculating,

    // Helpers
    getTierForPosition,
    isTierBoundary,

    // Actions
    enableTiers,
    disableTiers,
    toggleTiers,
    recalculate,
  };
}

/**
 * Hook to get tier information for a specific grid slot
 */
export function useTierForSlot(position: number) {
  const tier = useSmartTierForPosition(position);
  const isBoundary = useIsSmartTierBoundary(position);
  const tiersEnabled = useRankingStore(selectSmartTiersEnabled);

  return {
    tier,
    isBoundary,
    enabled: tiersEnabled,
  };
}

/**
 * Hook to get tier statistics
 */
export function useTierStatistics() {
  const summary = useRankingStore(selectSmartTierSummary);
  const tieredItems = useRankingStore(selectSmartTieredItems);
  const currentTiers = useRankingStore(selectCurrentSmartTiers);

  return useMemo(() => {
    if (!summary) {
      return {
        totalTiers: 0,
        totalItems: 0,
        tieredItems: 0,
        fillRate: 0,
        balanceScore: 0,
        dominantTier: null,
        tierDistribution: new Map<string, number>(),
      };
    }

    return {
      totalTiers: currentTiers.length,
      totalItems: summary.totalItems,
      tieredItems: summary.tieredItems,
      fillRate: Math.round((summary.tieredItems / summary.totalItems) * 100),
      balanceScore: summary.balanceScore,
      dominantTier: summary.dominantTier,
      tierDistribution: summary.distribution,
    };
  }, [summary, currentTiers]);
}

/**
 * Hook for tier configuration state
 */
export function useTierConfiguration() {
  const configuration = useRankingStore(selectSmartTierConfiguration);
  const setPreset = useRankingStore((state) => state.setSmartTierPreset);
  const toggleBands = useRankingStore((state) => state.toggleBands);
  const toggleLabels = useRankingStore((state) => state.toggleLabels);
  const toggleSeparators = useRankingStore((state) => state.toggleSeparators);
  const setEnabled = useRankingStore((state) => state.setSmartTierEnabled);

  return {
    configuration,
    setPreset,
    toggleBands,
    toggleLabels,
    toggleSeparators,
    setEnabled,
  };
}

export default useTierIntegration;
