"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { ConfigurableCollectionItem, MATCH_VIEW_CONFIG } from "@/app/features/Collection/components/ConfigurableCollectionItem";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { QuickSelectBadge } from "./QuickSelectBadge";
import { ItemStatsTooltip } from "./ItemStatsTooltip";
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

/**
 * Represents a single item in the flattened continuous layout
 */
interface FlattenedItem {
  item: CollectionItem;
  groupId: string;
  globalIndex: number;
}

/**
 * Represents a row in the continuous layout with category boundary tracking
 */
interface ContinuousRow {
  items: FlattenedItem[];
  startIndex: number;
  boundaryIndices: number[]; // indices where category changes (dividers go BEFORE these)
}

interface VirtualizedCollectionGridProps {
  displayGroups: CollectionGroup[];
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
  /** Row height for items (calculated dynamically based on aspect ratio) */
  rowHeight?: number;
  /** Fixed item width for constrained sizing (prevents items from expanding) */
  itemWidth?: number;
  /** Optional callback when an item is clicked (for click-to-assign) */
  onItemClick?: (item: CollectionItem) => void;
  /** ID of the currently selected item (for click-to-assign highlighting) */
  selectedItemId?: string;
}


/**
 * Visual divider between items from different categories within a row.
 * Uses a subtle gradient for a soft separation effect.
 */
function CategoryDivider() {
  return (
    <div
      className="w-px self-stretch my-1 bg-gradient-to-b from-transparent via-white/15 to-transparent"
      aria-hidden="true"
    />
  );
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
  searchQuery = "",
  sortByConsensus = true,
  getQuickSelectNumber,
  isItemSelected,
  columnCount = 10,
  containerHeight = 280,
  rowHeight = 76, // Default: 56px width * 5/4 aspect + 6px gap
  itemWidth,
  onItemClick,
  selectedItemId,
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

  // Check if consensus sorting is active
  const isConsensusSortActive = sortByConsensus && sortBy === 'consensus' && hasConsensusData;

  // Flatten ALL items across ALL groups into a single continuous array
  // This enables items from different categories to appear in the same row
  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    let globalIndex = 0;

    sortedGroups.forEach(group => {
      (group.items || []).forEach(item => {
        items.push({
          item,
          groupId: group.id,
          globalIndex: globalIndex++,
        });
      });
    });

    return items;
  }, [sortedGroups]);

  // Check if there are any visible items
  const hasVisibleItems = flattenedItems.length > 0;

  // Chunk flattened items into rows and detect category boundaries
  // Boundaries are used to insert visual dividers between categories
  const continuousRows = useMemo(() => {
    const rows: ContinuousRow[] = [];

    for (let i = 0; i < flattenedItems.length; i += columnCount) {
      const rowItems = flattenedItems.slice(i, i + columnCount);

      // Detect category boundaries within this row
      // A boundary exists at index j if item[j] is from a different group than item[j-1]
      const boundaries: number[] = [];
      for (let j = 1; j < rowItems.length; j++) {
        if (rowItems[j].groupId !== rowItems[j - 1].groupId) {
          boundaries.push(j);
        }
      }

      rows.push({
        items: rowItems,
        startIndex: i,
        boundaryIndices: boundaries,
      });
    }

    return rows;
  }, [flattenedItems, columnCount]);

  // Row heights - all rows now have uniform height
  const gap = 8;

  // Initialize virtualizer with dynamic measurement
  // Optimized for smooth scrolling with minimal overscan
  const rowVirtualizer = useVirtualizer({
    count: continuousRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan: 3,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // Memoized item click handler
  const handleItemClick = useCallback((item: CollectionItem) => {
    onItemClick?.(item);
  }, [onItemClick]);

  if (!hasVisibleItems) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: { delay: 0.3, duration: 0.2, ease: [0.16, 1, 0.3, 1] }
        }}
        role="status"
        aria-label="No items available"
        className="h-full flex flex-col items-center justify-center text-slate-500 gap-3"
        data-testid="virtualized-collection-grid-empty"
      >
        <Search className="w-8 h-8 opacity-20 transition-opacity duration-[var(--glass-transition-slow)]" aria-hidden="true" />
        <p className="text-sm transition-colors duration-[var(--glass-transition-normal)]">No items available in this category</p>
        <p className="text-xs text-slate-600 transition-colors duration-[var(--glass-transition-normal)]">Items placed in the grid are hidden here</p>
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
          transition={{ ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-1.5 glass-dock-gradient-border bg-gradient-to-r from-cyan-500/10 to-purple-500/10"
          data-testid="virtualized-consensus-sort-indicator"
        >
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
          <span className="text-[11px] text-cyan-300/80">
            Sorted by community ranking
          </span>
          <Sparkles className="w-3 h-3 text-purple-400/60 ml-auto" aria-hidden="true" />
        </motion.div>
      )}

      {/* Virtualized scroll container - optimized for smooth scrolling */}
      <div
        ref={parentRef}
        role="region"
        aria-label="Collection items - drag items to add them to your ranking"
        tabIndex={0}
        className="overflow-auto glass-dock-focus focus-visible:ring-inset scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-white/[0.02] rounded-lg"
        style={{
          height: containerHeight,
          willChange: 'scroll-position',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.02)',
        }}
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
            const row = continuousRows[virtualRow.index];

            return (
              <div
                key={`row-${virtualRow.index}`}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-testid={`virtualized-items-row-${virtualRow.index}`}
              >
                <div className="flex flex-wrap gap-2 items-center">
                  {row.items.map((flatItem, idx) => {
                    const showDivider = row.boundaryIndices.includes(idx);
                    const quickSelectNum = getQuickSelectNumber?.(flatItem.item.id);
                    const selected = isItemSelected?.(flatItem.item.id) ?? false;
                    const isClickSelected = selectedItemId === flatItem.item.id;

                    return (
                      <React.Fragment key={flatItem.item.id}>
                        {showDivider && <CategoryDivider />}
                        <ItemStatsTooltip itemId={flatItem.item.id}>
                          <div
                            className="relative glass-card-glow"
                            style={{
                              width: itemWidth || 112,
                              contain: 'layout style',
                            }}
                            data-testid={`virtualized-item-cell-${flatItem.item.id}`}
                            onClick={onItemClick ? () => handleItemClick(flatItem.item) : undefined}
                          >
                            <ConfigurableCollectionItem
                              item={flatItem.item}
                              groupId={flatItem.groupId}
                              index={flatItem.globalIndex}
                              searchQuery={searchQuery}
                              isClickSelected={isClickSelected}
                              onClick={onItemClick ? () => handleItemClick(flatItem.item) : undefined}
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
                                transition={{ ease: [0.16, 1, 0.3, 1] }}
                                className="absolute inset-0 rounded-lg glass-dock-selection-ring pointer-events-none z-10"
                                data-testid={`virtualized-quick-select-highlight-${flatItem.item.id}`}
                              />
                            )}
                          </div>
                        </ItemStatsTooltip>
                      </React.Fragment>
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
