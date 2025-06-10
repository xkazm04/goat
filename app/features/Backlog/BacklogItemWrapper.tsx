"use client";

import { BacklogItemType } from "@/app/types/match";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, CheckCircle, Grid3X3 } from "lucide-react";
import { useEffect, useState } from "react";

interface BacklogItemWrapperProps {
  item: BacklogItemType;
  isDragOverlay?: boolean;
  size?: 'small' | 'medium' | 'large';
  isAssignedToGrid?: boolean;
  isSelected?: boolean;
  isInCompareList?: boolean;
  isEffectivelyMatched?: boolean;
  activeItem?: string | null;
  children: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function BacklogItemWrapper({
  item,
  isDragOverlay = false,
  size = 'medium',
  isAssignedToGrid = false,
  isSelected = false,
  isInCompareList = false,
  isEffectivelyMatched = false,
  activeItem,
  children,
  onClick,
  onDoubleClick,
  onContextMenu
}: BacklogItemWrapperProps) {
  // Enhanced state tracking
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [hasBeenDropped, setHasBeenDropped] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [isDragHandleActive, setIsDragHandleActive] = useState(false);
  
  const isCurrentlyDragging = activeItem === item.id;
  
  // Hide item immediately when it starts being dragged to grid
  useEffect(() => {
    if (isCurrentlyDragging && !isDragOverlay) {
      setIsBeingDragged(true);
      // Small delay to allow drag to establish
      const timer = setTimeout(() => {
        setShouldHide(true);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isCurrentlyDragging && isBeingDragged) {
      // Reset state when drag ends
      setIsBeingDragged(false);
      setHasBeenDropped(false);
      setShouldHide(false);
    }
  }, [isCurrentlyDragging, isDragOverlay, isBeingDragged]);
  
  // Monitor for successful assignment
  useEffect(() => {
    if (isEffectivelyMatched && isBeingDragged) {
      setHasBeenDropped(true);
    }
  }, [isEffectivelyMatched, isBeingDragged]);
  
  // FIXED: Configure draggable properly with data type
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: isEffectivelyMatched || isDragOverlay,
    data: {
      type: 'backlog-item', // This ensures proper identification in drag handlers
      item: item
    }
  });
  
  // Enhanced transform with smooth transitions
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragOverlay 
      ? 1 
      : isDragging 
      ? 0.3 // More transparent when being dragged
      : shouldHide 
      ? 0 
      : isEffectivelyMatched 
      ? 0.4 
      : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging 
      ? 'none' 
      : 'opacity 0.2s ease-out, transform 0.2s ease-out',
  };

  // Size configurations
  const sizeConfig = {
    small: {
      container: 'aspect-square',
      padding: 'p-2'
    },
    medium: {
      container: 'aspect-square',
      padding: 'p-3'
    },
    large: {
      container: 'aspect-square',
      padding: 'p-4'
    }
  };

  const config = sizeConfig[size];

  // Handle drag handle interactions
  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragHandleActive(true);
  };

  const handleDragHandleMouseUp = () => {
    setIsDragHandleActive(false);
  };

  const handleDragHandleMouseLeave = () => {
    setIsDragHandleActive(false);
  };

  // Don't render if item should be hidden during drag
  if (shouldHide && !isDragOverlay) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {(!shouldHide || isDragOverlay) && (
        <motion.div
          layout
          initial={{ opacity: 1, scale: 1 }}
          animate={{ 
            opacity: isDragOverlay ? 1 : isCurrentlyDragging ? 0.3 : 1,
            scale: 1
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8,
            transition: { duration: 0.2 }
          }}
          whileHover={{ scale: isEffectivelyMatched || isDragOverlay ? 1 : 1.02 }}
          whileTap={{ scale: isEffectivelyMatched || isDragOverlay ? 1 : 0.98 }}
        >
          <div
            ref={setNodeRef}
            onClick={!isEffectivelyMatched && !isDragOverlay ? onClick : undefined}
            onDoubleClick={!isEffectivelyMatched && !isDragOverlay ? onDoubleClick : undefined}
            onContextMenu={!isEffectivelyMatched && !isDragOverlay ? onContextMenu : undefined}
            className={`relative ${config.container} rounded-xl border-2 overflow-hidden transition-all duration-300 group 
                 ${isDragOverlay ? 'pointer-events-none' : ''} ${isDragging ? 'z-50' : ''}`}
            style={{
              background: isEffectivelyMatched 
                ? 'rgba(71, 85, 105, 0.3)'
                : isSelected
                ? `linear-gradient(135deg, 
                    rgba(59, 130, 246, 0.2) 0%,
                    rgba(147, 51, 234, 0.2) 100%
                  )`
                : `linear-gradient(135deg, 
                    rgba(30, 41, 59, 0.9) 0%,
                    rgba(51, 65, 85, 0.95) 100%
                  )`,
              border: isDragOverlay
                ? '2px solid rgba(59, 130, 246, 0.8)'
                : isSelected 
                ? '2px solid rgba(59, 130, 246, 0.6)'
                : isEffectivelyMatched
                ? isAssignedToGrid
                  ? '2px solid rgba(147, 51, 234, 0.6)'
                  : '2px solid rgba(34, 197, 94, 0.6)'
                : isInCompareList
                ? '2px solid rgba(34, 197, 94, 0.4)'
                : '2px solid rgba(71, 85, 105, 0.3)',
              boxShadow: isDragOverlay
                ? '0 0 30px rgba(59, 130, 246, 0.5)'
                : isSelected
                ? '0 0 20px rgba(59, 130, 246, 0.3)'
                : isInCompareList
                ? '0 0 15px rgba(34, 197, 94, 0.3)'
                : isEffectivelyMatched
                ? isAssignedToGrid
                  ? '0 0 10px rgba(147, 51, 234, 0.2)'
                  : '0 0 10px rgba(34, 197, 94, 0.2)'
                : isDragging
                ? '0 8px 25px rgba(0, 0, 0, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.3)',
              ...style
            }}
          >
            {/* FIXED: Drag Handle Indicator with proper attributes and listeners */}
            {!isEffectivelyMatched && !isDragOverlay && size !== 'small' && (
              <div 
                className={`absolute top-1 left-1 z-20 transition-all duration-200 ${
                  isDragHandleActive 
                    ? 'opacity-100 scale-110' 
                    : 'opacity-0 group-hover:opacity-70'
                } cursor-grab active:cursor-grabbing`}
                onMouseDown={handleDragHandleMouseDown}
                onMouseUp={handleDragHandleMouseUp}
                onMouseLeave={handleDragHandleMouseLeave}
                {...attributes}
                {...listeners}
                title="Drag to reorder"
              >
                <motion.div
                  className="p-1 rounded bg-slate-700/80 backdrop-blur-sm border border-slate-600/50"
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(71, 85, 105, 0.9)' }}
                  whileTap={{ scale: 0.95 }}
                  animate={isDragging ? {
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  } : {}}
                  transition={{ 
                    repeat: isDragging ? Infinity : 0, 
                    duration: 0.5 
                  }}
                >
                  <GripVertical 
                    className={`w-3 h-3 transition-colors ${
                      isDragHandleActive || isDragging 
                        ? 'text-blue-400' 
                        : 'text-slate-400'
                    }`} 
                  />
                </motion.div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="absolute top-1 right-1 z-10">
              {isAssignedToGrid && (
                <motion.div 
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-500 border border-white"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Grid3X3 className="w-3 h-3 text-white" />
                </motion.div>
              )}
              {item.matched && !isAssignedToGrid && (
                <motion.div 
                  className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 border border-white"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <CheckCircle className="w-3 h-3 text-white" />
                </motion.div>
              )}
              {isSelected && !isEffectivelyMatched && !isDragOverlay && (
                <motion.div 
                  className="w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-400"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                />
              )}
              {isInCompareList && !isSelected && !isEffectivelyMatched && !isDragOverlay && (
                <motion.div 
                  className="w-3 h-3 rounded-full border-2 border-green-400 bg-green-400"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                />
              )}
            </div>

            {/* Content Area - Clickable but not draggable */}
            <div className="absolute inset-0 pointer-events-none">
              {children}
            </div>

            {/* Click overlay to enable clicking on content */}
            {!isEffectivelyMatched && !isDragOverlay && (
              <div 
                className="absolute inset-0 z-10 cursor-pointer"
                style={{ 
                  pointerEvents: isDragHandleActive ? 'none' : 'auto',
                  // Exclude drag handle area from click detection
                  clipPath: size !== 'small' ? 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 15%)' : 'none'
                }}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}