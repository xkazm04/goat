"use client";

import { motion, AnimatePresence } from "framer-motion";

import { ItemCategory } from "@/app/features/Collection/types";
import { DURATION, EASE } from '@/lib/animations/motion-presets';
import { highlightMatch } from "@/lib/utils/search";

interface CollectionSidebarProps {
  /** Pre-filtered groups (used items already removed by parent) */
  groups: ItemCategory[];
  /** Pre-calculated available counts per group ID (from parent's centralized filtering) */
  groupAvailableCounts: Record<string, number>;
  activeTab: string | 'all';
  onTabChange: (tabId: string | 'all') => void;
  totalItemCount: number;
  /** Current search query for highlighting group names */
  searchQuery?: string;
  /** Per-group count of items matching the search query */
  groupMatchCounts?: Record<string, number>;
  /** Group IDs whose name matched the search query */
  groupNameMatches?: Record<string, boolean>;
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
  searchQuery = '',
  groupMatchCounts = {},
  groupNameMatches = {},
}: CollectionSidebarProps) {
  const isSearching = searchQuery.trim().length > 0;
  return (
    <motion.nav
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: 1,
        x: 0,
        transition: { delay: DURATION.quick, duration: DURATION.normal, ease: EASE.out }
      }}
      aria-label="Collection categories"
      className="w-[140px] lg:w-44 glass-dock-sidebar p-3 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-white/[0.02]"
    >
      {/* All Items Button */}
      <motion.button
        onClick={() => onTabChange('all')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-pressed={activeTab === 'all'}
        aria-label={`Show all items (${totalItemCount} available)`}
        className={`w-full text-left px-3 py-2.5 rounded-card text-xs font-bold tracking-wide transition-all duration-200 flex items-center justify-between group glass-dock-focus ${
          activeTab === 'all'
            ? 'bg-linear-to-r from-brand/20 to-brand/10 text-brand-hover border border-brand/30 shadow-glow-brand-sm'
            : 'bg-white/2 text-slate-400 hover:text-white hover:bg-white/5 border border-white/4 hover:border-white/8'
        }`}
        data-testid="category-all-items-btn"
      >
        <span>ALL ITEMS</span>
        <span className={`text-2xs font-mono px-1.5 py-0.5 rounded transition-all ${
          activeTab === 'all'
            ? 'bg-brand/20 text-brand-hover'
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
              transition: { delay: DURATION.fast + index * 0.03, duration: DURATION.fast, ease: EASE.out }
            }}
            onClick={() => onTabChange(group.id)}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={activeTab === group.id}
            aria-label={`Filter by ${group.name} (${availableCount} available)`}
            className={`w-full text-left px-3 py-2 rounded-card text-xs transition-all duration-200 flex items-center justify-between group glass-dock-focus ${
              activeTab === group.id
                ? 'bg-linear-to-r from-white/10 to-white/5 text-white border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]'
                : 'bg-transparent text-slate-500 hover:text-slate-200 hover:bg-white/3 border border-transparent hover:border-white/5'
            }`}
            data-testid={`category-${group.id}-btn`}
          >
            <div className="flex flex-col min-w-0 flex-1 pr-2">
              <span className="font-medium truncate">
                {isSearching ? highlightMatch(group.name || '', searchQuery) : group.name}
              </span>
              <AnimatePresence>
                {isSearching && (groupMatchCounts[group.id] ?? 0) > 0 && !groupNameMatches[group.id] && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-2xs text-brand-hover/70 font-normal"
                  >
                    {groupMatchCounts[group.id]} item{groupMatchCounts[group.id] !== 1 ? 's' : ''} match
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className={`text-2xs font-mono px-1.5 py-0.5 rounded transition-all shrink-0 ${
              activeTab === group.id
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-slate-300'
            }`} aria-hidden="true">
              {availableCount}
            </span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
