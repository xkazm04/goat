"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemCard } from '@/components/ui/item-card';
import { CollectionItem as CollectionItemType } from '../types';
import { useState, useCallback } from 'react';
import { DragHandleIndicator } from './DragHandleIndicator';
import { FocusRingOverlay } from './FocusRingOverlay';
import { SpotlightTooltip } from './SpotlightTooltip';

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
      <SpotlightTooltip visible={isSpotlight && showTooltip} />

      {/* Keyboard drag handle indicator - shows on focus */}
      <DragHandleIndicator
        itemId={item.id}
        isDragging={isDragging}
        visible={showDragHandle}
      />

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
      <FocusRingOverlay
        itemId={item.id}
        isFocused={isFocused}
        isDragging={isDragging}
      />

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
