"use client";

import { motion } from "framer-motion";
import { CollectionGroup } from "@/app/features/Collection/types";

interface CollectionHorizontalBarProps {
  /** Pre-filtered groups (used items already removed by parent) */
  groups: CollectionGroup[];
  /** Pre-calculated available counts per group ID (from parent's centralized filtering) */
  groupAvailableCounts: Record<string, number>;
  activeTab: string | 'all';
  onTabChange: (tabId: string | 'all') => void;
  totalItemCount: number;
}

/**
 * Horizontal bar view for collection group navigation.
 * Groups wrap into multiple rows if needed.
 * Shows count of available (non-used) items.
 *
 * NOTE: Receives pre-filtered groups and pre-calculated counts from SimpleCollectionPanel.
 * This component does NOT filter items itself - filtering is centralized in the parent.
 */
export function CollectionHorizontalBar({
  groups,
  groupAvailableCounts,
  activeTab,
  onTabChange,
  totalItemCount,
}: CollectionHorizontalBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.15, duration: 0.25 }
      }}
      className="px-4 py-3 border-b border-white/5 dark:border-white/[0.02] bg-black/10 dark:bg-black/20"
    >
      <div className="flex flex-wrap gap-2">
        {/* All Items Chip */}
        <motion.button
          onClick={() => onTabChange('all')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              : 'bg-gray-800/50 text-gray-400 border border-transparent hover:bg-gray-700/50 hover:text-white'
          }`}
          data-testid="category-all-items-chip"
        >
          <span>ALL</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'all' ? 'bg-cyan-500/30' : 'bg-white/10'
          }`}>
            {totalItemCount}
          </span>
        </motion.button>

        {/* Group Chips - only show groups with available items */}
        {groups.map((group, index) => {
          // Use pre-calculated count from parent (no re-filtering)
          const availableCount = groupAvailableCounts[group.id] ?? 0;

          // Hide groups with no available items
          if (availableCount === 0) return null;

          return (
            <motion.button
              key={group.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { delay: 0.1 + index * 0.02, duration: 0.15 }
              }}
              onClick={() => onTabChange(group.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex items-center gap-2 ${
                activeTab === group.id
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-gray-800/30 text-gray-500 border border-transparent hover:bg-gray-700/40 hover:text-gray-300'
              }`}
              data-testid={`category-${group.id}-chip`}
            >
              <span className="font-medium truncate max-w-[120px]">{group.name}</span>
              <span className="text-[10px] opacity-60">
                {availableCount}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
