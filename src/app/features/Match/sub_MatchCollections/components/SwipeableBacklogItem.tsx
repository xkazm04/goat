"use client";

/**
 * SwipeableBacklogItem
 * Mobile backlog item with swipe gesture support.
 * Swipe left → assign to next open grid slot (green indicator)
 * Swipe right → dismiss/skip (red indicator)
 * Provides visual feedback with background color, icon, and spring-back animation.
 */

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef } from "react";

import { CollectionItem } from "@/app/features/Collection/types";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 400; // px/s for framer-motion

interface SwipeableBacklogItemProps {
  item: CollectionItem;
  isSelected: boolean;
  isUsed: boolean;
  onTap: () => void;
  onSwipeLeft: (item: CollectionItem) => boolean;
  onSwipeRight: (item: CollectionItem) => void;
}

export function SwipeableBacklogItem({
  item,
  isSelected,
  isUsed,
  onTap,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableBacklogItemProps) {
  const x = useMotionValue(0);
  const isAnimating = useRef(false);

  // Visual transforms based on swipe offset
  const leftIndicatorOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const scale = useTransform(
    x,
    [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5],
    [0.95, 1, 0.95]
  );

  const handleDragEnd = useCallback(
    (
      _: MouseEvent | TouchEvent | PointerEvent,
      info: { offset: { x: number }; velocity: { x: number } }
    ) => {
      if (isAnimating.current) return;

      const offsetX = info.offset.x;
      const velocityX = info.velocity.x;

      // Check threshold by distance or velocity
      const swipedLeft =
        offsetX < -SWIPE_THRESHOLD || velocityX < -VELOCITY_THRESHOLD;
      const swipedRight =
        offsetX > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD;

      if (swipedLeft) {
        isAnimating.current = true;
        // Animate out to the left, then execute action
        animate(x, -300, {
          type: "spring",
          stiffness: 500,
          damping: 30,
          onComplete: () => {
            const success = onSwipeLeft(item);
            if (!success) {
              // Spring back if action failed (e.g., grid full)
              animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
            }
            isAnimating.current = false;
          },
        });
      } else if (swipedRight) {
        isAnimating.current = true;
        animate(x, 300, {
          type: "spring",
          stiffness: 500,
          damping: 30,
          onComplete: () => {
            onSwipeRight(item);
            // Spring back
            animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
            isAnimating.current = false;
          },
        });
      } else {
        // Below threshold — spring back
        animate(x, 0, { type: "spring", stiffness: 400, damping: 25 });
      }
    },
    [item, onSwipeLeft, onSwipeRight, x]
  );

  if (isUsed) return null;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action indicator (assign) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-3 bg-emerald-500/30 rounded-lg"
        style={{ opacity: leftIndicatorOpacity }}
      >
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      </motion.div>

      {/* Right action indicator (dismiss) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-3 bg-red-500/30 rounded-lg"
        style={{ opacity: rightIndicatorOpacity }}
      >
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </div>
      </motion.div>

      {/* Swipeable card */}
      <motion.button
        style={{ x, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={onTap}
        className={cn(
          "relative z-10 flex items-center gap-3 w-full p-2 rounded-lg transition-colors touch-pan-y",
          "bg-white/5 active:bg-white/10",
          isSelected && "ring-2 ring-brand-primary bg-brand-primary/10"
        )}
      >
        <div className="w-10 h-10 rounded-md overflow-hidden bg-white/10 shrink-0">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.title}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
              ?
            </div>
          )}
        </div>
        <span className="text-sm text-white/80 truncate flex-1 text-left">
          {item.title}
        </span>
      </motion.button>
    </div>
  );
}
