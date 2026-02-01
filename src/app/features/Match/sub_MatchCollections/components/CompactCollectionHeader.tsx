"use client";

import { memo, useDeferredValue } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedCollectionSearch } from "./EnhancedCollectionSearch";

export type GroupViewMode = 'sidebar' | 'horizontal' | 'minimal';

interface CompactCollectionHeaderProps {
  totalItems: number;
  filteredItemCount: number;
  isVisible: boolean;
  onTogglePanel: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: string;
  /** Items for search suggestions */
  searchableItems?: Array<{ id: string; title: string }>;
}

/**
 * CompactCollectionHeader
 *
 * Ultra-slim header (32px) that combines:
 * - Title with item count
 * - Inline search input
 * - Minimize/maximize toggle
 *
 * Saves ~20px compared to original CollectionHeader.
 */
export const CompactCollectionHeader = memo(function CompactCollectionHeader({
  totalItems,
  filteredItemCount,
  isVisible,
  onTogglePanel,
  searchQuery,
  onSearchChange,
  activeCategory,
  searchableItems = [],
}: CompactCollectionHeaderProps) {
  const isFiltering = searchQuery.length > 0;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 h-9 bg-gradient-to-r from-black/50 via-cyan-950/10 to-black/50 border-b border-white/8 shadow-[inset_0_-1px_0_rgba(0,0,0,0.3)]">
      {/* Left: Title + Count */}
      <div className="flex items-center gap-2 shrink-0">
        <Layers className="w-4 h-4 text-cyan-500/70" />
        <span className="text-xs font-semibold text-white/80 tracking-wide">
          INVENTORY
        </span>
        <span className="text-[10px] font-mono text-white/40 tabular-nums">
          {isFiltering ? `${filteredItemCount}/` : ''}{totalItems}
        </span>
      </div>

      {/* Center: Enhanced Search with suggestions */}
      <div className="flex-1 max-w-md">
        <EnhancedCollectionSearch
          value={searchQuery}
          onChange={onSearchChange}
          items={searchableItems}
          placeholder="Search items... (Press /)"
        />
      </div>

      {/* Right: Active category indicator + Minimize */}
      <div className="flex items-center gap-2 shrink-0">
        {activeCategory !== 'all' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400/80 border border-cyan-500/20">
            {activeCategory}
          </span>
        )}
        <button
          onClick={onTogglePanel}
          className={cn(
            "p-1.5 rounded-md transition-all duration-200",
            "text-white/40 hover:text-white/70 hover:bg-white/5"
          )}
          aria-label={isVisible ? "Minimize panel" : "Expand panel"}
        >
          {isVisible ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
});

export default CompactCollectionHeader;
