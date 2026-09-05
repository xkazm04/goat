"use client";

import { memo } from "react";

import { CSS_TIMING } from '@/lib/animations/motion-tokens';

export interface DropZoneEmptyProps {
  /** Position in the grid (0-based) */
  position: number;
  /** Whether this is a top-3 (podium) position */
  isTop3: boolean;
  /** Whether an item is being dragged over this zone */
  isOver: boolean;
  /** Whether a drag is globally active (any item being dragged) */
  isDragActive: boolean;
  /** Accent color for styling */
  accentColor: string;
}

/**
 * DropZoneEmpty
 * Renders the empty state of a drop zone with persistent affordance hints.
 */
export const DropZoneEmpty = memo(function DropZoneEmpty({
  position: _position,
  isTop3: _isTop3,
  isOver,
  isDragActive,
  accentColor: _accentColor,
}: DropZoneEmptyProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center ${CSS_TIMING.fadeIn}`}
    >
      {/* Persistent dashed border affordance — elevates during active drag */}
      <div
        className={`absolute inset-2 rounded-lg border-2 border-dashed pointer-events-none transition-all duration-300 ${
          isOver
            ? 'border-white/30'
            : isDragActive
              ? 'border-white/15 animate-[empty-slot-pulse_2s_ease-in-out_infinite]'
              : 'border-white/8'
        }`}
      />

      {isOver ? (
        <div className="text-brand-hover font-bold text-xs tracking-widest uppercase z-[1]">
          Drop Here
        </div>
      ) : (
        <span
          className={`text-[10px] select-none transition-opacity duration-300 z-[1] ${
            isDragActive ? 'text-white/30' : 'text-white/20 group-hover:text-white/40'
          }`}
        >
          Drag item here
        </span>
      )}
    </div>
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
        className={`text-[6rem] font-black font-grotesk select-none transition-all ${CSS_TIMING.rankTransition}`}
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
