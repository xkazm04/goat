"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScoreRendererProps } from "./types";

// Score thresholds for color coding
const SCORE_LOW_THRESHOLD = 33;
const SCORE_MID_THRESHOLD = 66;

/**
 * Get health bar gradient color based on score
 */
function getHealthColor(score: number): string {
  if (score >= SCORE_MID_THRESHOLD + 1) return "from-green-500 to-emerald-400";
  if (score >= SCORE_LOW_THRESHOLD + 1) return "from-yellow-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

/**
 * Get performance label based on score
 */
function getHealthLabel(score: number): string {
  if (score >= 80) return "ELITE";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "AVG";
  return "LOW";
}

/**
 * Sports-themed score renderer with health bar styling.
 *
 * Features:
 * - 10 segment health bar visualization
 * - Score-based color coding (red <34, yellow 34-66, green >66)
 * - Performance label (ELITE, GOOD, AVG, LOW)
 *
 * @example
 * ```tsx
 * <SportsScoreRenderer score={85} variant="full" showLabel />
 * ```
 */
export function SportsScoreRenderer({
  score,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ScoreRendererProps) {
  const colorClass = getHealthColor(score);
  const label = getHealthLabel(score);

  return (
    <div className={cn("relative", className)}>
      {/* Health bar container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-sm bg-gray-900/90 border border-gray-700/50",
          variant === "compact" && "h-2",
          variant === "full" && "h-4",
          variant === "inline" && "h-1.5 w-16"
        )}
      >
        {/* Fill */}
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 bg-gradient-to-r",
            colorClass
          )}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* Segments (health bar style) */}
        {variant !== "inline" && (
          <div className="absolute inset-0 flex">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-gray-800/50 last:border-r-0"
              />
            ))}
          </div>
        )}
      </div>
      {/* Label */}
      {showLabel && variant === "full" && (
        <div className="flex justify-between mt-1">
          <span className="text-xs font-bold tracking-wider text-gray-400">
            {label}
          </span>
          <span className="text-xs font-mono text-gray-500">
            {score.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}
