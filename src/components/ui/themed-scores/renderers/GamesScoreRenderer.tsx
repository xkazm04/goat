"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ScoreRendererProps } from "./types";

// Level calculation constants
const LEVEL_DIVISOR = 10;
const MAX_LEVEL = 10;
const MAX_SCORE = 100;

// Animation configuration
const ANIMATION_DURATION = 0.5;

// Glow effect for XP bar
const XP_BAR_GLOW =
  "0 0 8px rgba(34, 197, 94, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)";

/**
 * Calculate XP level from score
 * Score 0-100 maps to levels 1-10
 */
function getXPLevel(score: number): { level: number; progress: number } {
  const level = Math.floor(score / LEVEL_DIVISOR) + 1;
  const progress = (score % LEVEL_DIVISOR) * LEVEL_DIVISOR;
  return {
    level: Math.min(level, MAX_LEVEL),
    progress: score >= MAX_SCORE ? MAX_SCORE : progress,
  };
}

/**
 * Games-themed score renderer with XP bar styling.
 *
 * Features:
 * - XP bar with gaming UI aesthetic
 * - Green glow effect on fill
 * - Level indicator (LVL 1-10)
 * - Scanline visual effect
 *
 * @example
 * ```tsx
 * <GamesScoreRenderer score={85} variant="full" showLabel />
 * ```
 */
export function GamesScoreRenderer({
  score,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ScoreRendererProps) {
  const { level } = getXPLevel(score);

  return (
    <div className={cn("relative", className)}>
      {/* XP bar container with gaming aesthetic */}
      <div
        className={cn(
          "relative overflow-hidden bg-black/90 border border-green-500/30",
          variant === "compact" && "h-2 rounded-sm",
          variant === "full" && "h-4 rounded",
          variant === "inline" && "h-1.5 w-16 rounded-sm"
        )}
      >
        {/* XP fill with glow effect */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 via-emerald-500 to-green-400"
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${score}%` }}
          transition={{ duration: ANIMATION_DURATION, ease: "easeOut" }}
          style={{
            boxShadow: XP_BAR_GLOW,
          }}
        />
        {/* Scanline effect */}
        {variant !== "inline" && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
        )}
      </div>
      {/* Level indicator */}
      {showLabel && variant === "full" && (
        <div className="flex justify-between mt-1">
          <span className="text-xs font-bold text-green-400">LVL {level}</span>
          <span className="text-xs font-mono text-green-500/70">
            {score.toFixed(0)} XP
          </span>
        </div>
      )}
    </div>
  );
}
