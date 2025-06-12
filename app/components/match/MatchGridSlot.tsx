"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { GridItemType } from "@/app/types/match";
import { useItemStore } from "@/app/stores/item-store";
import MatchEmptySlot from "./MatchEmptySlot";
import { MatchGridItem } from "./MatchGridItem";

interface MatchGridSlotProps {
  position: number;
  size?: 'small' | 'medium' | 'large';
  gridItem?: GridItemType;
  selectedBacklogItem?: string | null;
  selectedGridItem?: string | null;
  onGridItemClick?: (id: string) => void;
  className?: string;
}

const MatchGridSlot = ({ 
  position, 
  size, 
  gridItem, 
  selectedBacklogItem,
  selectedGridItem,
  onGridItemClick 
}: MatchGridSlotProps) => {
  const {
    backlogGroups,
    gridItems,
    assignItemToGrid,
    removeItemFromGrid,
    canAddAtPosition,
    activeItem
  } = useItemStore();

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previouslyEmpty, setPreviouslyEmpty] = useState(!gridItem?.matched);

  // Detect when item is being assigned for celebration effect
  useEffect(() => {
    if (previouslyEmpty && gridItem?.matched) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
    setPreviouslyEmpty(!gridItem?.matched);
  }, [gridItem?.matched, previouslyEmpty]);

  // Check if we're dragging a backlog item
  const isDraggingBacklogItem = activeItem && backlogGroups
    .flatMap(group => group.items)
    .some(item => item.id === activeItem);

  const isEmpty = !gridItem?.matched;

  const handleGridItemClick = (id: string) => {
    if (onGridItemClick) {
      onGridItemClick(id);
    } else {
      // Default behavior - remove item
      const clickedItem = gridItems.find(item => item.id === id);
      if (clickedItem?.matched) {
        removeItemFromGrid(position);
      }
    }
  };

  // Return empty slot if no item assigned
  if (isEmpty) {
    return (
      <div className="relative w-full h-full">
        <MatchEmptySlot
          position={position}
          size={size}
          selectedBacklogItem={selectedBacklogItem || null}
          isDraggingBacklogItem={isDraggingBacklogItem}
          canAddAtPosition={canAddAtPosition}
        />
        
        {/* Celebration effect overlay */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              {/* Particle effect */}
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0,
                      scale: 0,
                      x: '50%',
                      y: '50%'
                    }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      x: `${50 + (Math.random() - 0.5) * 200}%`,
                      y: `${50 + (Math.random() - 0.5) * 200}%`
                    }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Return assigned grid item
  return (
    <motion.div
      key={`item-${gridItem.id}`}
      initial={isTransitioning ? { 
        opacity: 0, 
        scale: 0.8,
        rotateY: 15
      } : false}
      animate={{ 
        opacity: 1, 
        scale: 1,
        rotateY: 0
      }}
      transition={{
        duration: isTransitioning ? 0.5 : 0.3,
        ease: [0.04, 0.62, 0.23, 0.98],
        delay: isTransitioning ? 0.1 : 0
      }}
      className="w-full h-full"
    >
      <MatchGridItem
        item={gridItem}
        index={position}
        onClick={() => handleGridItemClick(gridItem.id)}
        isSelected={selectedGridItem === gridItem.id}
        size={size}
      />
    </motion.div>
  );
};

export default MatchGridSlot;