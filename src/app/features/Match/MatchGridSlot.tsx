"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";

interface MatchGridSlotProps {
  position: number;
  gridItem: any;
  size?: "small" | "medium" | "large";
  selectedBacklogItem?: string | null;
  selectedGridItem?: string | null;
  onGridItemClick: (id: string) => void;
}

/**
 * MatchGridSlot - Individual droppable grid position with selection support
 */
export function MatchGridSlot({
  position,
  gridItem,
  size = "medium",
  selectedBacklogItem,
  selectedGridItem,
  onGridItemClick,
}: MatchGridSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${position}`,
    data: {
      type: "grid-slot",
      position: position,
    },
  });

  const isOccupied = gridItem?.matched;
  const isSelected = selectedGridItem === gridItem?.id;

  const sizeClasses = {
    small: "w-20 h-20",
    medium: "w-28 h-28",
    large: "w-36 h-36",
  };

  const handleClick = () => {
    if (isOccupied && gridItem?.id) {
      onGridItemClick(gridItem.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: position * 0.02 }}
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg border-2 transition-all duration-200
        ${
          isOver
            ? "border-blue-500 bg-blue-500/10 scale-105"
            : "border-gray-700 bg-gray-800/50"
        }
        ${isOccupied ? "border-green-500" : ""}
        ${isSelected ? "border-yellow-500 ring-2 ring-yellow-500/50" : ""}
        hover:border-gray-600 hover:bg-gray-800/70
        ${isOccupied ? "cursor-pointer" : ""}
        flex flex-col items-center justify-center
      `}
      data-testid={`match-grid-slot-${position}`}
    >
      {/* Position Number */}
      <div className="absolute top-1 left-1 text-xs text-gray-500 font-mono">
        #{position + 1}
      </div>

      {/* Item Content */}
      {isOccupied ? (
        <div className="w-full h-full p-1 flex flex-col items-center justify-center">
          {gridItem.image_url && (
            <img
              src={gridItem.image_url}
              alt={gridItem.title || ""}
              className="w-full h-full object-cover rounded"
            />
          )}
          {!gridItem.image_url && (
            <div className="text-center text-xs text-gray-300 px-1 break-words">
              {gridItem.title || gridItem.name || "Untitled"}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-600 text-sm">Drop here</div>
      )}
    </motion.div>
  );
}
