"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { useItemStore } from "@/app/stores/item-store";
import { useBacklogStore } from "@/app/stores/backlog-store";
import { useState, useEffect, useMemo } from "react";

interface MatchDroppableProps {
  position: number;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  selectedBacklogItem: string | null;
  isDraggingBacklogItem: boolean;
  canAddAtPosition: (position: number) => boolean;
}

const MatchDroppable = ({
  position,
  children,
  selectedBacklogItem,
  isDraggingBacklogItem,
  canAddAtPosition
}: MatchDroppableProps) => {
  const { 
    assignItemToGrid, 
    getAvailableBacklogItems
  } = useItemStore();

  const [isHovered, setIsHovered] = useState(false);
  const [isPulsingActive, setIsPulsingActive] = useState(false);

  // Get the available backlog items
  const availableItems = useMemo(() => 
    getAvailableBacklogItems(), 
    [getAvailableBacklogItems]
  );

  // Find the selected backlog item if it exists
  const selectedItem = useMemo(() => {
    if (!selectedBacklogItem) return null;
    return availableItems.find(item => item.id === selectedBacklogItem);
  }, [selectedBacklogItem, availableItems]);

  // Check if we can drop into this position
  const canDropHere = canAddAtPosition(position);

  // Set up droppable
  const { isOver, setNodeRef } = useDroppable({
    id: `grid-${position}`,
    data: {
      type: 'grid-slot',
      position,
      accepts: ['backlog-item']
    },
    disabled: !canDropHere
  });

  // Compute visual state based on drag status and selection
  const isHighlighted = useMemo(() => {
    if (isOver) return true;
    if (selectedBacklogItem && canDropHere) return isHovered;
    return false;
  }, [isOver, selectedBacklogItem, canDropHere, isHovered]);

  // Start pulsing animation when a backlog item is being dragged
  useEffect(() => {
    if (isDraggingBacklogItem && canDropHere) {
      setIsPulsingActive(true);
    } else {
      setIsPulsingActive(false);
    }
  }, [isDraggingBacklogItem, canDropHere]);

  // Handle click to assign selected backlog item to this slot
  const handleClick = () => {
    if (selectedItem && canDropHere) {
      assignItemToGrid(selectedItem, position);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="w-full h-full relative"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Highlight overlay for drop target */}
      {canDropHere && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isHighlighted ? 0.3 : isPulsingActive ? [0, 0.2, 0] : 0,
            boxShadow: isHighlighted 
              ? '0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.5)' 
              : '0 0 0 0 rgba(59, 130, 246, 0)'
          }}
          transition={isPulsingActive && !isHighlighted 
            ? { opacity: { repeat: Infinity, duration: 1.5 } }
            : { duration: 0.2 }
          }
          style={{
            background: isOver 
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))' 
              : 'rgba(59, 130, 246, 0.2)'
          }}
        />
      )}
      
      {/* Selected indicator */}
      {selectedBacklogItem && canDropHere && (
        <motion.div 
          className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full z-20 pointer-events-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: isHovered ? 1.2 : 1, 
            opacity: 1 
          }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {children}
    </div>
  );
};

export default MatchDroppable;