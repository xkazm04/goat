"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemCard } from '@/components/ui/item-card';
import { CollectionItem as CollectionItemType } from '../types';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SortableCollectionItemProps {
  item: CollectionItemType;
  groupId: string;
  viewMode?: 'grid' | 'list';
  index?: number;
  isSpotlight?: boolean;
}

/**
 * Sortable collection item component for reordering within CollectionPanel
 * Uses @dnd-kit/sortable for smooth, animated reordering
 * Supports easter egg spotlight effect with tooltip
 */
export function SortableCollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0,
  isSpotlight = false,
}: SortableCollectionItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative ${isSpotlight ? 'spotlight-active' : ''}`}
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
      />
    </div>
  );
}
