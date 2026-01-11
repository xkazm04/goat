"use client";

import { motion } from "framer-motion";
import { CollectionGroup } from "@/app/features/Collection/types";

interface CollectionSidebarProps {
  /** Pre-filtered groups (used items already removed by parent) */
  groups: CollectionGroup[];
  /** Pre-calculated available counts per group ID (from parent's centralized filtering) */
  groupAvailableCounts: Record<string, number>;
  activeTab: string | 'all';
  onTabChange: (tabId: string | 'all') => void;
  totalItemCount: number;
}

/**
 * Sidebar view for collection group navigation.
 * Shows count of available (non-used) items.
 *
 * NOTE: Receives pre-filtered groups and pre-calculated counts from SimpleCollectionPanel.
 * This component does NOT filter items itself - filtering is centralized in the parent.
 */
export function CollectionSidebar({
  groups,
  groupAvailableCounts,
  activeTab,
  onTabChange,
  totalItemCount,
}: CollectionSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: { delay: 0.15, duration: 0.25 }
      }}
      className="w-64 bg-black/20 dark:bg-black/40 backdrop-blur-sm border-r border-white/5 dark:border-white/[0.02] p-4 overflow-y-auto space-y-2"
    >
      {/* All Items Button */}
      <motion.button
        onClick={() => onTabChange('all')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-between group ${
          activeTab === 'all'
            ? 'bg-cyan-500/20 dark:bg-cyan-500/10 text-cyan-300 dark:text-cyan-200 border border-cyan-500/30 dark:border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
            : 'text-gray-400 dark:text-gray-500 hover:bg-white/5 dark:hover:bg-white/10 hover:text-white'
        }`}
        data-testid="category-all-items-btn"
      >
        <span>ALL ITEMS</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          activeTab === 'all' ? 'bg-cyan-500/20 dark:bg-cyan-500/10' : 'bg-white/5 dark:bg-white/10'
        }`}>
          {totalItemCount}
        </span>
      </motion.button>

      <div className="h-[1px] bg-white/5 dark:bg-white/[0.02] my-2" />

      {/* Group Buttons - only show groups with available items */}
      {groups.map((group, index) => {
        // Use pre-calculated count from parent (no re-filtering)
        const availableCount = groupAvailableCounts[group.id] ?? 0;

        // Hide groups with no available items
        if (availableCount === 0) return null;

        return (
          <motion.button
            key={group.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { delay: 0.2 + index * 0.03, duration: 0.2 }
            }}
            onClick={() => onTabChange(group.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all duration-200 flex items-center justify-between group ${
              activeTab === group.id
                ? 'bg-white/10 dark:bg-white/5 text-white border border-white/20 dark:border-white/10'
                : 'text-gray-500 dark:text-gray-600 hover:bg-white/5 dark:hover:bg-white/10 hover:text-gray-300 dark:hover:text-gray-400'
            }`}
            data-testid={`category-${group.id}-btn`}
          >
            <span className="font-medium truncate pr-2">{group.name}</span>
            <span className="text-[10px] opacity-50">
              {availableCount}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
