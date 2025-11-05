"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { BacklogItemNew } from "@/types/backlog-groups";
import { useItemStore } from "@/stores/item-store";
import { Image as ImageIcon } from "lucide-react";

interface CollectionItemProps {
  item: BacklogItemNew;
  groupId: string;
}

/**
 * CollectionItem - Individual item card with drag & drop support
 *
 * Compact item display optimized for grid layout
 * - Drag & drop to grid
 * - Double-click to assign
 * - Image preview
 * - Matched state indication
 */
export function CollectionItem({ item, groupId }: CollectionItemProps) {
  const itemStore = useItemStore();
  const activeItem = itemStore.activeItem;

  // Normalize item to BacklogItemType
  const normalizedItem = useMemo(() => {
    const title = item.name || '';
    return {
      id: item.id,
      title,
      name: title,
      description: item.description || '',
      category: item.category,
      subcategory: item.subcategory,
      item_year: item.item_year,
      item_year_to: item.item_year_to,
      created_at: item.created_at,
      matched: false,
      tags: [],
      image_url: item.image_url
    };
  }, [item]);

  // Check if already assigned to grid
  const isAssignedToGrid = useMemo(() => {
    const gridItems = itemStore.gridItems || [];
    return gridItems.some(gi => gi && gi.id === normalizedItem.id);
  }, [itemStore.gridItems, normalizedItem.id]);

  const isDragging = useMemo(() =>
    activeItem !== null && activeItem === normalizedItem.id,
    [activeItem, normalizedItem.id]
  );

  // Draggable setup - use same pattern as BacklogItem (no prefix)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: normalizedItem.id,
    data: {
      type: 'backlog-item',
      item: normalizedItem,
      groupId
    },
    disabled: isAssignedToGrid
  });

  // Double-click to assign
  const handleDoubleClick = useCallback(() => {
    if (!isAssignedToGrid) {
      const nextPosition = itemStore.getNextAvailableGridPosition();
      if (nextPosition !== null) {
        itemStore.assignItemToGrid(normalizedItem, nextPosition);
      }
    }
  }, [isAssignedToGrid, itemStore, normalizedItem]);

  // Transform for drag
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={handleDoubleClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{
        scale: isAssignedToGrid ? 1 : 1.08,
        y: isAssignedToGrid ? 0 : -4,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: isAssignedToGrid ? 1 : 0.95 }}
      className={`group relative aspect-square rounded-lg overflow-hidden transition-all ${
        isAssignedToGrid
          ? 'opacity-40 cursor-not-allowed grayscale'
          : isDragging
          ? 'opacity-50 scale-95 cursor-grabbing'
          : 'cursor-grab hover:shadow-xl hover:shadow-cyan-500/25'
      }`}
    >
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border border-gray-700/50 group-hover:border-cyan-500/40 transition-colors" />

      {/* Image or Placeholder */}
      {normalizedItem.image_url ? (
        <img
          src={normalizedItem.image_url}
          alt={normalizedItem.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <ImageIcon className="w-4 h-4 text-gray-600 group-hover:text-gray-500 transition-colors" />
        </div>
      )}

      {/* Overlay gradient for text readability - enhanced on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all" />

      {/* Item title - improved typography */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <p className="text-[10px] font-semibold text-white truncate leading-tight drop-shadow-lg">
          {normalizedItem.title}
        </p>
      </div>

      {/* Assigned indicator with pulse animation */}
      {isAssignedToGrid && (
        <div className="absolute top-1 right-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4 h-4 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center border border-cyan-300 shadow-lg shadow-cyan-500/50"
          >
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* Hover glow effect - enhanced */}
      {!isAssignedToGrid && !isDragging && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 via-blue-500/10 to-transparent pointer-events-none"
          />
          {/* Top highlight */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none"
          />
        </>
      )}

      {/* Dragging indicator with border pulse */}
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-cyan-500/40 border-2 border-cyan-400 rounded-lg pointer-events-none"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-cyan-400/20 rounded-lg"
          />
        </motion.div>
      )}

      {/* Drag hint tooltip on hover */}
      {!isAssignedToGrid && !isDragging && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[8px] text-cyan-400 font-medium pointer-events-none"
        >
          Drag or Double-click
        </motion.div>
      )}
    </motion.div>
  );
}
