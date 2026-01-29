"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { mapCategoryToTheme } from "@/lib/criteria/theme-mapping";
import { ScoreBar } from "./ScoreBar";

export interface ThemedScoreDisplayProps {
  /** Weighted score value (0-100) */
  score: number;
  /** Category name for theme detection */
  category?: string;
  /** Display variant */
  variant?: "compact" | "full" | "inline";
  /** Show numeric score value */
  showLabel?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Factory component that renders themed score display based on category.
 *
 * The component automatically detects the appropriate visual theme from
 * the category prop and renders the score with category-specific styling.
 *
 * Currently renders ScoreBar with theme styling.
 * Will be extended in Plan 02 to route to category-specific renderers.
 *
 * @example
 * ```tsx
 * // Sports score with red/yellow/green coding
 * <ThemedScoreDisplay score={85} category="Sports" />
 *
 * // Movie score with gold gradient
 * <ThemedScoreDisplay score={92} category="Movies" variant="full" showLabel />
 *
 * // Inline variant for compact displays
 * <ThemedScoreDisplay score={78} category="Music" variant="inline" showLabel />
 * ```
 */
export function ThemedScoreDisplay({
  score,
  category,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
}: ThemedScoreDisplayProps) {
  const theme = mapCategoryToTheme(category);

  // Size mapping based on variant
  const size = variant === "compact" ? "sm" : variant === "full" ? "lg" : "md";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        variant === "inline" && "flex-row",
        variant === "full" && "flex-col items-start gap-1",
        className
      )}
    >
      <ScoreBar
        value={score}
        theme={theme}
        size={size}
        animated={animated}
        showLabel={showLabel && variant !== "inline"}
        className={cn(
          variant === "compact" && "w-full",
          variant === "full" && "w-full",
          variant === "inline" && "w-16"
        )}
      />
      {showLabel && variant === "inline" && (
        <span className="text-xs text-gray-400 tabular-nums">
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}
