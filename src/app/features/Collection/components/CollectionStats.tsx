"use client";

import { CollectionStats as StatsType } from "../types";
import { StatsCard, Metric } from "@/components/ui";

interface CollectionStatsProps {
  stats: StatsType;
  className?: string;
}

/**
 * Display collection statistics using the reusable StatsCard component
 */
export function CollectionStats({ stats, className = "" }: CollectionStatsProps) {
  // Transform stats into metrics array
  const metrics: Metric[] = [
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
    },
  ];

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

  // Add ranked items count if available
  if (stats.rankedItems !== undefined && stats.rankedItems > 0) {
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




