"use client";

import { useMemo } from "react";

import { useGridStore } from "@/stores/grid-store";
import { useCurrentList } from "@/stores/use-list-store";

/**
 * Progress tiers that drive CSS custom property overrides.
 * As users fill grid positions, the tier advances:
 *   idle   -> early -> mid -> hot -> complete
 */
export type ProgressTier = "idle" | "early" | "mid" | "hot" | "complete";

export interface RankingProgress {
  /** Number of filled grid positions */
  filledCount: number;
  /** Total grid positions for this list */
  totalCount: number;
  /** 0-100 percentage */
  percentage: number;
  /** Normalized 0-1 float for CSS var interpolation */
  normalized: number;
  /** Discrete tier for CSS data-attribute selectors */
  tier: ProgressTier;
  /** True when every position is filled */
  isComplete: boolean;
}

function getTier(percentage: number): ProgressTier {
  if (percentage <= 0) return "idle";
  if (percentage < 33) return "early";
  if (percentage < 66) return "mid";
  if (percentage < 100) return "hot";
  return "complete";
}

/**
 * Derives ranking progress from the grid store.
 * Returns reactive CSS-ready values (percentage, normalized 0-1, tier).
 */
export function useRankingProgress(): RankingProgress {
  const gridItems = useGridStore((s) => s.gridItems);
  const maxGridSize = useGridStore((s) => s.maxGridSize);
  const currentList = useCurrentList();

  return useMemo(() => {
    const totalCount = currentList?.size || maxGridSize;
    const filledCount = gridItems.filter((item) => item.context.matched).length;
    const percentage =
      totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
    const normalized = totalCount > 0 ? filledCount / totalCount : 0;
    const isComplete = filledCount >= totalCount && totalCount > 0;
    const tier = getTier(percentage);

    return { filledCount, totalCount, percentage, normalized, tier, isComplete };
  }, [gridItems, maxGridSize, currentList?.size]);
}
