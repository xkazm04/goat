"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { StarRating } from "@/components/ui/star-rating";
import { CollectionItem as CollectionItemType } from "../types";
import { useState, useCallback } from "react";
import { Sparkles, GripVertical } from "lucide-react";
import { AverageRankingBadge } from "./AverageRankingBadge";

interface CollectionItemProps {
  item: CollectionItemType;
  groupId: string;
  viewMode?: 'grid' | 'list';
  index?: number;
  isSpotlight?: boolean; // Whether this item is the spotlighted easter egg item
}

/**
 * Draggable collection item component
 *
 * Features:
 * - Supports both grid and list view modes
 * - Uses the reusable ItemCard component
 * - Keyboard accessible with focus rings
 * - Screen reader support with aria labels
 * - Easter egg spotlight effect with tooltip
 */
export function CollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  isSpotlight = false
}: CollectionItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId,
      index,
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : isFocused ? 10 : 'auto',
  } : {
    zIndex: isFocused ? 10 : 'auto',
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Show drag handle on focus or drag
  const showDragHandle = isFocused || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSpotlight ? 'spotlight-active' : ''} ${isDragging ? 'z-50' : ''}`}
      onMouseEnter={() => isSpotlight && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid={isSpotlight ? "collection-item-spotlight" : `collection-item-wrapper-${item.id}`}
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

      {/* Focusable drag area */}
      <div
        {...attributes}
        {...listeners}
        tabIndex={0}
        role="button"
        aria-roledescription="draggable"
        aria-describedby={`draggable-instructions-${item.id}`}
        aria-label={`Drag ${item.title} to a grid position. Press Space or Enter to start dragging.`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          absolute inset-0 z-10
          cursor-grab active:cursor-grabbing
          focus:outline-none
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        data-testid={`draggable-handle-${item.id}`}
      >
        {/* Hidden instructions for screen readers */}
        <span id={`draggable-instructions-${item.id}`} className="sr-only">
          Press Space or Enter to start dragging this item. Use arrow keys to navigate to a drop target.
          Press Space or Enter to drop, or Escape to cancel.
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

      {/* Average Ranking Badge - shows live ranking data */}
      {!isDragging && (
        <AverageRankingBadge
          itemId={item.id}
          position="top-left"
          variant="compact"
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
        ariaLabel={`Draggable item: ${item.title}${isSpotlight ? ' - Hidden item spotlight!' : ''}`}
        ariaDescription={item.description || `${item.title} from ${groupId}`}
        testId={`collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
        tabIndex={-1}
        actions={
          item.ranking !== undefined && item.ranking > 0 ? (
            <StarRating
              value={item.ranking}
              size="sm"
              testId={`item-ranking-${item.id}`}
            />
          ) : null
        }
        actionsPosition={viewMode === 'list' ? 'top-right' : 'top-right'}
      />
    </div>
  );
}
