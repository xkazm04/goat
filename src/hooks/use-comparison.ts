"use client";

import { useCallback, useMemo } from "react";

import {
  useComparisonStore,
  useComparisonPanelState,
  useComparisonPanelActions,
  MIN_COMPARISON_ITEMS,
  MAX_COMPARISON_ITEMS,
  type ComparisonHistoryEntry,
} from "@/stores/comparison-store";

import type { BacklogItemType } from "@/types/match";

/**
 * Attribute comparison result
 */
export interface AttributeComparisonResult {
  attribute: string;
  label: string;
  values: (string | number | null)[];
  winnerId: string | null;
  winnerIndex: number | null;
  isHigherBetter: boolean;
  type: "numeric" | "text" | "date" | "list";
}

/**
 * Comparison result for all items
 */
export interface ComparisonResult {
  items: BacklogItemType[];
  attributes: AttributeComparisonResult[];
  overallWinnerId: string | null;
  totalWins: Record<string, number>;
}

/**
 * Hook for managing item comparison selection and state
 */
export function useComparison() {
  const panelState = useComparisonPanelState();
  const panelActions = useComparisonPanelActions();

  const {
    isOpen,
    selectedIds,
    selectedItems,
    canAddMore,
    canCompare,
    history,
    activeComparisonId,
  } = panelState;

  const {
    openPanel,
    closePanel,
    toggleSelection,
    selectMultiple,
    clearSelection,
    swapItem,
    recordComparison,
    loadHistory,
    clearHistory,
    reorder,
    isSelected,
  } = panelActions;

  /**
   * Handle Shift+Click for range selection
   */
  const handleShiftClickSelect = useCallback(
    (item: BacklogItemType, allItems: BacklogItemType[], lastSelectedId: string | null) => {
      if (!lastSelectedId) {
        toggleSelection(item);
        return;
      }

      const lastIndex = allItems.findIndex((i) => i.id === lastSelectedId);
      const currentIndex = allItems.findIndex((i) => i.id === item.id);

      if (lastIndex === -1 || currentIndex === -1) {
        toggleSelection(item);
        return;
      }

      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeItems = allItems.slice(start, end + 1).slice(0, MAX_COMPARISON_ITEMS);

      selectMultiple(rangeItems);
    },
    [toggleSelection, selectMultiple]
  );

  /**
   * Handle Cmd/Ctrl+Click for toggle selection
   */
  const handleModifierClickSelect = useCallback(
    (item: BacklogItemType) => {
      toggleSelection(item);
    },
    [toggleSelection]
  );

  /**
   * Quick compare selected items
   */
  const compareSelected = useCallback(() => {
    if (canCompare) {
      openPanel();
    }
  }, [canCompare, openPanel]);

  /**
   * Rank an item from comparison and record history
   */
  const rankFromComparison = useCallback(
    (winnerId: string, onRank: (itemId: string) => void) => {
      recordComparison(winnerId);
      onRank(winnerId);
    },
    [recordComparison]
  );

  /**
   * Get selection status text
   */
  const selectionStatusText = useMemo(() => {
    const count = selectedIds.length;
    if (count === 0) return "Select items to compare";
    if (count < MIN_COMPARISON_ITEMS) return `Select ${MIN_COMPARISON_ITEMS - count} more`;
    return `${count} items selected`;
  }, [selectedIds.length]);

  return {
    // State
    isOpen,
    selectedIds,
    selectedItems,
    canAddMore,
    canCompare,
    history,
    activeComparisonId,
    selectionStatusText,

    // Actions
    openPanel,
    closePanel,
    toggleSelection,
    selectMultiple,
    clearSelection,
    swapItem,
    recordComparison,
    loadHistory,
    clearHistory,
    reorder,
    isSelected,

    // Handlers
    handleShiftClickSelect,
    handleModifierClickSelect,
    compareSelected,
    rankFromComparison,

    // Constants
    MIN_ITEMS: MIN_COMPARISON_ITEMS,
    MAX_ITEMS: MAX_COMPARISON_ITEMS,
  };
}

/**
 * Hook for keyboard shortcuts in comparison mode
 */
export function useComparisonKeyboard(
  enabled: boolean,
  onCompare?: () => void,
  onClear?: () => void
) {
  const { canCompare, clearSelection } = useComparison();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Enter to compare
      if (e.key === "Enter" && canCompare) {
        e.preventDefault();
        onCompare?.();
      }

      // Escape to clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        onClear?.();
      }
    },
    [enabled, canCompare, clearSelection, onCompare, onClear]
  );

  // Note: Effect for adding/removing listener should be in component
  return { handleKeyDown };
}

/**
 * Hook to get comparison history with item details
 */
export function useComparisonHistory() {
  const { history, activeComparisonId } = useComparisonPanelState();
  const { loadHistory, clearHistory } = useComparisonPanelActions();
  const items = useComparisonStore((state) => state.items);

  /**
   * Get history entries with item details filled in
   */
  const historyWithDetails = useMemo(() => {
    return history.map((entry) => {
      const entryItems = entry.itemIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is BacklogItemType => item !== undefined);

      return {
        ...entry,
        items: entryItems,
        hasAllItems: entryItems.length === entry.itemIds.length,
      };
    });
  }, [history, items]);

  /**
   * Get recent comparison entry
   */
  const recentComparison = useMemo(() => {
    return historyWithDetails[0] || null;
  }, [historyWithDetails]);

  return {
    history: historyWithDetails,
    recentComparison,
    activeComparisonId,
    loadHistory,
    clearHistory,
    hasHistory: history.length > 0,
  };
}

export type { ComparisonHistoryEntry };
