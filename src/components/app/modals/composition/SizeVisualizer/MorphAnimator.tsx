"use client";

import { memo, useEffect, useState, useRef, useCallback } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { ListSize, MorphState, getSizeOption } from "./types";

interface MorphAnimatorProps {
  fromSize: ListSize | number;
  toSize: ListSize | number;
  color: { primary: string; secondary: string; accent: string };
  onComplete?: () => void;
  duration?: number;
}

/**
 * Calculate interpolated grid dimensions
 */
function interpolateGridDimensions(
  fromSize: number,
  toSize: number,
  progress: number
): { cols: number; rows: number; slotCount: number } {
  // Lerp the sizes
  const currentSize = Math.round(fromSize + (toSize - fromSize) * progress);

  // Get dimensions based on current interpolated size
  let cols: number;
  let rows: number;

  if (currentSize <= 10) {
    cols = 5;
    rows = 2;
  } else if (currentSize <= 20) {
    cols = 5;
    rows = 4;
  } else if (currentSize <= 25) {
    cols = 5;
    rows = 5;
  } else if (currentSize <= 50) {
    cols = 10;
    rows = 5;
  } else {
    cols = 10;
    rows = Math.ceil(currentSize / 10);
  }

  return { cols, rows, slotCount: currentSize };
}

/**
 * Morph Animator Component
 * Handles smooth transitions between different list sizes
 */
export const MorphAnimator = memo(function MorphAnimator({
  fromSize,
  toSize,
  color,
  onComplete,
  duration = 600,
}: MorphAnimatorProps) {
  const [morphState, setMorphState] = useState<MorphState>({
    fromSize: fromSize as ListSize,
    toSize: toSize as ListSize,
    progress: 0,
    isActive: true,
  });

  // Spring-based progress animation
  const springProgress = useSpring(0, {
    stiffness: 80,
    damping: 20,
    mass: 1,
  });

  // Interpolated values
  const interpolatedSize = useTransform(
    springProgress,
    [0, 1],
    [fromSize, toSize]
  );

  // Start animation when sizes change
  useEffect(() => {
    if (fromSize !== toSize) {
      springProgress.set(0);
      setMorphState({
        fromSize: fromSize as ListSize,
        toSize: toSize as ListSize,
        progress: 0,
        isActive: true,
      });

      // Animate to completion
      const timeout = setTimeout(() => {
        springProgress.set(1);
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [fromSize, toSize, springProgress]);

  // Track completion
  useEffect(() => {
    const unsubscribe = springProgress.on("change", (value) => {
      setMorphState((prev) => ({
        ...prev,
        progress: value,
        isActive: value < 0.99,
      }));

      if (value >= 0.99 && onComplete) {
        onComplete();
      }
    });

    return unsubscribe;
  }, [springProgress, onComplete]);

  // Get current interpolated dimensions
  const currentDimensions = interpolateGridDimensions(
    fromSize,
    toSize,
    morphState.progress
  );

  const cellSize = 12;
  const gap = 2;
  const containerWidth = currentDimensions.cols * cellSize + (currentDimensions.cols - 1) * gap;
  const containerHeight = currentDimensions.rows * cellSize + (currentDimensions.rows - 1) * gap;

  // Generate slots for current state
  const slots = Array.from({ length: currentDimensions.slotCount }, (_, i) => ({
    id: i,
    row: Math.floor(i / currentDimensions.cols),
    col: i % currentDimensions.cols,
    isNew: i >= fromSize,
    isRemoving: i >= toSize && fromSize > toSize,
  }));

  return (
    <div className="relative">
      {/* Morphing container */}
      <motion.div
        className="relative overflow-hidden rounded-lg"
        style={{
          width: containerWidth,
          height: containerHeight,
          background: "rgba(15, 23, 42, 0.5)",
          border: `1px solid ${color.primary}30`,
        }}
        animate={{
          width: containerWidth,
          height: containerHeight,
        }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
        }}
      >
        {/* Grid */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${currentDimensions.cols}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {slots.map((slot) => (
              <motion.div
                key={slot.id}
                className="rounded-sm"
                style={{
                  width: cellSize,
                  height: cellSize,
                }}
                initial={slot.isNew ? { scale: 0, opacity: 0 } : false}
                animate={{
                  scale: 1,
                  opacity: 1,
                  background: slot.isNew
                    ? `linear-gradient(135deg, ${color.accent}, ${color.primary})`
                    : `linear-gradient(135deg, ${color.primary}80, ${color.secondary}60)`,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: slot.isNew ? slot.id * 0.02 : 0,
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Progress overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${color.primary}10, transparent)`,
          }}
          animate={{
            scaleX: morphState.progress,
            transformOrigin: "left",
          }}
        />
      </motion.div>

      {/* Size indicator */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-xs text-slate-400">{fromSize}</span>
        <motion.div
          className="w-12 h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(71, 85, 105, 0.4)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color.primary}, ${color.accent})`,
            }}
            animate={{
              width: `${morphState.progress * 100}%`,
            }}
          />
        </motion.div>
        <span
          className="text-xs font-medium"
          style={{ color: color.accent }}
        >
          {toSize}
        </span>
      </motion.div>
    </div>
  );
});

/**
 * Hook for morph animation state
 */
export function useMorphAnimation(initialSize: ListSize | number) {
  const [currentSize, setCurrentSize] = useState(initialSize);
  const [previousSize, setPreviousSize] = useState(initialSize);
  const [isAnimating, setIsAnimating] = useState(false);

  const changeSize = useCallback((newSize: ListSize | number) => {
    if (newSize !== currentSize) {
      setPreviousSize(currentSize);
      setCurrentSize(newSize);
      setIsAnimating(true);
    }
  }, [currentSize]);

  const handleAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    setPreviousSize(currentSize);
  }, [currentSize]);

  return {
    currentSize,
    previousSize,
    isAnimating,
    changeSize,
    handleAnimationComplete,
  };
}
