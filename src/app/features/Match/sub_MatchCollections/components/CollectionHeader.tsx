"use client";

import { motion } from "framer-motion";
import { ChevronDown, Layers, LayoutGrid, List } from "lucide-react";
import { CollectionSearch } from "./CollectionSearch";

export type GroupViewMode = 'sidebar' | 'horizontal' | 'minimal';

interface CollectionHeaderProps {
  totalItems: number;
  isVisible: boolean;
  onTogglePanel: () => void;
  groupViewMode: GroupViewMode;
  onGroupViewModeChange: (mode: GroupViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filteredItemCount?: number;
}

/**
 * Collection Panel Header with view mode switcher and consensus toggle
 * The consensus toggle transforms the backlog from a static inventory
 * into a dynamic intelligence layer showing global ranking distributions.
 */
export function CollectionHeader({
  totalItems,
  isVisible,
  onTogglePanel,
  groupViewMode,
  onGroupViewModeChange,
  searchQuery = "",
  onSearchChange,
  filteredItemCount,
}: CollectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.1, duration: 0.2, ease: [0.16, 1, 0.3, 1] }
      }}
      className="flex items-center justify-between px-6 py-3 glass-dock-header"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-cyan-400 transition-colors duration-[var(--glass-transition-fast)]">
          <Layers className="w-5 h-5 transition-transform duration-[var(--glass-transition-normal)] hover:scale-110" />
          <span className="font-bold tracking-wider text-sm">INVENTORY</span>
        </div>
        <div className="h-4 w-[1px] bg-[var(--glass-border-medium)]" />
        <span className="text-xs text-slate-400 font-mono">{totalItems} ITEMS AVAILABLE</span>

        {/* Search Filter */}
        {onSearchChange && (
          <>
            <div className="h-4 w-[1px] bg-[var(--glass-border-medium)]" />
            <CollectionSearch
              value={searchQuery}
              onChange={onSearchChange}
              resultCount={filteredItemCount ?? totalItems}
              totalCount={totalItems}
              placeholder="Search items..."
            />
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Group View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 shadow-inner shadow-black/20 border border-[var(--glass-border-subtle)]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGroupViewModeChange('sidebar')}
            className={`p-1.5 rounded-md transition-all duration-[var(--glass-transition-normal)] glass-dock-focus ${
              groupViewMode === 'sidebar'
                ? 'glass-dock-btn-active text-cyan-400'
                : 'glass-dock-btn text-slate-500 hover:text-slate-300'
            }`}
            aria-label="Sidebar view"
            aria-pressed={groupViewMode === 'sidebar'}
            data-testid="group-view-sidebar-btn"
          >
            <List className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGroupViewModeChange('horizontal')}
            className={`p-1.5 rounded-md transition-all duration-[var(--glass-transition-normal)] glass-dock-focus ${
              groupViewMode === 'horizontal'
                ? 'glass-dock-btn-active text-cyan-400'
                : 'glass-dock-btn text-slate-500 hover:text-slate-300'
            }`}
            aria-label="Horizontal bar view"
            aria-pressed={groupViewMode === 'horizontal'}
            data-testid="group-view-horizontal-btn"
          >
            <LayoutGrid className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePanel}
          aria-expanded={isVisible}
          aria-label="Close inventory panel"
          className="p-2 glass-dock-btn rounded-full text-slate-400 hover:text-white transition-all duration-[var(--glass-transition-normal)] glass-dock-focus"
          data-testid="close-inventory-btn"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
