'use client';

/**
 * ComparisonDrawer
 * Figma-style floating PiP panel for pinning 2-3 items
 * for side-by-side evaluation while browsing the backlog.
 *
 * Uses the existing PictureInPicture component for drag/dock/resize,
 * and the comparison store for item state management.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X, Plus } from 'lucide-react';
import React, { memo, useCallback, useMemo } from 'react';

import { PictureInPicture } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { useBacklogStore } from '@/stores/backlog-store';
import {
  useComparisonStore,
  MAX_COMPARISON_ITEMS,
} from '@/stores/comparison-store';
import { useGridStore } from '@/stores/grid-store';

import type { BacklogItem } from '@/types/backlog-groups';
import type { BacklogItemType } from '@/types/match';


// ─── ComparisonDrawer ────────────────────────────────────────────────────────

export function ComparisonDrawer() {
  const items = useComparisonStore((s) => s.items);
  const isOpen = useComparisonStore((s) => s.isOpen);
  const closeStore = useComparisonStore((s) => s.close);
  const clearAll = useComparisonStore((s) => s.clearAll);

  if (!isOpen || items.length === 0) return null;

  return (
    <PictureInPicture
      title={`Compare (${items.length}/${MAX_COMPARISON_ITEMS})`}
      showClose
      showDockButtons
      onClose={closeStore}
      minSize={{ width: 280, height: 200 }}
      maxSize={{ width: 700, height: 480 }}
      config={{
        enabled: true,
        size: { width: 420, height: 340 },
        dockPosition: 'bottom-right',
        isDocked: true,
        opacity: 0.97,
        showControls: true,
      }}
      className="comparison-drawer"
    >
      <ComparisonDrawerContent
        items={items}
        onClear={clearAll}
      />
    </PictureInPicture>
  );
}

// ─── Drawer Content ──────────────────────────────────────────────────────────

interface ComparisonDrawerContentProps {
  items: BacklogItemType[];
  onClear: () => void;
}

const ComparisonDrawerContent = memo(function ComparisonDrawerContent({
  items,
  onClear,
}: ComparisonDrawerContentProps) {
  const removeItem = useComparisonStore((s) => s.removeItem);
  const assignItemToGrid = useGridStore((s) => s.assignItemToGrid);
  const gridItems = useGridStore((s) => s.gridItems);
  const markItemAsUsed = useBacklogStore((s) => s.markItemAsUsed);

  // Find the first empty grid slot
  const firstEmptySlot = useMemo(() => {
    return gridItems.findIndex((item) => !item.matched);
  }, [gridItems]);

  const handleAssign = useCallback(
    (item: BacklogItemType) => {
      if (firstEmptySlot === -1) return;
      // Coerce to BacklogItem (name is required there but optional on BacklogItemType)
      const backlogItem: BacklogItem = {
        ...item,
        name: item.name || item.title,
      };
      assignItemToGrid(backlogItem, firstEmptySlot);
      markItemAsUsed(item.id, true);
      removeItem(item.id);
    },
    [firstEmptySlot, assignItemToGrid, markItemAsUsed, removeItem]
  );

  const handleRemove = useCallback(
    (itemId: string) => {
      removeItem(itemId);
    },
    [removeItem]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Items row */}
      <div className="flex-1 overflow-auto p-2">
        <div
          className={cn(
            'grid gap-2 h-full',
            items.length === 1 && 'grid-cols-1',
            items.length === 2 && 'grid-cols-2',
            items.length >= 3 && 'grid-cols-3'
          )}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <ComparisonCard
                key={item.id}
                item={item}
                canAssign={firstEmptySlot !== -1}
                onAssign={() => handleAssign(item)}
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/30">
        <span className="text-2xs text-muted-foreground">
          Pin items to compare side-by-side
        </span>
        <button
          onClick={onClear}
          className="text-2xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  );
});

// ─── Comparison Card ─────────────────────────────────────────────────────────

interface ComparisonCardProps {
  item: BacklogItemType;
  canAssign: boolean;
  onAssign: () => void;
  onRemove: () => void;
}

const ComparisonCard = memo(function ComparisonCard({
  item,
  canAssign,
  onAssign,
  onRemove,
}: ComparisonCardProps) {
  const title = item.title || item.name || 'Untitled';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative flex flex-col rounded-md overflow-hidden',
        'bg-card/80 border border-border/60',
        'group'
      )}
    >
      {/* Image */}
      <div className="relative w-full aspect-[3/4] bg-muted/40 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={onRemove}
          className={cn(
            'absolute top-1 right-1 w-5 h-5 rounded-full',
            'bg-black/60 backdrop-blur-sm',
            'flex items-center justify-center',
            'text-white/70 hover:text-white hover:bg-red-500/80',
            'opacity-0 group-hover:opacity-100 transition-all',
            'z-10'
          )}
          title="Unpin"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Year badge */}
        {item.item_year && (
          <span className="absolute bottom-1 left-1 text-2xs px-1 py-0.5 rounded bg-black/50 text-white/80 backdrop-blur-sm">
            {item.item_year}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-1.5 py-1 flex-1 min-h-0">
        <p className="text-xs font-medium leading-tight line-clamp-2 text-foreground">
          {title}
        </p>
        {item.category && (
          <p className="text-2xs text-muted-foreground mt-0.5 truncate">
            {item.category}
          </p>
        )}
      </div>

      {/* Quick assign button */}
      <button
        onClick={onAssign}
        disabled={!canAssign}
        className={cn(
          'flex items-center justify-center gap-1 w-full py-1',
          'text-2xs font-medium border-t border-border/40',
          'transition-colors',
          canAssign
            ? 'text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300'
            : 'text-muted-foreground/50 cursor-not-allowed'
        )}
        title={canAssign ? 'Assign to next empty slot' : 'Grid is full'}
      >
        <Plus className="w-3 h-3" />
        Assign
      </button>
    </motion.div>
  );
});

// ─── Pin Button (for use on item cards in the backlog) ───────────────────────

interface ComparisonPinButtonProps {
  item: BacklogItemType;
  className?: string;
  size?: 'sm' | 'md';
}

export const ComparisonPinButton = memo(function ComparisonPinButton({
  item,
  className,
  size = 'sm',
}: ComparisonPinButtonProps) {
  const toggleItem = useComparisonStore((s) => s.toggleItem);
  const isInComparison = useComparisonStore((s) => s.items.some((i) => i.id === item.id));
  const canAddMore = useComparisonStore((s) => s.selectedForComparison.length < MAX_COMPARISON_ITEMS);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isInComparison || canAddMore) {
        toggleItem(item);
      }
    },
    [isInComparison, canAddMore, item, toggleItem]
  );

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={!isInComparison && !canAddMore}
      className={cn(
        'flex items-center justify-center rounded-lg',
        'backdrop-blur-xs border transition-colors',
        btnSize,
        isInComparison
          ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
          : canAddMore
            ? 'bg-gray-900/80 text-gray-300 border-gray-600/50 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30'
            : 'bg-gray-900/50 text-gray-600 border-gray-700/30 cursor-not-allowed',
        className
      )}
      title={
        isInComparison
          ? 'Unpin from comparison'
          : canAddMore
            ? 'Pin to comparison drawer'
            : 'Comparison drawer full'
      }
      aria-label={isInComparison ? 'Unpin from comparison' : 'Pin to comparison'}
    >
      <Pin className={cn(iconSize, isInComparison && 'fill-current')} />
    </motion.button>
  );
});

export default ComparisonDrawer;
