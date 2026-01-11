"use client";

import { useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { ConfigurableCollectionItem, MATCH_VIEW_CONFIG } from "@/app/features/Collection/components/ConfigurableCollectionItem";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { QuickSelectBadge } from "./QuickSelectBadge";
import { createSortComparator, type SortConfig } from "@/lib/sorting";

/**
 * Generate a stable cache key from item IDs and consensus timestamp.
 * This prevents unnecessary re-sorting when data hasn't actually changed.
 */
function generateSortCacheKey(groups: CollectionGroup[], consensusTimestamp: number | null): string {
  // Create a fingerprint from all item IDs in order
  const itemIds = groups.flatMap(g => g.items?.map(i => i.id) || []).join(',');
  return `${itemIds}:${consensusTimestamp || 0}`;
}

interface VirtualizedCollectionGridProps {
  displayGroups: CollectionGroup[];
  showGroupHeaders?: boolean;
  searchQuery?: string;
  /** Enable sorting by consensus ranking (popular items first) */
  sortByConsensus?: boolean;
  /** Quick-select mode: get number for an item ID, or null if not in quick-select */
  getQuickSelectNumber?: (itemId: string) => number | null;
  /** Check if an item is selected in quick-select mode */
  isItemSelected?: (itemId: string) => boolean;
  /** Number of columns in the grid (responsive, passed from parent) */
  columnCount?: number;
  /** Container height for virtualization */
  containerHeight?: number;
  /** Optional callback when an item is clicked (for click-to-assign) */
  onItemClick?: (item: CollectionItem) => void;
  /** ID of the currently selected item (for click-to-assign highlighting) */
  selectedItemId?: string;
  /** Size of items: 'default' (80px row height) or 'large' (140px row height) */
  itemSize?: 'default' | 'large';
}

interface FlattenedRow {
  type: "header" | "items";
  groupId: string;
  groupName?: string;
  groupItemCount?: number;
  items?: CollectionItem[];
}

/**
 * Virtualized grid display for collection items using @tanstack/react-virtual.
 *
 * This component virtualizes the item list, rendering only visible items (~20-40)
 * instead of all 200+ items simultaneously. This significantly reduces DOM nodes
 * and improves drag-and-drop performance.
 *
 * Conceptually, this represents the "unranked pool" of items (positions [N+1, infinity)).
 * Items here have not yet been assigned a rank in the user's grid.
 *
 * IMPORTANT: This component expects PRE-FILTERED items (used items already removed).
 * Filtering is centralized in SimpleCollectionPanel to avoid duplicate processing.
 * When sortByConsensus is enabled, items are sorted by community consensus ranking,
 * allowing popular items to naturally bubble to the top.
 */
export function VirtualizedCollectionGrid({
  displayGroups,
  showGroupHeaders = true,
  searchQuery = "",
  sortByConsensus = true,
  getQuickSelectNumber,
  isItemSelected,
  columnCount = 10,
  containerHeight = 280,
  onItemClick,
  selectedItemId,
  itemSize = 'default',
}: VirtualizedCollectionGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const sortBy = useConsensusSortBy();
  // Use lastFetched timestamp as a stable proxy for consensus data changes
  // This avoids re-creating array references when consensusData object reference changes
  // but the actual data hasn't changed
  const consensusLastFetched = useConsensusStore((s) => s.lastFetched);
  const hasConsensusData = useConsensusStore((s) => Object.keys(s.consensusData).length > 0);

  // Generate a stable cache key based on item IDs + consensus timestamp
  // This allows useMemo to properly skip re-sorting when nothing has changed
  const sortCacheKey = useMemo(
    () => generateSortCacheKey(displayGroups, consensusLastFetched),
    [displayGroups, consensusLastFetched]
  );

  // Get consensus data lookup function for the unified sorter
  const consensusData = useConsensusStore((s) => s.consensusData);

  // Apply consensus-based sorting using the unified InventorySorter
  // NOTE: Used item filtering is done in SimpleCollectionPanel, not here
  // Memoized by sortCacheKey to avoid re-sorting on every render
  const sortedGroups = useMemo(() => {
    // If consensus sorting not enabled or no data, return as-is
    if (!sortByConsensus || sortBy !== 'consensus' || !hasConsensusData) {
      return displayGroups;
    }

    // Create sort config for consensus sorting with alphabetical tie-breaker
    const sortConfig: SortConfig = {
      criteria: 'consensus',
      direction: 'asc',
      secondaryCriteria: 'alphabetical',
      secondaryDirection: 'asc',
    };

    // Use unified sorter with consensus data lookup
    const comparator = createSortComparator<CollectionItem>(
      sortConfig,
      (itemId) => consensusData[itemId] ?? null
    );

    return displayGroups.map(group => {
      const items = group.items || [];
      const sortedItems = [...items].sort(comparator);
      return { ...group, items: sortedItems };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortCacheKey, sortByConsensus, sortBy, hasConsensusData, consensusData]);

  // Check if there are any visible items
  const hasVisibleItems = sortedGroups.some(group => (group.items?.length || 0) > 0);

  // Check if consensus sorting is active
  const isConsensusSortActive = sortByConsensus && sortBy === 'consensus' && hasConsensusData;

  // Flatten groups into rows (headers + item rows)
  // Each row contains items for one row of the grid
  const flattenedRows = useMemo(() => {
    const rows: FlattenedRow[] = [];

    sortedGroups.forEach(group => {
      if (!group.items || group.items.length === 0) return;

      // Add header row if showing group headers
      if (showGroupHeaders) {
        rows.push({
          type: "header",
          groupId: group.id,
          groupName: group.name,
          groupItemCount: group.items.length,
        });
      }

      // Chunk items into rows based on column count
      for (let i = 0; i < group.items.length; i += columnCount) {
        const rowItems = group.items.slice(i, i + columnCount);
        rows.push({
          type: "items",
          groupId: group.id,
          items: rowItems,
        });
      }
    });

    return rows;
  }, [sortedGroups, showGroupHeaders, columnCount]);

  // Row heights based on item size
  const itemRowHeight = itemSize === 'large' ? 140 : 80;
  const headerRowHeight = 40;

  // Estimate row heights
  const estimateSize = useCallback((index: number) => {
    const row = flattenedRows[index];
    if (row.type === "header") {
      return headerRowHeight;
    }
    return itemRowHeight;
  }, [flattenedRows, itemRowHeight]);

  // Initialize virtualizer
  const rowVirtualizer = useVirtualizer({
    count: flattenedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3, // Render a few extra rows above/below for smoother scrolling
  });

  if (!hasVisibleItems) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { delay: 0.3, duration: 0.2 }
        }}
        className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-600 gap-3"
        data-testid="virtualized-collection-grid-empty"
      >
        <Search className="w-8 h-8 opacity-20" />
        <p className="text-sm">No items available in this category</p>
        <p className="text-xs text-gray-600">Items placed in the grid are hidden here</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2" data-testid="virtualized-collection-grid">
      {/* Sorting indicator when consensus sort is active */}
      {isConsensusSortActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/20"
          data-testid="virtualized-consensus-sort-indicator"
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] text-cyan-300/80">
            Sorted by community ranking
          </span>
          <Sparkles className="w-3 h-3 text-purple-400/60 ml-auto" />
        </motion.div>
      )}

      {/* Virtualized scroll container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        data-testid="virtualized-scroll-container"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = flattenedRows[virtualRow.index];

            if (row.type === "header") {
              return (
                <div
                  key={`header-${row.groupId}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  data-testid={`virtualized-group-header-${row.groupId}`}
                >
                  <div className="flex items-center gap-3 py-2">
                    <h4 className="text-xs font-bold text-cyan-500/70 dark:text-cyan-400/60 uppercase tracking-widest">
                      {row.groupName}
                    </h4>
                    <span className="text-[10px] text-gray-500">({row.groupItemCount})</span>
                    {isConsensusSortActive && (
                      <span className="text-[9px] text-purple-400/60 flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        popular first
                      </span>
                    )}
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/20 dark:from-cyan-400/10 to-transparent" />
                  </div>
                </div>
              );
            }

            // Items row
            return (
              <div
                key={`items-${row.groupId}-${virtualRow.index}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-testid={`virtualized-items-row-${virtualRow.index}`}
              >
                <div
                  className={`grid ${itemSize === 'large' ? 'gap-3' : 'gap-2'}`}
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {row.items?.map((item: CollectionItem, itemIndex: number) => {
                    const quickSelectNum = getQuickSelectNumber?.(item.id);
                    const selected = isItemSelected?.(item.id) ?? false;
                    const isClickSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="relative"
                        data-testid={`virtualized-item-cell-${item.id}`}
                        onClick={onItemClick ? () => onItemClick(item) : undefined}
                      >
                        <ConfigurableCollectionItem
                          item={item}
                          groupId={row.groupId}
                          index={itemIndex}
                          searchQuery={searchQuery}
                          isClickSelected={isClickSelected}
                          onClick={onItemClick ? () => onItemClick(item) : undefined}
                          config={MATCH_VIEW_CONFIG}
                        />
                        {/* Quick-select badge overlay */}
                        <AnimatePresence>
                          {quickSelectNum !== null && quickSelectNum !== undefined && (
                            <QuickSelectBadge
                              number={quickSelectNum}
                              isSelected={selected}
                              size="sm"
                              position="top-left"
                            />
                          )}
                        </AnimatePresence>
                        {/* Selection highlight ring (quick-select or click-select) */}
                        {(selected || isClickSelected) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 rounded-lg ring-2 ring-cyan-400 ring-offset-1 ring-offset-gray-900 pointer-events-none z-10"
                            data-testid={`virtualized-quick-select-highlight-${item.id}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
