/**
 * Tier Store
 * Zustand store for tier classification state management
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  TierState,
  TierActions,
  TierConfiguration,
  TierDefinition,
  TierBoundary,
  TieredItem,
  TierSummary,
  TierSuggestion,
  TierPreset,
  TierAlgorithm,
  TierExportConfig,
} from "@/lib/tiers/types";
import {
  DEFAULT_TIER_CONFIGURATION,
  getBestPresetForSize,
  TIER_PRESETS,
} from "@/lib/tiers/constants";
import {
  TierCalculator,
  adjustPresetToSize,
  createTiersFromBoundaries,
  assignTiersToItems,
  calculateTierSummary,
  extractBoundaries,
  generateTierSuggestions,
  calculateTierBoundaries,
} from "@/lib/tiers/TierCalculator";
import { tierLogger } from "@/lib/logger";

/**
 * Initial state
 */
const initialState: TierState = {
  configuration: DEFAULT_TIER_CONFIGURATION,
  currentTiers: [],
  boundaries: [],
  tieredItems: [],
  summary: null,
  suggestions: [],
  isCalculating: false,
  lastCalculated: null,
};

/**
 * Tier Store
 */
export const useTierStore = create<TierState & TierActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Configuration actions
      setEnabled: (enabled) => {
        set((state) => ({
          configuration: { ...state.configuration, enabled },
        }));

        // Recalculate if enabling
        if (enabled) {
          get().recalculate();
        }
      },

      setPreset: (preset) => {
        set((state) => ({
          configuration: { ...state.configuration, preset },
        }));
        get().recalculate();
      },

      setCustomThresholds: (thresholds) => {
        set((state) => ({
          configuration: { ...state.configuration, customThresholds: thresholds },
        }));
        get().recalculate();
      },

      toggleBands: () => {
        set((state) => ({
          configuration: {
            ...state.configuration,
            showBands: !state.configuration.showBands,
          },
        }));
      },

      toggleLabels: () => {
        set((state) => ({
          configuration: {
            ...state.configuration,
            showLabels: !state.configuration.showLabels,
          },
        }));
      },

      toggleSeparators: () => {
        set((state) => ({
          configuration: {
            ...state.configuration,
            showSeparators: !state.configuration.showSeparators,
          },
        }));
      },

      // Calculation actions
      calculateTiers: (listSize, filledPositions) => {
        set({ isCalculating: true });

        try {
          const state = get();
          const { configuration } = state;

          // Get or adjust preset for list size
          let preset = configuration.preset;
          if (
            listSize < preset.listSizeRange.min ||
            listSize > preset.listSizeRange.max
          ) {
            preset = getBestPresetForSize(listSize);
          }

          // Calculate boundaries based on algorithm
          const algorithm: TierAlgorithm = configuration.autoAdjust
            ? "pyramid"
            : "equal";

          const boundaries =
            configuration.customThresholds.length > 0
              ? configuration.customThresholds
              : calculateTierBoundaries(listSize, preset.tierCount, algorithm);

          // Adjust preset to fit actual list size
          const adjustedPreset = adjustPresetToSize(preset, listSize);

          // Create tier definitions from boundaries
          const tiers = createTiersFromBoundaries(boundaries, adjustedPreset);

          // Convert filled positions to item format
          const itemData = filledPositions.map((pos, idx) => ({
            itemId: `item-${pos}`,
            position: pos,
          }));

          // Assign tiers to items
          const tieredItems = assignTiersToItems(itemData, tiers);

          // Calculate summary
          const summary = calculateTierSummary(tiers, tieredItems, listSize);

          // Extract boundaries
          const tierBoundaries = extractBoundaries(tiers);

          // Generate suggestions
          const suggestions = generateTierSuggestions(
            listSize,
            filledPositions,
            preset.tierCount
          );

          set({
            configuration: { ...configuration, preset: adjustedPreset },
            currentTiers: tiers,
            boundaries: tierBoundaries,
            tieredItems,
            summary,
            suggestions,
            isCalculating: false,
            lastCalculated: Date.now(),
          });
        } catch (error) {
          tierLogger.error("Tier calculation failed:", error);
          set({ isCalculating: false });
        }
      },

      recalculate: () => {
        // This will be called by external code with actual data
        // For now, just mark as needing recalculation
        set({ lastCalculated: null });
      },

      applyAlgorithm: (algorithm, params = {}) => {
        const state = get();
        const { currentTiers, configuration } = state;

        if (currentTiers.length === 0) return;

        const listSize = currentTiers[currentTiers.length - 1].endPosition;
        const boundaries = calculateTierBoundaries(
          listSize,
          configuration.preset.tierCount,
          algorithm,
          params
        );

        // Update with new boundaries
        set({
          configuration: {
            ...configuration,
            customThresholds: boundaries,
          },
        });

        // Recalculate with new boundaries
        get().recalculate();
      },

      // Boundary actions
      adjustBoundary: (boundaryIndex, newPosition) => {
        const state = get();
        const { boundaries, currentTiers } = state;

        if (boundaryIndex < 0 || boundaryIndex >= boundaries.length) return;

        // Validate the new position is within valid range
        const minPos = boundaryIndex > 0
          ? boundaries[boundaryIndex - 1].position + 1
          : currentTiers[0].startPosition + 1;
        const maxPos = boundaryIndex < boundaries.length - 1
          ? boundaries[boundaryIndex + 1].position - 1
          : currentTiers[currentTiers.length - 1].endPosition - 1;

        const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));

        // Update the boundary
        const newBoundaries = [...boundaries];
        newBoundaries[boundaryIndex] = {
          ...newBoundaries[boundaryIndex],
          position: clampedPosition,
          isCustomized: true,
        };

        // Update tier definitions
        const newTiers = [...currentTiers];
        newTiers[boundaryIndex] = {
          ...newTiers[boundaryIndex],
          endPosition: clampedPosition,
        };
        newTiers[boundaryIndex + 1] = {
          ...newTiers[boundaryIndex + 1],
          startPosition: clampedPosition,
        };

        // Extract custom thresholds
        const customThresholds = [
          0,
          ...newBoundaries.map((b) => b.position),
          newTiers[newTiers.length - 1].endPosition,
        ];

        set((state) => ({
          boundaries: newBoundaries,
          currentTiers: newTiers,
          configuration: {
            ...state.configuration,
            customThresholds,
          },
        }));

        // Recalculate summary
        get().recalculate();
      },

      resetBoundaries: () => {
        set((state) => ({
          configuration: {
            ...state.configuration,
            customThresholds: [],
          },
        }));
        get().recalculate();
      },

      // Suggestion actions
      getSuggestions: () => {
        const state = get();
        const { currentTiers, tieredItems, configuration } = state;

        if (currentTiers.length === 0) return;

        const listSize = currentTiers[currentTiers.length - 1].endPosition;
        const filledPositions = tieredItems.map((item) => item.position);

        const suggestions = generateTierSuggestions(
          listSize,
          filledPositions,
          configuration.preset.tierCount
        );

        set({ suggestions });
      },

      applySuggestion: (suggestion) => {
        const state = get();
        const { configuration } = state;

        set({
          configuration: {
            ...configuration,
            customThresholds: suggestion.boundaries,
          },
        });

        get().recalculate();
      },

      // Export action
      exportTierList: async (config) => {
        // This is a stub - actual export happens in TierExporter component
        // The store just provides the data
        throw new Error("Export should be handled by TierExporter component");
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "goat-tier-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        configuration: state.configuration,
      }),
    }
  )
);

/**
 * Selectors
 */
export const selectTierConfiguration = (state: TierState) => state.configuration;
export const selectCurrentTiers = (state: TierState) => state.currentTiers;
export const selectTieredItems = (state: TierState) => state.tieredItems;
export const selectTierSummary = (state: TierState) => state.summary;
export const selectTierBoundaries = (state: TierState) => state.boundaries;
export const selectTierSuggestions = (state: TierState) => state.suggestions;
export const selectIsCalculating = (state: TierState) => state.isCalculating;
export const selectTiersEnabled = (state: TierState) => state.configuration.enabled;

/**
 * Hook to get tier for a specific position
 */
export function useTierForPosition(position: number) {
  const tiers = useTierStore(selectCurrentTiers);
  const enabled = useTierStore(selectTiersEnabled);

  if (!enabled || tiers.length === 0) return null;

  for (const tier of tiers) {
    if (position >= tier.startPosition && position < tier.endPosition) {
      return tier;
    }
  }

  return tiers[tiers.length - 1] || null;
}

/**
 * Hook to get tier stats
 */
export function useTierStats() {
  const summary = useTierStore(selectTierSummary);
  return summary?.tierStats || [];
}

/**
 * Hook to check if position is at a tier boundary
 */
export function useIsTierBoundary(position: number) {
  const boundaries = useTierStore(selectTierBoundaries);
  return boundaries.some((b) => b.position === position);
}

export default useTierStore;
