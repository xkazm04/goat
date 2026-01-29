"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScoreRendererProps } from "./types";

// Animation configuration
const ANIMATION_DELAY_STEP = 0.05;
const ANIMATION_DURATION = 0.4;

// Bar configuration
const BAR_COUNT = 5;
const BAR_FACTORS = [0.6, 1, 0.8, 0.9, 0.5];
const VARIATION_SEED_MULTIPLIER = 17;
const VARIATION_MOD = 20;
const VARIATION_DIVISOR = 100;

/**
 * Generate equalizer bar heights based on score
 * Creates a deterministic pattern that varies with score
 */
function getBarHeights(score: number): number[] {
  const baseHeight = score / 100;
  return BAR_FACTORS.map((factor, i) => {
    const variation =
      ((score + i * VARIATION_SEED_MULTIPLIER) % VARIATION_MOD) /
      VARIATION_DIVISOR;
    return Math.min(1, baseHeight * factor + variation);
  });
}

/**
 * Music-themed score renderer with waveform/equalizer aesthetic.
 *
 * Features:
 * - 5 equalizer bars with varying heights
 * - Purple/blue gradient coloring
 * - Staggered animation for visual appeal
 *
 * @example
 * ```tsx
 * <MusicScoreRenderer score={75} variant="full" showLabel />
 * ```
 */
export function MusicScoreRenderer({
  score,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ScoreRendererProps) {
  const barHeights = getBarHeights(score);
  const barHeight = variant === "compact" ? 12 : variant === "full" ? 20 : 8;

  return (
    <div
      className={cn(
        "flex items-end gap-0.5",
        variant === "inline" && "w-16",
        className
      )}
    >
      {barHeights.map((height, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm bg-gradient-to-t from-purple-600 to-blue-400"
          initial={animated ? { height: 0 } : false}
          animate={{ height: `${height * barHeight}px` }}
          transition={{
            duration: ANIMATION_DURATION,
            delay: i * ANIMATION_DELAY_STEP,
            ease: "easeOut",
          }}
        />
      ))}
      {showLabel && variant !== "inline" && (
        <span className="ml-2 text-xs text-purple-400/80 font-medium">
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}
