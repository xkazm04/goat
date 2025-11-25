"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemCard } from '@/components/ui/item-card';
import { CollectionItem as CollectionItemType } from '../types';
import { useState, useCallback } from 'react';
import { Sparkles, GripVertical } from 'lucide-react';

interface SortableCollectionItemProps {
  item: CollectionItemType;
  groupId: string;
  viewMode?: 'grid' | 'list';
  index?: number;
  isSpotlight?: boolean;
}

/**
 * Sortable collection item component for reordering within CollectionPanel
 *
 * Features:
 * - @dnd-kit/sortable for smooth, animated reordering
 * - Full keyboard support (Space/Enter to grab, arrow keys to move, Escape to cancel)
 * - Visible focus rings for keyboard navigation
 * - Screen reader announcements via parent DndContext
 * - Drag handle indicator on focus/hover
 * - Easter egg spotlight effect with tooltip
 */
export function SortableCollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  isSpotlight = false,
}: SortableCollectionItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
    isOver,
  } = useSortable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isFocused ? 10 : 'auto',
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Determine if we should show the drag handle indicator
  const showDragHandle = isFocused || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group
        ${isSpotlight ? 'spotlight-active' : ''}
        ${isDragging ? 'z-50' : ''}
        ${isOver ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}
      onMouseEnter={() => isSpotlight && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid={isSpotlight ? "sortable-collection-item-spotlight" : `sortable-collection-item-${item.id}`}
    >
      {/* Easter egg tooltip */}
      {isSpotlight && showTooltip && (
        <div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-20 flex items-center gap-1.5"
          data-testid="spotlight-tooltip"
          role="tooltip"
        >
          <Sparkles className="w-3 h-3" />
          You found the hidden tag!
        </div>
      )}

      {/* Keyboard drag handle indicator - shows on focus */}
      {showDragHandle && (
        <div
          className={`
            absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full
            flex items-center justify-center
            w-6 h-6 rounded
            bg-cyan-500/90 text-white
            shadow-lg shadow-cyan-500/30
            transition-opacity duration-150
            ${isDragging ? 'opacity-100' : 'opacity-80'}
            z-30
          `}
          aria-hidden="true"
          data-testid={`drag-handle-indicator-${item.id}`}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Focusable drag handle - captures keyboard events */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        tabIndex={0}
        role="button"
        aria-roledescription="sortable"
        aria-describedby={`sortable-instructions-${item.id}`}
        aria-label={`Reorder ${item.title}. Position ${index + 1}. Press Space or Enter to pick up.`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          absolute inset-0 z-10
          cursor-grab active:cursor-grabbing
          focus:outline-none
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        data-testid={`sortable-drag-handle-${item.id}`}
      >
        {/* Hidden instructions for screen readers */}
        <span id={`sortable-instructions-${item.id}`} className="sr-only">
          Press Space or Enter to pick up this item. While holding, use arrow keys to move it.
          Press Space or Enter again to drop, or Escape to cancel.
        </span>
      </div>

      {/* Focus ring overlay */}
      {isFocused && !isDragging && (
        <div
          className="absolute inset-0 rounded-lg ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 pointer-events-none z-20"
          aria-hidden="true"
          data-testid={`focus-ring-${item.id}`}
        />
      )}

      <ItemCard
        title={item.title}
        subtitle={item.description}
        image={item.image_url}
        layout={viewMode}
        interactive="draggable"
        state={isDragging ? "dragging" : "default"}
        animated={true}
        animationDelay={viewMode === 'list' ? index * 0.02 : index * 0.01}
        ariaLabel={`Reorderable item: ${item.title}${isSpotlight ? ' - Hidden item spotlight!' : ''}`}
        ariaDescription={item.description || `${item.title} from ${groupId}`}
        testId={`collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
        tabIndex={-1}
      />
    </div>
  );
}
