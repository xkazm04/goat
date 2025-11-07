"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { CollectionItem } from "./types";

interface SimpleCollectionItemProps {
  item: CollectionItem;
  groupId: string;
}

/**
 * Minimal draggable item - no animations, no complexity
 * Just pure drag and drop functionality
 * Now uses the reusable ItemCard component
 */
export function SimpleCollectionItem({ item, groupId }: SimpleCollectionItemProps) {
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
        image={item.image_url}
        layout="grid"
        interactive="draggable"
        state={isDragging ? "dragging" : "default"}
        animated={false}
        ariaLabel={`Draggable item: ${item.title}`}
        testId={`simple-collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
      />
    </div>
  );
}
