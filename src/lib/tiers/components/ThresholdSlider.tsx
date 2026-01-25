'use client';

/**
 * ThresholdSlider
 * Multi-thumb range slider for adjusting tier boundaries
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition } from '../types';

interface ThresholdSliderProps {
  /** Array of boundary positions (absolute values) */
  boundaries: number[];
  /** Total list size */
  listSize: number;
  /** Tier definitions for colors */
  tiers: TierDefinition[];
  /** Called when boundary is being dragged */
  onBoundaryChange: (index: number, position: number) => void;
  /** Called when drag starts */
  onDragStart?: (index: number) => void;
  /** Called when drag ends */
  onDragEnd?: (index: number) => void;
  /** Minimum gap between boundaries */
  minGap?: number;
  /** Show position labels */
  showLabels?: boolean;
  /** Show percentage labels */
  showPercentages?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Height of the slider */
  height?: number;
}

interface ThumbProps {
  position: number;  // 0-100 percentage
  index: number;
  color: string;
  isDragging: boolean;
  disabled: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  label?: string;
}

/**
 * Individual thumb component
 */
function Thumb({
  position,
  index,
  color,
  isDragging,
  disabled,
  onMouseDown,
  label,
}: ThumbProps) {
  return (
    <motion.div
      className={cn(
        'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
        'w-4 h-8 rounded-full cursor-grab',
        'flex items-center justify-center',
        'shadow-lg border-2 border-white/20',
        'transition-shadow duration-150',
        isDragging && 'cursor-grabbing z-20 scale-110',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && 'hover:shadow-xl hover:scale-105'
      )}
      style={{
        left: `${position}%`,
        backgroundColor: color,
      }}
      onMouseDown={disabled ? undefined : onMouseDown}
      initial={false}
      animate={{
        scale: isDragging ? 1.15 : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Grip lines */}
      <div className="flex flex-col gap-0.5">
        <div className="w-1.5 h-0.5 bg-white/40 rounded-full" />
        <div className="w-1.5 h-0.5 bg-white/40 rounded-full" />
        <div className="w-1.5 h-0.5 bg-white/40 rounded-full" />
      </div>

      {/* Label tooltip */}
      <AnimatePresence>
        {isDragging && label && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
              {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Tier segment between boundaries
 */
function TierSegment({
  startPct,
  endPct,
  tier,
  showLabel,
  itemCount,
}: {
  startPct: number;
  endPct: number;
  tier: TierDefinition;
  showLabel: boolean;
  itemCount: number;
}) {
  const width = endPct - startPct;

  return (
    <div
      className="absolute top-0 bottom-0 flex items-center justify-center overflow-hidden"
      style={{
        left: `${startPct}%`,
        width: `${width}%`,
        background: tier.color.gradient,
      }}
    >
      {showLabel && width > 8 && (
        <div
          className="text-xs font-medium truncate px-1"
          style={{ color: tier.color.text }}
        >
          {tier.label}
          {width > 15 && (
            <span className="opacity-70 ml-1">({itemCount})</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ThresholdSlider component
 */
export function ThresholdSlider({
  boundaries,
  listSize,
  tiers,
  onBoundaryChange,
  onDragStart,
  onDragEnd,
  minGap = 1,
  showLabels = true,
  showPercentages = true,
  disabled = false,
  className,
  height = 48,
}: ThresholdSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Convert boundaries to percentages
  const percentages = boundaries.map(b => (listSize > 0 ? (b / listSize) * 100 : 0));

  // Get position from mouse event
  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return Math.round((percentage / 100) * listSize);
  }, [listSize]);

  // Handle mouse down on thumb
  const handleThumbMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
    onDragStart?.(index);
  }, [onDragStart]);

  // Handle mouse move (global)
  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = getPositionFromEvent(e.clientX);

      // Calculate bounds based on adjacent boundaries
      const minPos = draggingIndex > 0
        ? boundaries[draggingIndex - 1] + minGap
        : minGap;
      const maxPos = draggingIndex < boundaries.length - 1
        ? boundaries[draggingIndex + 1] - minGap
        : listSize - minGap;

      const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));
      onBoundaryChange(draggingIndex, clampedPosition);
    };

    const handleMouseUp = () => {
      onDragEnd?.(draggingIndex);
      setDraggingIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, boundaries, listSize, minGap, getPositionFromEvent, onBoundaryChange, onDragEnd]);

  // Get tier color for boundary thumb
  const getThumbColor = (index: number): string => {
    // Use the color of the tier above this boundary
    if (index > 0 && index <= tiers.length) {
      return tiers[index - 1]?.color.primary || '#666';
    }
    return '#666';
  };

  // Internal boundaries (exclude first 0 and last listSize)
  const internalBoundaryIndices = boundaries
    .map((_, i) => i)
    .filter(i => i > 0 && i < boundaries.length - 1);

  return (
    <div className={cn('relative select-none', className)}>
      {/* Top labels (percentages) */}
      {showPercentages && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1 px-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          'relative rounded-lg overflow-hidden',
          'border border-white/10',
          disabled && 'opacity-50'
        )}
        style={{ height }}
      >
        {/* Tier segments */}
        {tiers.map((tier, i) => {
          const startPct = percentages[i] || 0;
          const endPct = percentages[i + 1] || 100;
          const itemCount = boundaries[i + 1] - boundaries[i];

          return (
            <TierSegment
              key={tier.id}
              startPct={startPct}
              endPct={endPct}
              tier={tier}
              showLabel={showLabels}
              itemCount={itemCount}
            />
          );
        })}

        {/* Boundary thumbs */}
        {internalBoundaryIndices.map(index => (
          <Thumb
            key={`thumb-${index}`}
            position={percentages[index]}
            index={index}
            color={getThumbColor(index)}
            isDragging={draggingIndex === index}
            disabled={disabled}
            onMouseDown={handleThumbMouseDown(index)}
            label={`Position ${boundaries[index]} (${Math.round(percentages[index])}%)`}
          />
        ))}

        {/* Track overlay for click-to-move */}
        <div
          className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
          onMouseMove={(e) => {
            if (draggingIndex !== null) return;
            const pos = getPositionFromEvent(e.clientX);
            // Find closest boundary
            let closest = -1;
            let minDist = Infinity;
            internalBoundaryIndices.forEach(idx => {
              const dist = Math.abs(boundaries[idx] - pos);
              if (dist < minDist) {
                minDist = dist;
                closest = idx;
              }
            });
            if (minDist < listSize * 0.1) {
              setHoverIndex(closest);
            } else {
              setHoverIndex(null);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </div>

      {/* Bottom labels (positions) */}
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
          <span>1</span>
          {listSize > 20 && <span>{Math.round(listSize / 4)}</span>}
          <span>{Math.round(listSize / 2)}</span>
          {listSize > 20 && <span>{Math.round(listSize * 3 / 4)}</span>}
          <span>{listSize}</span>
        </div>
      )}

      {/* Instructions */}
      {!disabled && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Drag the handles to adjust tier boundaries
        </p>
      )}
    </div>
  );
}

/**
 * Compact slider variant
 */
export function ThresholdSliderCompact({
  boundaries,
  listSize,
  tiers,
  onBoundaryChange,
  disabled = false,
  className,
}: Omit<ThresholdSliderProps, 'showLabels' | 'showPercentages' | 'height'>) {
  return (
    <ThresholdSlider
      boundaries={boundaries}
      listSize={listSize}
      tiers={tiers}
      onBoundaryChange={onBoundaryChange}
      disabled={disabled}
      showLabels={false}
      showPercentages={false}
      height={32}
      className={className}
    />
  );
}

export default ThresholdSlider;
