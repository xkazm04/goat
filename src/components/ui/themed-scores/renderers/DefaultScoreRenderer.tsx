"use client";

import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/constants/scoring";
import { AnimatedProgressBar } from "./AnimatedProgressBar";
import type { ScoreRendererProps } from "./types";

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
        <AnimatedProgressBar
          score={score}
          animated={animated}
          fillClassName="rounded-full bg-linear-to-r from-brand-muted to-brand-hover"
        />
      </div>
      {showLabel && variant !== "inline" && (
        <span className="ml-2 text-xs text-gray-400">{formatScore(score)}</span>
      )}
    </div>
  );
}
