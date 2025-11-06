"use client";

import { useDraggable } from "@dnd-kit/core";
import { CollectionItem } from "./types";


interface SimpleCollectionItemProps {
  item: CollectionItem;
  groupId: string;
}

/**
 * Minimal draggable item - no animations, no complexity
 * Just pure drag and drop functionality
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
      className={`
        relative aspect-square rounded-lg overflow-hidden
        bg-gray-800 border border-gray-700
        cursor-grab active:cursor-grabbing
        transition-opacity
        ${isDragging ? 'opacity-50' : 'opacity-100 hover:border-cyan-500'}
      `}
    >
      {/* Image */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <span className="text-xs text-gray-500">No Image</span>
        </div>
      )}

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="text-[10px] font-semibold text-white truncate">
          {item.title}
        </p>
      </div>
    </div>
  );
}
