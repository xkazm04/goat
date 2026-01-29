"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Score thresholds for sports theme color coding
const SCORE_LOW_THRESHOLD = 33;
const SCORE_MID_THRESHOLD = 66;

// Animation configuration
const ANIMATION_DURATION = 0.5;
const ANIMATION_EASE = "easeOut";

const scoreBarVariants = cva(
  "relative overflow-hidden rounded-full transition-all",
  {
    variants: {
      size: {
        sm: "h-1.5",
        md: "h-2",
        lg: "h-3",
      },
      theme: {
        sports: "bg-gray-800/80",
        movies: "bg-slate-900/80",
        music: "bg-purple-950/50",
        games: "bg-black/80",
        default: "bg-gray-700/80",
      },
    },
    defaultVariants: {
      size: "md",
      theme: "default",
    },
  }
);

const fillVariants = cva("absolute inset-y-0 left-0 rounded-full", {
  variants: {
    theme: {
      sports: "", // Color determined by score level
      movies: "bg-gradient-to-r from-yellow-600 to-yellow-400",
      music: "bg-gradient-to-r from-purple-600 to-blue-400",
      games: "bg-gradient-to-r from-green-600 to-emerald-400",
      default: "bg-gradient-to-r from-cyan-600 to-cyan-400",
    },
  },
  defaultVariants: {
    theme: "default",
  },
});

export interface ScoreBarProps
  extends VariantProps<typeof scoreBarVariants>,
    Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Score value (0-100) */
  value: number;
  /** Enable fill animation */
  animated?: boolean;
  /** Show value label inside or next to bar */
  showLabel?: boolean;
}

/**
 * Get the appropriate gradient class for sports theme based on score
 */
function getSportsGradient(score: number): string {
  if (score <= SCORE_LOW_THRESHOLD) {
    return "bg-gradient-to-r from-red-600 to-red-400";
  }
  if (score <= SCORE_MID_THRESHOLD) {
    return "bg-gradient-to-r from-yellow-600 to-yellow-400";
  }
  return "bg-gradient-to-r from-green-600 to-green-400";
}

/**
 * ScoreBar - Animated progress bar for displaying 0-100 scores
 *
 * Features:
 * - Animated fill with Framer Motion
 * - Theme-specific styling (sports, movies, music, games)
 * - Sports theme uses score-based color coding (red/yellow/green)
 * - Multiple size variants
 *
 * @example
 * ```tsx
 * <ScoreBar value={75} theme="sports" />
 * <ScoreBar value={85} theme="movies" size="lg" showLabel />
 * ```
 */
export function ScoreBar({
  value,
  size = "md",
  theme = "default",
  animated = true,
  showLabel = false,
  className,
  ...props
}: ScoreBarProps) {
  // Clamp value to 0-100 range
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine fill class based on theme
  const fillClass =
    theme === "sports"
      ? getSportsGradient(clampedValue)
      : fillVariants({ theme });

  return (
    <div
      className={cn(scoreBarVariants({ size, theme }), className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score: ${clampedValue} out of 100`}
      {...props}
    >
      {animated ? (
        <motion.div
          className={cn("h-full", fillClass)}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: ANIMATION_DURATION, ease: ANIMATION_EASE }}
        />
      ) : (
        <div
          className={cn("h-full", fillClass)}
          style={{ width: `${clampedValue}%` }}
        />
      )}
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 tabular-nums">
          {clampedValue.toFixed(0)}
        </span>
      )}
    </div>
  );
}
