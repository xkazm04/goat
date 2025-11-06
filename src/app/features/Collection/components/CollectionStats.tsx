"use client";

import { CollectionStats as StatsType } from "../types";

interface CollectionStatsProps {
  stats: StatsType;
  className?: string;
}

/**
 * Display collection statistics
 */
export function CollectionStats({ stats, className = "" }: CollectionStatsProps) {
  return (
    <div className={`flex items-center gap-4 text-xs ${className}`}>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Total:</span>
        <span className="text-gray-300 font-semibold">{stats.totalItems}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-gray-500">Selected:</span>
        <span className="text-cyan-400 font-semibold">{stats.selectedItems}</span>
      </div>
      {stats.visibleGroups > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Groups:</span>
          <span className="text-gray-300 font-semibold">
            {stats.visibleGroups}/{stats.totalGroups}
          </span>
        </div>
      )}
    </div>
  );
}

