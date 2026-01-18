"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListSize, GridSlot, RankingFormat, getSizeOption } from "./types";

interface GridPreviewProps {
  size: ListSize | number;
  format?: RankingFormat;
  color: { primary: string; secondary: string; accent: string };
  highlightedSlots?: number[];
  filledSlots?: number[];
  isAnimating?: boolean;
  compact?: boolean;
  showNumbers?: boolean;
  exampleItems?: string[];
  interactive?: boolean;
  onSlotHover?: (position: number | null) => void;
  onSlotClick?: (position: number) => void;
}

/**
 * Generates grid slots for the preview
 */
function generateGridSlots(
  size: number,
  cols: number,
  rows: number,
  highlightedSlots: number[],
  filledSlots: number[],
  exampleItems: string[]
): GridSlot[] {
  const slots: GridSlot[] = [];
  const totalSlots = Math.min(size, cols * rows);

  for (let i = 0; i < totalSlots; i++) {
    slots.push({
      position: i + 1,
      row: Math.floor(i / cols),
      col: i % cols,
      isHighlighted: highlightedSlots.includes(i + 1),
      isActive: filledSlots.includes(i + 1),
      exampleItem: exampleItems[i],
    });
  }

  return slots;
}

/**
 * Get grid dimensions based on size
 */
function getGridDimensions(size: number): { cols: number; rows: number } {
  const option = getSizeOption(size as ListSize);
  if (option) {
    return { cols: option.gridCols, rows: option.gridRows };
  }

  // For custom sizes, calculate optimal grid
  if (size <= 10) return { cols: 5, rows: 2 };
  if (size <= 20) return { cols: 5, rows: 4 };
  if (size <= 25) return { cols: 5, rows: 5 };
  if (size <= 50) return { cols: 10, rows: 5 };
  return { cols: 10, rows: Math.ceil(size / 10) };
}

/**
 * Grid Preview Component
 * Renders a visual preview of the ranking grid
 */
export const GridPreview = memo(function GridPreview({
  size,
  format = "standard",
  color,
  highlightedSlots = [],
  filledSlots = [],
  isAnimating = false,
  compact = false,
  showNumbers = false,
  exampleItems = [],
  interactive = false,
  onSlotHover,
  onSlotClick,
}: GridPreviewProps) {
  const { cols, rows } = useMemo(() => getGridDimensions(size), [size]);

  const slots = useMemo(
    () =>
      generateGridSlots(size, cols, rows, highlightedSlots, filledSlots, exampleItems),
    [size, cols, rows, highlightedSlots, filledSlots, exampleItems]
  );

  // Calculate cell size based on container
  const cellSize = compact ? 10 : 16;
  const gap = compact ? 2 : 3;
  const containerWidth = cols * cellSize + (cols - 1) * gap;
  const containerHeight = rows * cellSize + (rows - 1) * gap;

  return (
    <div
      className="relative"
      style={{
        width: containerWidth,
        height: containerHeight,
      }}
    >
      {/* Background glow */}
      <motion.div
        className="absolute -inset-4 rounded-xl opacity-30 blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${color.primary}40, transparent 70%)`,
        }}
        animate={{
          opacity: isAnimating ? [0.2, 0.4, 0.2] : 0.3,
        }}
        transition={{
          duration: 2,
          repeat: isAnimating ? Infinity : 0,
        }}
      />

      {/* Grid container */}
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        <AnimatePresence mode="popLayout">
          {slots.map((slot, index) => (
            <motion.div
              key={`${size}-${slot.position}`}
              className={`relative rounded-sm overflow-hidden group ${interactive ? 'cursor-pointer' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                delay: index * 0.01,
                duration: 0.2,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              onMouseEnter={() => interactive && onSlotHover?.(slot.position)}
              onMouseLeave={() => interactive && onSlotHover?.(null)}
              onClick={() => interactive && onSlotClick?.(slot.position)}
              whileHover={interactive ? { scale: 1.2, zIndex: 10 } : undefined}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `Position ${slot.position}${slot.exampleItem ? `: ${slot.exampleItem}` : ''}` : undefined}
              onKeyDown={(e) => {
                if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSlotClick?.(slot.position);
                }
              }}
            >
              {/* Slot background */}
              <motion.div
                className="absolute inset-0 rounded-sm"
                style={{
                  background: slot.isActive
                    ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                    : slot.isHighlighted
                    ? `linear-gradient(135deg, ${color.accent}60, ${color.primary}40)`
                    : "rgba(51, 65, 85, 0.5)",
                  border: slot.isHighlighted
                    ? `1px solid ${color.accent}`
                    : "1px solid rgba(71, 85, 105, 0.3)",
                  boxShadow: slot.isActive
                    ? `0 2px 8px ${color.primary}40`
                    : slot.isHighlighted
                    ? `0 0 8px ${color.accent}30`
                    : "none",
                }}
                animate={{
                  scale: slot.isHighlighted ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 0.6,
                  repeat: slot.isHighlighted ? Infinity : 0,
                  repeatDelay: 1,
                }}
              />

              {/* Position number (optional) */}
              {showNumbers && !compact && (
                <div
                  className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
                  style={{
                    color: slot.isActive ? "white" : "rgba(148, 163, 184, 0.6)",
                  }}
                >
                  {slot.position}
                </div>
              )}

              {/* Tier indicator for tier format */}
              {format === "tier" && !compact && (
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{
                    background: getTierColor(slot.position, size),
                  }}
                />
              )}

              {/* Example item tooltip on hover (for interactive mode) */}
              {interactive && slot.exampleItem && !compact && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
                >
                  <div
                    className="px-2 py-1 rounded text-[8px] font-medium text-white whitespace-nowrap"
                    style={{
                      background: color.primary,
                      boxShadow: `0 2px 8px ${color.primary}60`,
                    }}
                  >
                    #{slot.position}: {slot.exampleItem}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Size label */}
      {!compact && (
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span
            className="text-xs font-medium"
            style={{
              color: color.accent,
            }}
          >
            {size} slots
          </span>
        </motion.div>
      )}
    </div>
  );
});

/**
 * Get tier color based on position
 */
function getTierColor(position: number, totalSize: number): string {
  const percentage = position / totalSize;

  if (percentage <= 0.1) return "#ffd700"; // Gold - S tier
  if (percentage <= 0.25) return "#c0c0c0"; // Silver - A tier
  if (percentage <= 0.5) return "#cd7f32"; // Bronze - B tier
  if (percentage <= 0.75) return "#4ade80"; // Green - C tier
  return "#94a3b8"; // Gray - D tier
}

/**
 * Mini grid preview for compact displays
 */
export const MiniGridPreview = memo(function MiniGridPreview({
  size,
  color,
  isActive = false,
}: {
  size: ListSize | number;
  color: { primary: string; secondary: string; accent: string };
  isActive?: boolean;
}) {
  const { cols, rows } = getGridDimensions(size);
  const displayCols = Math.min(cols, 5);
  const displayRows = Math.min(rows, 3);
  const cellSize = 4;
  const gap = 1;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${displayCols}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: displayCols * displayRows }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{
            width: cellSize,
            height: cellSize,
            background: isActive
              ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
              : "rgba(71, 85, 105, 0.4)",
          }}
        />
      ))}
      {size > displayCols * displayRows && (
        <div
          className="absolute bottom-0 right-0 text-[6px]"
          style={{ color: color.accent }}
        >
          +{size - displayCols * displayRows}
        </div>
      )}
    </div>
  );
});
