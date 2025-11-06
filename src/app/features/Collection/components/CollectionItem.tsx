"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
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

  if (viewMode === 'list') {
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        {...attributes}
        {...listeners}
        className={`
          flex items-center gap-3 p-2 rounded-lg
          bg-gray-800/60 border border-gray-700/50
          cursor-grab active:cursor-grabbing
          transition-all hover:border-cyan-500/50 hover:bg-gray-800
          ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        `}
      >
        {/* Image thumbnail */}
        {item.image_url ? (
          <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-900">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-xs text-gray-600">No Image</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.01 }}
      {...attributes}
      {...listeners}
      className={`
        relative aspect-square rounded-lg overflow-hidden
        bg-gray-800 border border-gray-700
        cursor-grab active:cursor-grabbing
        transition-all
        ${isDragging 
          ? 'opacity-50 scale-95 z-50' 
          : 'opacity-100 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20'
        }
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
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2">
        <p className="text-[10px] font-semibold text-white truncate">
          {item.title}
        </p>
      </div>

      {/* Hover indicator */}
      <div className="absolute inset-0 bg-cyan-500/0 hover:bg-cyan-500/10 transition-colors pointer-events-none" />
    </motion.div>
  );
}

