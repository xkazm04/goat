"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  SCORE_ANIMATION_DURATION,
  SCORE_ANIMATION_EASE,
} from "@/lib/constants/scoring";

export interface AnimatedProgressBarProps {
  /** Fill percentage (0-100) */
  score: number;
  /** Whether to animate from 0 on mount */
  animated?: boolean;
  /** Tailwind classes applied to the motion fill element */
  fillClassName?: string;
  /** Optional inline styles on the fill element (e.g. boxShadow) */
  fillStyle?: React.CSSProperties;
  /** Override default animation duration (seconds) */
  duration?: number;
}

/**
 * Reusable animated progress-bar fill used by multiple themed renderers.
 *
 * Renders only the inner `motion.div` — the outer container (with height,
 * border-radius, background, etc.) is the caller's responsibility.
 */
export function AnimatedProgressBar({
  score,
  animated = true,
  fillClassName,
  fillStyle,
  duration = SCORE_ANIMATION_DURATION,
}: AnimatedProgressBarProps) {
  return (
    <motion.div
      className={cn("absolute inset-y-0 left-0", fillClassName)}
      initial={animated ? { width: 0 } : false}
      animate={{ width: `${score}%` }}
      transition={{ duration, ease: SCORE_ANIMATION_EASE }}
      style={fillStyle}
    />
  );
}
