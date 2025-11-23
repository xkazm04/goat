"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { StarRating } from "@/components/ui/star-rating";
import { CollectionItem as CollectionItemType } from "../types";
import { useState } from "react";
import { Sparkles } from "lucide-react";
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
 * Supports both grid and list view modes
 * Now uses the reusable ItemCard component
 * Supports easter egg spotlight effect with tooltip
 */
export function CollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  isSpotlight = false
}: CollectionItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative ${isSpotlight ? 'spotlight-active' : ''}`}
      onMouseEnter={() => isSpotlight && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid={isSpotlight ? "collection-item-spotlight" : undefined}
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







