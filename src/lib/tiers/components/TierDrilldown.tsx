'use client';

/**
 * TierDrilldown
 * Expandable view showing items within each tier
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition, TierStats } from '../types';
import { ChevronDown, ChevronRight, Search, Grid, List, SortAsc, SortDesc } from 'lucide-react';

/**
 * Item display data
 */
export interface DrilldownItem {
  id: string;
  title: string;
  description?: string;
  image_url?: string | null;
  position: number;
  tierRank: number;
  percentile: number;
  metadata?: Record<string, unknown>;
}

/**
 * Sort options
 */
type SortBy = 'position' | 'name' | 'tierRank';
type SortOrder = 'asc' | 'desc';

/**
 * Drilldown data per tier
 */
export interface TierDrilldownData {
  tier: TierDefinition;
  stats: TierStats;
  items?: DrilldownItem[];
}

interface TierDrilldownProps {
  /** Drilldown data with items */
  data: TierDrilldownData[];
  /** Initially expanded tier IDs */
  initialExpanded?: string[];
  /** View mode */
  viewMode?: 'list' | 'grid';
  /** Enable search */
  enableSearch?: boolean;
  /** Enable sorting */
  enableSort?: boolean;
  /** Called when item is clicked */
  onItemClick?: (item: DrilldownItem, tier: TierDefinition) => void;
  /** Max items to show before "show more" */
  maxItemsVisible?: number;
  /** Custom class name */
  className?: string;
}

/**
 * Individual item in list view
 */
const ListItem = memo(function ListItem({
  item,
  tier,
  onClick,
}: {
  item: DrilldownItem;
  tier: TierDefinition;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'bg-background/50 border border-border/50',
        'hover:border-primary/30 hover:bg-background/80',
        'transition-colors cursor-pointer'
      )}
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Position badge */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: `${tier.color.primary}20`,
          color: tier.color.primary,
        }}
      >
        #{item.position + 1}
      </div>

      {/* Image */}
      {item.image_url && (
        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-muted">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title and description */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.title}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground truncate">
            {item.description}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">
          Top {100 - item.percentile}%
        </div>
        <div className="text-xs text-muted-foreground">
          #{item.tierRank} in tier
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Individual item in grid view
 */
const GridItem = memo(function GridItem({
  item,
  tier,
  onClick,
}: {
  item: DrilldownItem;
  tier: TierDefinition;
  onClick?: () => void;
}) {
  return (
    <motion.div
      className={cn(
        'relative rounded-lg overflow-hidden',
        'border border-border/50 bg-background/50',
        'hover:border-primary/30 hover:shadow-lg',
        'transition-all cursor-pointer'
      )}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -2 }}
    >
      {/* Image or placeholder */}
      <div className="aspect-square bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold opacity-10">
            {item.title.charAt(0)}
          </div>
        )}
      </div>

      {/* Position badge */}
      <div
        className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold"
        style={{
          background: tier.color.primary,
          color: tier.color.text,
        }}
      >
        #{item.position + 1}
      </div>

      {/* Title bar */}
      <div className="p-2">
        <div className="font-medium text-sm truncate">{item.title}</div>
        <div className="text-xs text-muted-foreground">
          Top {100 - item.percentile}%
        </div>
      </div>
    </motion.div>
  );
});

/**
 * Expandable tier section
 */
const TierSection = memo(function TierSection({
  tier,
  stats,
  items,
  isExpanded,
  onToggle,
  viewMode,
  sortBy,
  sortOrder,
  onItemClick,
  maxItemsVisible,
}: {
  tier: TierDefinition;
  stats: TierStats;
  items: DrilldownItem[];
  isExpanded: boolean;
  onToggle: () => void;
  viewMode: 'list' | 'grid';
  sortBy: SortBy;
  sortOrder: SortOrder;
  onItemClick?: (item: DrilldownItem) => void;
  maxItemsVisible: number;
}) {
  const [showAll, setShowAll] = useState(false);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'tierRank':
          comparison = a.tierRank - b.tierRank;
          break;
        case 'position':
        default:
          comparison = a.position - b.position;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [items, sortBy, sortOrder]);

  // Visible items
  const visibleItems = showAll
    ? sortedItems
    : sortedItems.slice(0, maxItemsVisible);
  const hasMore = sortedItems.length > maxItemsVisible;

  return (
    <motion.div
      className="border rounded-xl overflow-hidden"
      initial={false}
      animate={{
        borderColor: isExpanded ? tier.color.primary : 'var(--border)',
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 p-3 transition-colors',
          'hover:bg-muted/50'
        )}
      >
        {/* Expand icon */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        {/* Tier label */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
          style={{
            background: tier.color.gradient,
            color: tier.color.text,
          }}
        >
          {tier.label}
        </div>

        {/* Tier info */}
        <div className="flex-1 text-left">
          <div className="font-medium">{tier.displayName}</div>
          <div className="text-sm text-muted-foreground">
            {stats.filledCount} items • {stats.percentage}% filled
          </div>
        </div>

        {/* Quick stats */}
        <div className="text-right">
          <div className="text-2xl font-bold">{stats.filledCount}</div>
          <div className="text-xs text-muted-foreground">of {stats.itemCount}</div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="p-4 border-t"
              style={{
                background: `${tier.color.primary}05`,
              }}
            >
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items in this tier yet
                </div>
              ) : (
                <>
                  {viewMode === 'list' ? (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {visibleItems.map((item) => (
                          <ListItem
                            key={item.id}
                            item={item}
                            tier={tier}
                            onClick={() => onItemClick?.(item)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      <AnimatePresence>
                        {visibleItems.map((item) => (
                          <GridItem
                            key={item.id}
                            item={item}
                            tier={tier}
                            onClick={() => onItemClick?.(item)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Show more button */}
                  {hasMore && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="w-full mt-3 py-2 text-sm text-primary hover:underline"
                    >
                      {showAll
                        ? 'Show less'
                        : `Show ${sortedItems.length - maxItemsVisible} more`}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * TierDrilldown component
 */
export const TierDrilldown = memo(function TierDrilldown({
  data,
  initialExpanded = [],
  viewMode: initialViewMode = 'list',
  enableSearch = true,
  enableSort = true,
  onItemClick,
  maxItemsVisible = 10,
  className,
}: TierDrilldownProps) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(
    new Set(initialExpanded)
  );
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Toggle tier expansion
  const toggleTier = useCallback((tierId: string) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tierId)) {
        next.delete(tierId);
      } else {
        next.add(tierId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    setExpandedTiers(new Set(data.map((d) => d.tier.id)));
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpandedTiers(new Set());
  }, []);

  // Filter items by search
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    const query = searchQuery.toLowerCase();
    return data.map((d) => ({
      ...d,
      items: d.items?.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      ),
    }));
  }, [data, searchQuery]);

  // Toggle sort order
  const toggleSort = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {enableSearch && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded',
              viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded',
              viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Sort options */}
        {enableSort && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleSort('position')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border',
                sortBy === 'position'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted'
              )}
            >
              Position {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={cn(
                'px-3 py-1.5 text-xs rounded-lg border',
                sortBy === 'name'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'hover:bg-muted'
              )}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        )}

        {/* Expand/Collapse all */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Tier sections */}
      <div className="space-y-3">
        {filteredData.map((tierData) => (
          <TierSection
            key={tierData.tier.id}
            tier={tierData.tier}
            stats={tierData.stats}
            items={tierData.items || []}
            isExpanded={expandedTiers.has(tierData.tier.id)}
            onToggle={() => toggleTier(tierData.tier.id)}
            viewMode={viewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onItemClick={(item) => onItemClick?.(item, tierData.tier)}
            maxItemsVisible={maxItemsVisible}
          />
        ))}
      </div>
    </div>
  );
});

export default TierDrilldown;
