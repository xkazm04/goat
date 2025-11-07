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



