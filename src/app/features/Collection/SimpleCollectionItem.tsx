"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { CollectionItem } from "./types";
import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";

interface SimpleCollectionItemProps {
  item: CollectionItem;
  groupId: string;
}

/**
 * Minimal draggable item - no animations, no complexity
 * Just pure drag and drop functionality
 * Now uses the reusable ItemCard component with progressive image loading
 * and Wikipedia fallback for missing images
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

  // Progressive image loading with wiki fallback
  const {
    imageUrl: currentImageUrl,
    isFetching: isLoadingWiki,
  } = useProgressiveWikiImage({
    
    itemTitle: item.title,
    existingImage: item.image_url,
    autoFetch: true,
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
        image={currentImageUrl}
        layout="grid"
        interactive="draggable"
        state={isDragging ? "dragging" : "default"}
        animated={false}
        progressive={true}
        ariaLabel={`Draggable item: ${item.title}`}
        ariaDescription={item.description}
        testId={`simple-collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
        loading={isLoadingWiki}
      />
    </div>
  );
}
