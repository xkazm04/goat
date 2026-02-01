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
    <motion.nav
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: { delay: 0.15, duration: 0.25, ease: [0.16, 1, 0.3, 1] }
      }}
      aria-label="Collection categories"
      className="w-44 glass-dock-sidebar p-3 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-white/[0.02]"
    >
      {/* All Items Button */}
      <motion.button
        onClick={() => onTabChange('all')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-pressed={activeTab === 'all'}
        aria-label={`Show all items (${totalItemCount} available)`}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all duration-200 flex items-center justify-between group glass-dock-focus ${
          activeTab === 'all'
            ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15),inset_0_1px_0_rgba(255,255,255,0.05)]'
            : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08]'
        }`}
        data-testid="category-all-items-btn"
      >
        <span>ALL ITEMS</span>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
          activeTab === 'all'
            ? 'bg-cyan-500/20 text-cyan-300'
            : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white/70'
        }`} aria-hidden="true">
          {totalItemCount}
        </span>
      </motion.button>

      <div className="glass-dock-divider my-2" />

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
              transition: { delay: 0.2 + index * 0.03, duration: 0.2, ease: [0.16, 1, 0.3, 1] }
            }}
            onClick={() => onTabChange(group.id)}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={activeTab === group.id}
            aria-label={`Filter by ${group.name} (${availableCount} available)`}
            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] transition-all duration-200 flex items-center justify-between group glass-dock-focus ${
              activeTab === group.id
                ? 'bg-gradient-to-r from-white/10 to-white/5 text-white border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'bg-transparent text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.05]'
            }`}
            data-testid={`category-${group.id}-btn`}
          >
            <span className="font-medium truncate pr-2">{group.name}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
              activeTab === group.id
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60'
            }`} aria-hidden="true">
              {availableCount}
            </span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
