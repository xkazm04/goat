/**
 * useTierIntegration Hook
 * Connects the tier store with the grid store for automatic tier calculation
 */

import { useEffect, useCallback, useMemo } from "react";
import { useGridStore } from "@/stores/grid-store";
import { useTierStore, useTierForPosition, useIsTierBoundary } from "@/stores/tier-store";
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
 */
export function useTierIntegration(
  listSize: number,
  options: TierIntegrationOptions = {}
): TierIntegrationResult {
  const { autoCalculate = true, debounceMs = 100 } = options;

  // Grid store state
  const gridItems = useGridStore((state) => state.gridItems);
  const gridStatistics = useGridStore((state) => state.gridStatistics);

  // Tier store state
  const tiersEnabled = useTierStore((state) => state.configuration.enabled);
  const currentTiers = useTierStore((state) => state.currentTiers);
  const tieredItems = useTierStore((state) => state.tieredItems);
  const summary = useTierStore((state) => state.summary);
  const isCalculating = useTierStore((state) => state.isCalculating);

  // Tier store actions
  const setEnabled = useTierStore((state) => state.setEnabled);
  const calculateTiers = useTierStore((state) => state.calculateTiers);
  const recalculateTiers = useTierStore((state) => state.recalculate);

  // Get filled positions from grid
  const filledPositions = useMemo(() => {
    return gridItems
      .filter((item) => item.matched)
      .map((item) => item.position);
  }, [gridItems]);

  // Auto-calculate tiers when grid changes
  useEffect(() => {
    if (!autoCalculate || !tiersEnabled || listSize === 0) return;

    // Debounce the calculation
    const timeoutId = setTimeout(() => {
      calculateTiers(listSize, filledPositions);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [autoCalculate, tiersEnabled, listSize, filledPositions, calculateTiers, debounceMs]);

  // Get tier for a specific position
  const getTierForPosition = useCallback(
    (position: number): TierDefinition | null => {
      if (!tiersEnabled || currentTiers.length === 0) return null;

      for (const tier of currentTiers) {
        if (position >= tier.startPosition && position < tier.endPosition) {
          return tier;
        }
      }

      return currentTiers[currentTiers.length - 1] || null;
    },
    [tiersEnabled, currentTiers]
  );

  // Check if position is at a tier boundary
  const isTierBoundary = useCallback(
    (position: number): boolean => {
      if (!tiersEnabled || currentTiers.length === 0) return false;

      for (const tier of currentTiers.slice(0, -1)) {
        if (tier.endPosition === position) {
          return true;
        }
      }

      return false;
    },
    [tiersEnabled, currentTiers]
  );

  // Actions
  const enableTiers = useCallback(() => setEnabled(true), [setEnabled]);
  const disableTiers = useCallback(() => setEnabled(false), [setEnabled]);
  const toggleTiers = useCallback(
    () => setEnabled(!tiersEnabled),
    [setEnabled, tiersEnabled]
  );
  const recalculate = useCallback(() => {
    if (tiersEnabled && listSize > 0) {
      calculateTiers(listSize, filledPositions);
    }
  }, [tiersEnabled, listSize, filledPositions, calculateTiers]);

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
  const tier = useTierForPosition(position);
  const isBoundary = useIsTierBoundary(position);
  const tiersEnabled = useTierStore((state) => state.configuration.enabled);

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
  const summary = useTierStore((state) => state.summary);
  const tieredItems = useTierStore((state) => state.tieredItems);
  const currentTiers = useTierStore((state) => state.currentTiers);

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
  const configuration = useTierStore((state) => state.configuration);
  const setPreset = useTierStore((state) => state.setPreset);
  const toggleBands = useTierStore((state) => state.toggleBands);
  const toggleLabels = useTierStore((state) => state.toggleLabels);
  const toggleSeparators = useTierStore((state) => state.toggleSeparators);
  const setEnabled = useTierStore((state) => state.setEnabled);

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
