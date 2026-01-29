"use client";

import * as React from "react";
import { mapCategoryToTheme, type ThemeKey } from "@/lib/criteria/theme-mapping";
import {
  SportsScoreRenderer,
  MoviesScoreRenderer,
  MusicScoreRenderer,
  GamesScoreRenderer,
  DefaultScoreRenderer,
  type ScoreRendererProps,
} from "./renderers";

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

type RendererComponent = React.ComponentType<ScoreRendererProps>;

/**
 * Map theme keys to their respective renderer components
 */
const THEME_RENDERERS: Record<ThemeKey, RendererComponent> = {
  sports: SportsScoreRenderer,
  movies: MoviesScoreRenderer,
  music: MusicScoreRenderer,
  games: GamesScoreRenderer,
  default: DefaultScoreRenderer,
};

/**
 * Factory component that renders themed score display based on category.
 *
 * Automatically detects the appropriate visual theme from the category prop
 * and routes to category-specific renderers with unique visual character:
 *
 * - Sports: Health bar with segments, red/yellow/green coloring
 * - Movies: 5-star rating with cinematic gold styling
 * - Music: 5 equalizer bars with purple/blue gradient
 * - Games: XP bar with level indicator and green glow
 * - Default: Clean minimal cyan progress bar
 *
 * @example
 * ```tsx
 * // Sports score with health bar styling
 * <ThemedScoreDisplay score={85} category="Sports" variant="full" showLabel />
 *
 * // Movie score with star rating
 * <ThemedScoreDisplay score={92} category="Movies" variant="compact" />
 *
 * // Music score with equalizer bars
 * <ThemedScoreDisplay score={78} category="Music" variant="full" showLabel />
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
  const Renderer = THEME_RENDERERS[theme];

  return (
    <Renderer
      score={score}
      variant={variant}
      showLabel={showLabel}
      animated={animated}
      className={className}
    />
  );
}
