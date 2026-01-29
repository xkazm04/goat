"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScoreRendererProps } from "./types";

// Animation configuration
const ANIMATION_DURATION = 0.5;

/**
 * Default score renderer with clean minimal styling.
 *
 * Features:
 * - Clean cyan progress bar
 * - Rounded pill shape
 * - Subtle gradient fill
 *
 * Used for categories that don't have a specific theme.
 *
 * @example
 * ```tsx
 * <DefaultScoreRenderer score={75} variant="full" showLabel />
 * ```
 */
export function DefaultScoreRenderer({
  score,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ScoreRendererProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-gray-800/80",
          variant === "compact" && "h-1.5",
          variant === "full" && "h-2.5",
          variant === "inline" && "h-1 w-16"
        )}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ duration: ANIMATION_DURATION, ease: "easeOut" }}
        />
      </div>
      {showLabel && variant !== "inline" && (
        <span className="ml-2 text-xs text-gray-400">{score.toFixed(0)}</span>
      )}
    </div>
  );
}
