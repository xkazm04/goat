"use client";

import { CollectionStats as StatsType } from "../types";
import { StatsCard, Metric } from "@/components/ui";

interface CollectionStatsProps {
  stats: StatsType;
  className?: string;
  /** Show placement progress (remaining to rank) instead of total counts */
  showPlacementProgress?: boolean;
}

/**
 * Display collection statistics using the reusable StatsCard component
 *
 * The Collection isn't just a browse panel - it's the "remaining work" queue.
 * When showPlacementProgress is true, displays "X items still need a spot"
 * rather than just total counts.
 */
export function CollectionStats({
  stats,
  className = "",
  showPlacementProgress = true,
}: CollectionStatsProps) {
  // Transform stats into metrics array
  const metrics: Metric[] = [];

  // Primary metric: Show remaining to rank when placement progress is enabled
  if (showPlacementProgress && stats.remainingToRank !== undefined) {
    // "Remaining work" concept - what items still need to be ranked
    metrics.push({
      id: "remaining-to-rank",
      label: "Available",
      value: stats.remainingToRank,
      color: stats.remainingToRank > 0 ? "text-cyan-400" : "text-green-400",
    });

    // Show placed count if any items are placed
    if (stats.placedCount !== undefined && stats.placedCount > 0) {
      metrics.push({
        id: "placed-count",
        label: "Ranked",
        value: stats.placedCount,
        color: "text-green-400",
      });
    }

    // Show completion percentage if progress has been made
    if (stats.completionPercentage !== undefined && stats.completionPercentage > 0) {
      metrics.push({
        id: "completion-percentage",
        label: "Progress",
        value: `${stats.completionPercentage}%`,
        color: stats.completionPercentage >= 100 ? "text-green-400" : "text-amber-400",
      });
    }
  } else {
    // Fallback to original total-based display
    metrics.push(
      {
        id: "total-items",
        label: "Total",
        value: stats.totalItems,
        color: "text-gray-300",
      },
      {
        id: "selected-items",
        label: "Selected",
        value: stats.selectedItems,
        color: "text-cyan-400",
      }
    );
  }

  // Conditionally add groups metric if there are visible groups
  if (stats.visibleGroups > 0) {
    metrics.push({
      id: "visible-groups",
      label: "Groups",
      value: `${stats.visibleGroups}/${stats.totalGroups}`,
      color: "text-gray-300",
    });
  }

  // Add average ranking metric if available
  if (stats.averageRanking !== undefined && stats.rankedItems && stats.rankedItems > 0) {
    metrics.push({
      id: "average-ranking",
      label: "Avg Rating",
      value: `${stats.averageRanking.toFixed(1)}★`,
      color: "text-yellow-500",
    });
  }

  // Add ranked items count if available (only in non-placement mode)
  if (!showPlacementProgress && stats.rankedItems !== undefined && stats.rankedItems > 0) {
    metrics.push({
      id: "ranked-items",
      label: "Rated",
      value: stats.rankedItems,
      color: "text-yellow-400",
    });
  }

  return (
    <StatsCard
      metrics={metrics}
      layout="inline"
      size="sm"
      className={className}
      testId="collection-stats"
    />
  );
}








