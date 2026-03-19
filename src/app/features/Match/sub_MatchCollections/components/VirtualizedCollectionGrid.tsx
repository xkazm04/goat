"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { DURATION } from "@/lib/animations/motion-presets";
import { TrendingUp, Sparkles } from "lucide-react";
import { CategoryEmptyState } from "@/components/illustrations/EmptyStateIllustrations";
import { CollectionItem } from "@/app/features/Collection/types";
import { ConfigurableCollectionItem, MATCH_VIEW_CONFIG, type HoistedStoreState } from "@/app/features/Collection/components/ConfigurableCollectionItem";
import { useConsensusStore, useConsensusSortBy } from "@/stores/consensus-store";
import { useListStore } from "@/stores/use-list-store";
import { useCriteriaStore } from "@/stores/criteria-store";
import { QuickSelectBadge } from "../../sub_ItemBadges/QuickSelectBadge";
import { ItemStatsTooltip } from "../../sub_ItemBadges/ItemStatsTooltip";
import { createSortComparator, type SortConfig } from "@/lib/sorting";
import {
  VirtualizedCollectionGridProps,
  generateSortCacheKey,
  flattenGroups,
  chunkIntoRows,
} from "./virtualizedGridTypes";

/**
 * Virtualized grid display for collection items.
 * Renders only visible items for performance.
 */
export function VirtualizedCollectionGrid({
  displayGroups,
  searchQuery = "",
  sortByConsensus = true,
  getQuickSelectNumber,
  isItemSelected,
  columnCount = 6,
  containerHeight = 280,
  rowHeight = 158,
  itemWidth = 120,
  onItemClick,
  selectedItemId,
  category,
}: VirtualizedCollectionGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const listCategory = useListStore((s) => s.currentList?.category);
  const sortBy = useConsensusSortBy();
  const consensusViewMode = useConsensusStore((s) => s.viewMode);
  const consensusLastFetched = useConsensusStore((s) => s.lastFetched);
  const hasConsensusData = useConsensusStore((s) => Object.keys(s.consensusData).length > 0);
  const activeProfileId = useCriteriaStore((s) => s.activeProfileId);

  // Hoist global store state to avoid per-item subscriptions in ConfigurableCollectionItem
  const hoistedState = useMemo<HoistedStoreState>(() => ({
    consensusViewMode,
    consensusSortBy: sortBy,
    activeProfileId,
    listCategory,
  }), [consensusViewMode, sortBy, activeProfileId, listCategory]);

  const sortCacheKey = useMemo(
    () => generateSortCacheKey(displayGroups, consensusLastFetched),
    [displayGroups, consensusLastFetched]
  );

  const sortedGroups = useMemo(() => {
    if (!sortByConsensus || sortBy !== 'consensus' || !hasConsensusData) return displayGroups;

    const currentConsensus = useConsensusStore.getState().consensusData;
    const sortConfig: SortConfig = {
      criteria: 'consensus', direction: 'asc',
      secondaryCriteria: 'alphabetical', secondaryDirection: 'asc',
    };
    const comparator = createSortComparator<CollectionItem>(sortConfig, (id) => currentConsensus[id] ?? null);

    return displayGroups.map(group => ({
      ...group,
      items: [...(group.items || [])].sort(comparator),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortCacheKey, sortByConsensus, sortBy, hasConsensusData]);

  const isConsensusSortActive = sortByConsensus && sortBy === 'consensus' && hasConsensusData;
  const flattenedItems = useMemo(() => flattenGroups(sortedGroups), [sortedGroups]);
  const continuousRows = useMemo(() => chunkIntoRows(flattenedItems, columnCount), [flattenedItems, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: continuousRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + 8,
    overscan: 3,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  const handleItemClick = useCallback((item: CollectionItem) => onItemClick?.(item), [onItemClick]);

  if (flattenedItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.3, duration: DURATION.fast } }}
        className="h-full flex flex-col items-center justify-center text-slate-500 gap-3"
        data-testid="virtualized-collection-grid-empty"
      >
        <CategoryEmptyState category={category || listCategory} width={140} height={112} />
        <p className="text-sm font-medium text-slate-400 font-grotesk">No items available in this category</p>
        <p className="text-xs text-slate-600 font-sans">Try selecting a different category</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2" data-testid="virtualized-collection-grid">
      {isConsensusSortActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 glass-dock-gradient-border bg-linear-to-r from-brand/10 to-purple-500/10"
        >
          <TrendingUp className="w-3.5 h-3.5 text-brand-hover" />
          <span className="text-xs text-brand-hover/80">Sorted by community ranking</span>
          <Sparkles className="w-3 h-3 text-purple-400/60 ml-auto" />
        </motion.div>
      )}

      <div
        ref={parentRef}
        className="overflow-auto glass-dock-focus scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-white/[0.02] rounded-card"
        style={{ height: containerHeight, willChange: 'scroll-position', background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)' }}
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = continuousRows[virtualRow.index];
            return (
              <div
                key={`row-${virtualRow.index}`}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
              >
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columnCount}, ${itemWidth}px)` }}>
                  {row.items.map((flatItem, idx) => {
                    const showDivider = row.boundaryIndices.includes(idx);
                    const quickSelectNum = getQuickSelectNumber?.(flatItem.item.id);
                    const selected = isItemSelected?.(flatItem.item.id) ?? false;
                    const isClickSelected = selectedItemId === flatItem.item.id;

                    return (
                      <ItemStatsTooltip key={flatItem.item.id} itemId={flatItem.item.id}>
                        <div
                          className={`relative glass-card-glow ${showDivider ? 'border-l-2 border-brand/30 pl-1' : ''}`}
                          style={{ contain: 'layout style' }}
                          onClick={onItemClick ? () => handleItemClick(flatItem.item) : undefined}
                        >
                          <ConfigurableCollectionItem
                            item={flatItem.item} groupId={flatItem.groupId} index={flatItem.globalIndex}
                            searchQuery={searchQuery} isClickSelected={isClickSelected}
                            onClick={onItemClick ? () => handleItemClick(flatItem.item) : undefined}
                            config={MATCH_VIEW_CONFIG}
                            hoistedState={hoistedState}
                          />
                          <AnimatePresence>
                            {quickSelectNum != null && (
                              <QuickSelectBadge number={quickSelectNum} isSelected={selected} size="sm" position="top-left" />
                            )}
                          </AnimatePresence>
                          {(selected || isClickSelected) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                              className="absolute inset-0 rounded-card glass-dock-selection-ring pointer-events-none z-10"
                            />
                          )}
                        </div>
                      </ItemStatsTooltip>
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
