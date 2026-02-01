"use client";

import { memo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { MedalType } from "../../lib/medalStyling";

export interface DropZoneCardProps {
  /** Position in the grid (0-based) */
  position: number;
  /** Whether the slot is occupied */
  isOccupied: boolean;
  /** Whether an item is being dragged over this zone */
  isOver: boolean;
  /** Whether this is a top-3 position */
  isTop3: boolean;
  /** Whether this item just dropped (trigger bounce animation) */
  justDropped: boolean;
  /** Whether this is a valid drop zone during drag */
  showValidDropZoneHighlight: boolean;
  /** Whether this filled slot should be dimmed */
  shouldDimFilledSlot: boolean;
  /** Accent color for styling */
  accentColor: string;
  /** Medal type for empty medal slots */
  medalType: MedalType | null;
  /** Medal hint background color */
  medalHintColor?: string;
  /** Inline style (for drag transform) */
  style?: React.CSSProperties;
  /** Draggable attributes - spread onto the element when occupied */
  attributes?: DraggableAttributes;
  /** Draggable listeners - spread onto the element when occupied */
  listeners?: SyntheticListenerMap;
  /** Children to render inside the card */
  children: React.ReactNode;
}

/**
 * DropZoneCard
 * The main card container with all animation states.
 * Handles scale, rotation, and opacity animations based on drag state.
 */
export const DropZoneCard = memo(
  forwardRef<HTMLDivElement, DropZoneCardProps>(function DropZoneCard(
    {
      position,
      isOccupied,
      isOver,
      isTop3,
      justDropped,
      showValidDropZoneHighlight,
      shouldDimFilledSlot,
      accentColor,
      medalType,
      medalHintColor,
      style,
      attributes,
      listeners,
      children,
    },
    ref
  ) {
    return (
      <motion.div
        ref={ref}
        style={{
          ...style,
          ...((!isOccupied && medalType && medalHintColor) && {
            backgroundColor: medalHintColor,
          }),
        } as React.CSSProperties}
        initial={false}
        animate={{
          scale: justDropped
            ? (isTop3
              ? [1, 1.2, 0.92, 1.08, 0.98, 1.02, 1]
              : [1, 1.15, 0.95, 1.02, 1])
            : isOver ? 1.08 : showValidDropZoneHighlight ? 1.05 : 1,
          borderColor: isOver ? accentColor : isOccupied ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          rotate: justDropped && isTop3 ? [0, -2, 2, -1, 1, 0] : 0,
          opacity: shouldDimFilledSlot ? 0.6 : 1,
        }}
        transition={{
          scale: justDropped
            ? {
              duration: isTop3 ? 0.8 : 0.6,
              ease: [0.34, 1.56, 0.64, 1],
            }
            : { duration: 0.2 },
          rotate: justDropped && isTop3
            ? {
              duration: 0.6,
              ease: "easeOut",
            }
            : { duration: 0 },
          opacity: { duration: 0.3, ease: "easeOut" },
        }}
        className={`
          relative aspect-[4/5] rounded-xl overflow-hidden group
          border-2 transition-colors duration-300
          ${isOccupied ? 'bg-gray-900/80' : 'bg-gray-900/20'}
          ${!isOccupied && 'shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]'}
          ${isOver ? `shadow-[0_0_30px_${accentColor}40]` : ''}
        `}
        data-testid={`drop-zone-${position}`}
        {...(isOccupied && attributes ? attributes : {})}
        {...(isOccupied && listeners ? listeners : {})}
      >
        {children}
      </motion.div>
    );
  })
);

export interface ActiveSelectionRingProps {
  isActive: boolean;
  accentColor: string;
}

/**
 * ActiveSelectionRing
 * Ring shown when an item is dragged over the drop zone.
 */
export const ActiveSelectionRing = memo(function ActiveSelectionRing({
  isActive,
  accentColor,
}: ActiveSelectionRingProps) {
  if (!isActive) return null;

  return (
    <motion.div
      layoutId="active-ring"
      className="absolute -inset-[2px] rounded-xl border-2 pointer-events-none z-50"
      style={{ borderColor: accentColor }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    />
  );
});

export interface HoverGlowBorderProps {
  accentColor: string;
}

/**
 * HoverGlowBorder
 * Subtle glow effect shown on hover.
 */
export const HoverGlowBorder = memo(function HoverGlowBorder({
  accentColor,
}: HoverGlowBorderProps) {
  return (
    <div
      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      style={{ boxShadow: `inset 0 0 20px ${accentColor}20` }}
    />
  );
});

export interface ItemTitleProps {
  isOccupied: boolean;
  title?: string;
}

/**
 * ItemTitle
 * Title displayed below the card when occupied.
 */
export const ItemTitle = memo(function ItemTitle({
  isOccupied,
  title,
}: ItemTitleProps) {
  return (
    <AnimatePresence>
      {isOccupied && title && (
        <motion.div
          className="mt-2 px-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ delay: 0.2, duration: 0.3, type: "spring", stiffness: 200 }}
        >
          <p
            className="text-[11px] font-medium text-white/90 text-center leading-tight line-clamp-2"
            title={title}
          >
            {title}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default DropZoneCard;
