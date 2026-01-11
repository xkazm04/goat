"use client";

import { motion } from "framer-motion";
import { ChevronDown, Layers, LayoutGrid, List } from "lucide-react";
import { ConsensusToggle } from "./ConsensusToggle";
import { CollectionSearch } from "./CollectionSearch";
import { InventorySortControl } from "./InventorySortControl";

export type GroupViewMode = 'sidebar' | 'horizontal';

interface CollectionHeaderProps {
  totalItems: number;
  isVisible: boolean;
  onTogglePanel: () => void;
  groupViewMode: GroupViewMode;
  onGroupViewModeChange: (mode: GroupViewMode) => void;
  category?: string;
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
        transition: { delay: 0.1, duration: 0.2 }
      }}
      className="flex items-center justify-between px-6 py-3 border-b border-white/5 dark:border-white/[0.02] bg-black/20 dark:bg-black/30 backdrop-blur-sm"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-cyan-400 dark:text-cyan-300">
          <Layers className="w-5 h-5" />
          <span className="font-bold tracking-wider text-sm">INVENTORY</span>
        </div>
        <div className="h-4 w-[1px] bg-white/10 dark:bg-white/5" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{totalItems} ITEMS AVAILABLE</span>

        {/* Search Filter */}
        {onSearchChange && (
          <>
            <div className="h-4 w-[1px] bg-white/10 dark:bg-white/5" />
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
        {/* Inventory Sort Control - enables sorting by consensus ranking */}
        <InventorySortControl />

        {/* Separator */}
        <div className="h-5 w-[1px] bg-white/10 dark:bg-white/5" />

        {/* Consensus Discovery Toggle */}
        <ConsensusToggle compact />

        {/* Separator */}
        <div className="h-5 w-[1px] bg-white/10 dark:bg-white/5" />

        {/* Group View Mode Switcher */}
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGroupViewModeChange('sidebar')}
            className={`p-1.5 rounded-md transition-colors ${
              groupViewMode === 'sidebar'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Sidebar view"
            data-testid="group-view-sidebar-btn"
          >
            <List className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGroupViewModeChange('horizontal')}
            className={`p-1.5 rounded-md transition-colors ${
              groupViewMode === 'horizontal'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Horizontal bar view"
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
          className="p-2 hover:bg-white/5 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-white transition-colors"
          data-testid="close-inventory-btn"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
