"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { useCurrentList } from "@/stores/use-list-store";
import { CategorySlotIllustration } from "@/components/illustrations/EmptyStateIllustrations";

export interface DropZoneEmptyProps {
  /** Position in the grid (0-based) */
  position: number;
  /** Whether this is a top-3 (podium) position */
  isTop3: boolean;
  /** Whether an item is being dragged over this zone */
  isOver: boolean;
  /** Accent color for styling */
  accentColor: string;
}

/**
 * DropZoneEmpty
 * Renders the empty state of a drop zone with category-aware illustration.
 */
export const DropZoneEmpty = memo(function DropZoneEmpty({
  position,
  isTop3,
  isOver,
  accentColor,
}: DropZoneEmptyProps) {
  const currentList = useCurrentList();

  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"
    >
      {isOver ? (
        <div className="text-brand-hover font-bold text-xs tracking-widest uppercase">
          Drop Here
        </div>
      ) : (
        <CategorySlotIllustration category={currentList?.category} />
      )}
    </motion.div>
  );
});

export interface RankNumberBackgroundProps {
  /** Position number to display (0-based, will show +1) */
  position: number;
  /** Accent color for the number */
  accentColor: string;
  /** Whether an item is being dragged over this zone */
  isOver: boolean;
  /** Whether the slot is occupied */
  isOccupied: boolean;
}

/**
 * RankNumberBackground
 * Large rank number displayed behind the drop zone content.
 */
export const RankNumberBackground = memo(function RankNumberBackground({
  position,
  accentColor,
  isOver,
  isOccupied,
}: RankNumberBackgroundProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <span
        className="text-[6rem] font-black font-grotesk select-none transition-all duration-500"
        style={{
          color: accentColor,
          opacity: isOver ? 0.2 : isOccupied ? 0 : 0.15,
          transform: isOver ? 'scale(1.2)' : 'scale(1)',
        }}
      >
        {position + 1}
      </span>
    </div>
  );
});

export interface HoloGridPatternProps {
  /** Accent color for the grid dots */
  accentColor: string;
  /** Whether the pattern should be visible */
  isVisible: boolean;
}

/**
 * HoloGridPattern
 * Background grid pattern for the "holo" effect on empty drop zones.
 */
export const HoloGridPattern = memo(function HoloGridPattern({
  accentColor,
  isVisible,
}: HoloGridPatternProps) {
  if (!isVisible) return null;

  return (
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: `radial-gradient(${accentColor} 1px, transparent 1px)`,
        backgroundSize: '10px 10px',
      }}
    />
  );
});

export default DropZoneEmpty;
