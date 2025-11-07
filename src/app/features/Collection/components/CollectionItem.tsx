"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { CollectionItem as CollectionItemType } from "../types";

interface CollectionItemProps {
  item: CollectionItemType;
  groupId: string;
  viewMode?: 'grid' | 'list';
  index?: number;
}

/**
 * Draggable collection item component
 * Supports both grid and list view modes
 * Now uses the reusable ItemCard component
 */
export function CollectionItem({
  item,
  groupId,
  viewMode = 'grid',
  index = 0
}: CollectionItemProps) {
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
    >
      <ItemCard
        title={item.title}
        subtitle={item.description}
        image={item.image_url}
        layout={viewMode}
        interactive="draggable"
        state={isDragging ? "dragging" : "default"}
        animated={true}
        animationDelay={viewMode === 'list' ? index * 0.02 : index * 0.01}
        ariaLabel={`Draggable item: ${item.title}`}
        ariaDescription={item.description || `${item.title} from ${groupId}`}
        testId={`collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
      />
    </div>
  );
}



