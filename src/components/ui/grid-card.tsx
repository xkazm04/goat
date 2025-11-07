"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

/**
 * GridCard Variants
 * Defines visual styles for different card states and sizes
 */
const gridCardVariants = cva(
  "relative rounded-lg overflow-hidden transition-all group",
  {
    variants: {
      variant: {
        default: "bg-gray-800 border-2 border-gray-700 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/20",
        ghost: "bg-transparent hover:bg-gray-800/50 border-2 border-gray-700/50",
        solid: "bg-gray-900 border-2 border-gray-800 hover:border-cyan-400",
        outlined: "bg-transparent border-2 border-cyan-500/30 hover:border-cyan-500",
      },
      size: {
        small: "w-20 h-20",
        medium: "w-28 h-28",
        large: "w-36 h-36",
        responsive: "aspect-square w-full",
      },
      state: {
        default: "opacity-100",
        dragging: "opacity-50 scale-95 z-50 cursor-grabbing",
        disabled: "opacity-60 cursor-not-allowed",
        selected: "ring-2 ring-yellow-500/50 border-yellow-500",
        hovering: "border-blue-500 bg-blue-500/10 scale-105",
        occupied: "border-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "responsive",
      state: "default",
    },
  }
);

/**
 * GridCard Props Interface
 */
export interface GridCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof gridCardVariants> {
  /** Card content (title or name) */
  content?: string;

  /** Position number in the grid */
  position: number;

  /** Image URL for the card */
  image?: string | null;

  /** Alt text for the image */
  imageAlt?: string;

  /** Whether the card is occupied with an item */
  occupied?: boolean;

  /** Whether the card is selected */
  selected?: boolean;

  /** Whether drag is currently over this card */
  isOver?: boolean;

  /** Drag handlers for @dnd-kit */
  dragHandleProps?: any;

  /** Drop handlers for @dnd-kit */
  dropHandleProps?: any;

  /** Whether the card is draggable */
  draggable?: boolean;

  /** Whether the card is droppable */
  droppable?: boolean;

  /** Enable Framer Motion animations */
  animated?: boolean;

  /** Animation delay (for staggered grids) */
  animationDelay?: number;

  /** Callback when card is clicked */
  onCardClick?: () => void;

  /** Callback for drag start */
  onDragStart?: (event: React.DragEvent) => void;

  /** Callback for drop */
  onDrop?: (event: React.DragEvent) => void;

  /** Show drag handle icon */
  showDragHandle?: boolean;

  /** Show position badge */
  showPosition?: boolean;

  /** Show remove button */
  showRemoveButton?: boolean;

  /** Callback for remove button */
  onRemove?: () => void;

  /** ARIA grabbed state */
  ariaGrabbed?: boolean;

  /** Custom rank color for top positions */
  rankColor?: string;

  /** Show large background rank number */
  showBackgroundRank?: boolean;

  /** Custom overlay content */
  overlayContent?: React.ReactNode;

  /** Test ID for testing */
  testId?: string;

  /** Enable focus ring */
  focusRing?: boolean;
}

/**
 * Get rank color for top 3 positions
 */
const getRankColor = (position: number): string => {
  if (position === 0) return '#FFD700'; // Gold - 1st place
  if (position === 1) return '#C0C0C0'; // Silver - 2nd place
  if (position === 2) return '#CD7F32'; // Bronze - 3rd place
  return '#94a3b8'; // Gray - rest
};

/**
 * GridCard Component
 *
 * A generic, accessible drag-and-drop grid card with:
 * - Draggable handle
 * - Focusable card area
 * - Framer Motion animations
 * - ARIA attributes (role="gridcell", aria-grabbed)
 * - Keyboard support
 *
 * @example
 * ```tsx
 * <GridCard
 *   position={0}
 *   content="Item Title"
 *   image="/image.jpg"
 *   occupied={true}
 *   draggable={true}
 *   droppable={true}
 *   animated
 * />
 * ```
 */
export const GridCard = React.forwardRef<HTMLDivElement, GridCardProps>(
  (
    {
      content,
      position,
      image,
      imageAlt,
      occupied = false,
      selected = false,
      isOver = false,
      dragHandleProps,
      dropHandleProps,
      draggable = true,
      droppable = true,
      animated = true,
      animationDelay = 0,
      onCardClick,
      onDragStart,
      onDrop,
      showDragHandle = true,
      showPosition = true,
      showRemoveButton = false,
      onRemove,
      ariaGrabbed = false,
      rankColor,
      showBackgroundRank = true,
      overlayContent,
      testId,
      focusRing = true,
      variant,
      size,
      state,
      className,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    // Determine state based on props
    const computedState =
      state ||
      (isOver ? "hovering" :
       selected ? "selected" :
       occupied ? "occupied" :
       "default");

    // Get rank color if not provided
    const computedRankColor = rankColor || getRankColor(position);

    // Handle keyboard interaction (Enter/Space)
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.key === "Enter" || e.key === " ") && (onClick || onCardClick)) {
        e.preventDefault();
        onClick?.(e as any);
        onCardClick?.();
      }
      onKeyDown?.(e);
    };

    // Handle click
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      onCardClick?.();
    };

    // Base component
    const Component = animated ? motion.div : "div";

    // Animation props
    const animationProps: MotionProps = animated
      ? {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          transition: {
            delay: animationDelay || position * 0.02,
            type: "spring",
            stiffness: 300,
            damping: 20
          },
          whileHover: occupied && draggable ? { scale: 1.05 } : undefined,
          whileFocus: { scale: 1.02 },
        }
      : {};

    return (
      <Component
        ref={ref}
        role="gridcell"
        aria-grabbed={draggable && occupied ? ariaGrabbed : undefined}
        aria-label={occupied ? `Grid position ${position + 1}: ${content}` : `Empty grid position ${position + 1}`}
        aria-disabled={!occupied && !droppable}
        tabIndex={occupied || droppable ? 0 : -1}
        data-testid={testId || `grid-card-${position}`}
        className={cn(
          gridCardVariants({ variant, size, state: computedState }),
          focusRing && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
          occupied && draggable && "cursor-grab active:cursor-grabbing",
          !occupied && droppable && "cursor-pointer",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragStart={onDragStart}
        onDrop={onDrop}
        {...(animationProps as any)}
        {...dragHandleProps}
        {...dropHandleProps}
        {...props}
      >
        {/* Background rank number (large, low opacity) */}
        {showBackgroundRank && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-[8rem] font-black select-none transition-colors"
              style={{
                color: isOver ? '#3b82f6' : computedRankColor,
                opacity: isOver ? 0.15 : 0.08
              }}
            >
              {position + 1}
            </span>
          </div>
        )}

        {/* Position badge (top-left corner) */}
        {showPosition && (
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 bg-gray-800/90 rounded text-[10px] font-semibold text-gray-400 z-10"
            data-testid={`grid-card-position-${position}`}
          >
            #{position + 1}
          </div>
        )}

        {/* Drag handle (top-right corner) */}
        {showDragHandle && occupied && draggable && (
          <div
            className="absolute top-1 right-1 p-1 bg-gray-800/90 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
            data-testid={`grid-card-drag-handle-${position}`}
            aria-label="Drag handle"
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>
        )}

        {/* Content */}
        {occupied && content ? (
          <>
            {/* Image background if available */}
            {image ? (
              <div className="absolute inset-0">
                <img
                  src={image}
                  alt={imageAlt || content}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="lazy"
                />
                {/* Dark overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
            )}

            {/* Content overlay */}
            <div className="relative w-full h-full flex flex-col items-center justify-end p-2 z-10">
              <div className="text-xs text-white font-medium text-center mb-2 line-clamp-2 drop-shadow-lg">
                {content}
              </div>

              {/* Remove button */}
              {showRemoveButton && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="px-2 py-1 text-[10px] bg-red-500/30 text-red-400 rounded hover:bg-red-500/50 transition-colors backdrop-blur-sm border border-red-500/30"
                  data-testid={`grid-card-remove-btn-${position}`}
                  aria-label={`Remove ${content} from position ${position + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Rank badge at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center border-t border-gray-700/50 z-20"
              style={{
                background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)`
              }}
            >
              <span
                className="text-sm font-black"
                style={{ color: computedRankColor }}
              >
                #{position + 1}
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-gray-600">
              {droppable ? "Drop here" : "Empty"}
            </span>
          </div>
        )}

        {/* Custom overlay content */}
        {overlayContent && (
          <div className="absolute inset-0 z-30">
            {overlayContent}
          </div>
        )}

        {/* Hover/Focus indicator */}
        {(occupied || droppable) && (
          <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors pointer-events-none" />
        )}
      </Component>
    );
  }
);

GridCard.displayName = "GridCard";

export { gridCardVariants };
