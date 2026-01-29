"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/ui/star-rating";
import type { ScoreRendererProps } from "./types";

// Conversion factor from 0-100 score to 0-5 star scale
const STAR_MAX = 5;
const SCORE_MAX = 100;

/**
 * Movies-themed score renderer with cinematic star rating.
 *
 * Features:
 * - 5-star rating converted from 0-100 score
 * - Cinematic gold styling
 * - Supports half-star precision
 *
 * @example
 * ```tsx
 * <MoviesScoreRenderer score={85} variant="compact" />
 * ```
 */
export function MoviesScoreRenderer({
  score,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ScoreRendererProps) {
  // Convert 0-100 to 0-5 star scale
  const starValue = (score / SCORE_MAX) * STAR_MAX;

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2",
        variant === "full" && "flex-col items-start gap-1",
        className
      )}
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <StarRating
        value={starValue}
        maxRating={STAR_MAX}
        size={variant === "compact" ? "sm" : "md"}
        showValue={false}
      />
      {showLabel && (
        <span
          className={cn(
            "text-yellow-500/80 font-medium",
            variant === "compact" && "text-xs",
            variant === "full" && "text-sm"
          )}
        >
          {score.toFixed(0)}%
        </span>
      )}
    </motion.div>
  );
}
