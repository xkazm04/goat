"use client";

import { useDroppable } from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { DropCelebration } from "./sub_MatchCollections/components/DropCelebration";
import { createGridSlotDropData } from "@/lib/dnd";
import {
  getRankColor,
  isPodiumPosition,
  getConfettiColors,
} from "./lib/rankConfig";
import { PositionBadge } from "./components/PositionBadge";
import { useOptionalDropZoneHighlight } from "./sub_MatchGrid/components/DropZoneHighlightContext";
import { OptimisticDragPreview } from "./components/OptimisticDragPreview";

interface MatchGridSlotProps {
  position: number;
  gridItem: any;
  size?: "small" | "medium" | "large";
  selectedBacklogItem?: string | null;
  selectedGridItem?: string | null;
  onGridItemClick?: (id: string) => void;
}

/**
 * MatchGridSlot - Individual droppable grid position with selection support
 * Enhanced with celebratory microanimations for successful drops.
 * Features dynamic drop zone highlighting during drag operations.
 * Uses memoized presentation data for optimized re-renders.
 */
export function MatchGridSlot({
  position,
  gridItem,
  size = "medium",
  selectedBacklogItem,
  selectedGridItem,
  onGridItemClick,
}: MatchGridSlotProps) {
  const isOccupied = gridItem?.matched;

  // Memoize presentation data to prevent recalculation on every render
  const presentation = useMemo(
    () => ({
      isTop3: isPodiumPosition(position),
      rankColor: getRankColor(position),
      confettiColors: getConfettiColors(position),
    }),
    [position]
  );

  // Get optional highlight context for global drag state
  const highlightContext = useOptionalDropZoneHighlight();
  const isGlobalDragging = highlightContext?.dragState.isDragging ?? false;
  const activeItemData = highlightContext?.dragState.activeItemData ?? null;

  const { setNodeRef, isOver } = useDroppable({
    id: `grid-${position}`,
    data: createGridSlotDropData(position, isOccupied, gridItem),
  });

  const isSelected = selectedGridItem === gridItem?.id;

  // Track drop celebration state
  const [justDropped, setJustDropped] = useState(false);
  const prevOccupiedRef = useRef(isOccupied);

  // Trigger celebration when item becomes occupied
  useEffect(() => {
    const wasEmpty = !prevOccupiedRef.current;
    const isNowOccupied = isOccupied;

    if (wasEmpty && isNowOccupied) {
      setJustDropped(true);
      const timer = setTimeout(() => setJustDropped(false), 800);
      return () => clearTimeout(timer);
    }

    prevOccupiedRef.current = isOccupied;
  }, [isOccupied]);

  // Destructure memoized presentation data
  const { isTop3, rankColor } = presentation;

  // Determine if this slot should show the "valid drop zone" highlight
  const showValidDropZoneHighlight = isGlobalDragging && !isOccupied;

  // Determine if this filled slot should be dimmed during drag
  const shouldDimFilledSlot = isGlobalDragging && isOccupied;

  // Responsive size variants: mobile-first approach
  // Base sizes ensure 44px+ tap targets for accessibility (sm: w-14 = 56px minimum)
  // Sizes scale up progressively: sm → md → lg → xl
  const sizeClasses = {
    small: "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-20 lg:h-20 xl:w-24 xl:h-24",
    medium: "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-28 xl:h-28",
    large: "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36",
  };

  const handleClick = () => {
    if (isOccupied && gridItem?.id && onGridItemClick) {
      onGridItemClick(gridItem.id);
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: shouldDimFilledSlot ? 0.6 : 1, // Dim filled positions during drag
        scale: justDropped
          ? (isTop3
            ? [1, 1.2, 0.92, 1.08, 0.98, 1.02, 1] // Celebratory bounce for podium
            : [1, 1.15, 0.95, 1.02, 1])
          : isOver ? 1.08 : showValidDropZoneHighlight ? 1.05 : 1, // Enhanced scale-105 for valid drop zones
        rotate: justDropped && isTop3 ? [0, -2, 2, -1, 1, 0] : 0,
      }}
      transition={{
        opacity: shouldDimFilledSlot ? { duration: 0.3, ease: "easeOut" } : { delay: position * 0.02 },
        scale: justDropped
          ? { duration: isTop3 ? 0.8 : 0.6, ease: [0.34, 1.56, 0.64, 1] }
          : { duration: 0.2 },
        rotate: { duration: 0.6, ease: "easeOut" },
      }}
      onClick={handleClick}
      className={`
        ${sizeClasses[size]}
        relative rounded-lg border-2 transition-all duration-200
        ${
          isOver
            ? "border-cyan-400 bg-cyan-500/10"
            : showValidDropZoneHighlight
            ? "border-cyan-400/50 bg-cyan-500/5"
            : "border-gray-700 bg-gray-800/50"
        }
        ${isOccupied && !shouldDimFilledSlot ? "border-green-500" : ""}
        ${isSelected ? "border-yellow-500 ring-2 ring-yellow-500/50" : ""}
        hover:border-gray-600 hover:bg-gray-800/70
        ${isOccupied && onGridItemClick ? "cursor-pointer" : ""}
        flex flex-col items-center justify-center
      `}
      data-testid={`match-grid-slot-${position}`}
    >
      {/* Pulsing Valid Drop Zone Indicator - Enhanced cyan-400 glow for empty slots during drag */}
      <AnimatePresence>
        {showValidDropZoneHighlight && (
          <motion.div
            className="absolute -inset-[2px] rounded-lg pointer-events-none z-40"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: [0.4, 0.9, 0.4],
              scale: [1, 1.03, 1],
            }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              opacity: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              border: '2px solid rgb(34, 211, 238)', // cyan-400
              boxShadow: `
                0 0 20px rgba(6, 182, 212, 0.5),
                0 0 40px rgba(6, 182, 212, 0.3),
                inset 0 0 15px rgba(6, 182, 212, 0.15)
              `, // shadow-cyan-500/50 effect
            }}
            data-testid={`valid-drop-zone-indicator-${position}`}
          />
        )}
      </AnimatePresence>
      {/* Position Number - Tier-based visual hierarchy */}
      <PositionBadge position={position} className="absolute top-1 left-1" />

      {/* Optimistic Drag Preview - Shows ghost of item when hovering over empty slot */}
      <AnimatePresence>
        {isOver && !isOccupied && activeItemData && (
          <OptimisticDragPreview
            itemData={activeItemData}
            size={size}
          />
        )}
      </AnimatePresence>

      {/* Item Content */}
      {isOccupied ? (
        <div className="w-full h-full p-1 flex flex-col items-center justify-center">
          {gridItem.image_url && (
            <img
              src={gridItem.image_url}
              alt={gridItem.title || ""}
              className="w-full h-full object-cover rounded"
              data-testid={`grid-item-image-${position}`}
            />
          )}
          {!gridItem.image_url && (
            <div
              className="text-center text-xs text-gray-300 px-1 break-words"
              data-testid={`grid-item-title-${position}`}
            >
              {gridItem.title || gridItem.name || "Untitled"}
            </div>
          )}
        </div>
      ) : (
        /* Only show "Drop here" text when not showing optimistic preview */
        !isOver && (
          <div className="text-gray-600 text-sm" data-testid={`grid-slot-empty-${position}`}>
            Drop here
          </div>
        )
      )}

      {/* Drop Celebration with confetti for podium positions */}
      <DropCelebration
        isActive={justDropped}
        isPodium={isTop3}
        rankColor={rankColor}
        position={position}
      />
    </motion.div>
  );
}
