"use client";

import { GridItemType } from "@/app/types/match";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useItemStore } from "@/app/stores/item-store";
import MatchGridItemControls from "@/app/features/Match/MatchGridItemControls";
import { useSizeClasses } from "@/app/config/matchStructure";
import { YouTubeMediaItem } from "./YouTubeMediaItem";

interface MatchGridYouTubeItemProps {
  item: GridItemType;
  index: number;
  onClick?: () => void;
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
  currentTimestamp?: number;
  onTimestampChange?: (timestamp: number) => void;
}

// Convert GridItemType to YouTubeItem format
const convertToYouTubeItem = (item: GridItemType, position: number) => {
  // Extract YouTube ID from various possible sources
  const getYouTubeId = (item: GridItemType): string => {
    // Check if youtubeId is directly available
    if ((item as any).youtubeId) {
      return (item as any).youtubeId;
    }
    
    // Try to extract from URL in description or other fields
    if (item.description) {
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = item.description.match(youtubeRegex);
      if (match) return match[1];
    }
    
    // Fallback: generate a placeholder or use item ID
    return item.backlogItemId || item.id.replace('grid-', '') || 'dQw4w9WgXcQ'; // Never Gonna Give You Up as fallback
  };

  return {
    id: item.id,
    title: item.title || 'Untitled',
    description: item.description || '',
    youtubeId: getYouTubeId(item),
    duration: (item as any).duration || 180, // Default 3 minutes
    position: position,
    category: 'music',
    tags: item.tags || []
  };
};

export function MatchGridYouTubeItem({ 
  item, 
  index, 
  onClick, 
  isSelected, 
  size = 'small',
  currentTimestamp = 0,
  onTimestampChange
}: MatchGridYouTubeItemProps) {
  const { activeItem } = useItemStore();
  const [isBeingDraggedOver, setIsBeingDraggedOver] = useState(false);
  const [localTimestamp, setLocalTimestamp] = useState(currentTimestamp);
  
  const isDraggingGridItem = activeItem && activeItem.startsWith('grid-');
  const isDraggingThisItem = activeItem === item.id;
  
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, transition, isDragging } = useDraggable({
    id: item.id,
    disabled: !item.matched,
    data: {
      type: 'grid-item',
      item: item,
      index: index
    }
  });

  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    id: `grid-${index}`,
    disabled: !item.matched || isDraggingThisItem,
    data: {
      type: 'grid-slot',
      index: index,
      position: index,
      accepts: ['grid-item', 'backlog-item']
    }
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  const sizeClasses = useSizeClasses(size);
  
  useEffect(() => {
    if (isOver && ((isDraggingGridItem && !isDraggingThisItem) || (activeItem && !activeItem.startsWith('grid-')))) {
      setIsBeingDraggedOver(true);
    } else {
      setIsBeingDraggedOver(false);
    }
  }, [isOver, isDraggingGridItem, isDraggingThisItem, activeItem]);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 0.2s ease-out',
    zIndex: isDragging ? 50 : isBeingDraggedOver ? 40 : 1,
    opacity: isDragging ? 0.7 : 1,
  };

  const getRankNumberColor = (rank: number) => {
    if (rank === 0) return '#FFD700';
    if (rank === 1) return '#C0C0C0';
    if (rank === 2) return '#CD7F32';
    return '#94a3b8';
  };

  const rankColor = getRankNumberColor(index);

  // Convert GridItemType to YouTubeItem
  const youtubeItem = convertToYouTubeItem(item, index);

  const handleTimestampChange = (timestamp: number) => {
    setLocalTimestamp(timestamp);
    if (onTimestampChange) {
      onTimestampChange(timestamp);
    }
  };

  return (
    <motion.div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-manipulation cursor-grab active:cursor-grabbing relative group"
      whileHover={{ scale: isDragging ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
      layoutId={`grid-item-${item.id}`}
      animate={{
        scale: isBeingDraggedOver ? 1.05 : 1,
        rotateY: isBeingDraggedOver ? 5 : 0,
      }}
      transition={{
        scale: { duration: 0.2 },
        rotateY: { duration: 0.3 }
      }}
    >
      <div
        className={`relative ${sizeClasses.container} ${sizeClasses.fixedHeight} rounded-xl border-2 overflow-hidden transition-all duration-300 ${
          isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800' : ''
        }`}
        style={{
          border: isBeingDraggedOver
            ? '2px solid rgba(59, 130, 246, 0.8)'
            : isSelected 
            ? '2px solid rgba(59, 130, 246, 0.6)'
            : '2px solid rgba(71, 85, 105, 0.4)',
          boxShadow: isBeingDraggedOver
            ? '0 0 25px rgba(59, 130, 246, 0.5)'
            : isSelected
            ? '0 8px 30px rgba(59, 130, 246, 0.3)'
            : isDragging
            ? '0 12px 40px rgba(0, 0, 0, 0.4)'
            : '0 4px 15px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Controls overlay */}
        <div className="absolute top-2 right-2 z-20">
          <MatchGridItemControls 
            sizeClasses={sizeClasses} 
            onClick={onClick}
            isDragging={isDragging}
            isBeingDraggedOver={isBeingDraggedOver}
          />
        </div>

        {/* Background rank number */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <span 
            className={`${sizeClasses.emptyNumber} font-black select-none transition-colors`}
            style={{ 
              color: isBeingDraggedOver ? '#3b82f6' : rankColor,
              opacity: isBeingDraggedOver ? 0.2 : 0.5
            }}
          >
            {index + 1}
          </span>
        </div>

        {/* YouTube Media Item */}
        <div className="relative w-full h-full">
          <YouTubeMediaItem
            item={youtubeItem}
            isActive={isSelected || false}
            currentTimestamp={localTimestamp}
            onSelect={() => onClick && onClick()}
            onTimestampChange={handleTimestampChange}
          />
        </div>

        {/* Enhanced border effect for drag state */}
        {isBeingDraggedOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 border-2 border-blue-400 rounded-xl pointer-events-none"
            style={{
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.6)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}