"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  variant?: "compact" | "full" | "inline" | "preview";
  /** Show numeric score value */
  showLabel?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Additional class names */
  className?: string;
  /** Preview mode - shows real-time feedback during scoring */
  isPreview?: boolean;
  /** Accent color for preview mode */
  accentColor?: string;
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

// Animation configuration for preview mode
const PREVIEW_ANIMATION = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1] as const,
};

// Preview mode background colors by theme
const PREVIEW_BG: Record<ThemeKey, string> = {
  sports: "rgba(34, 197, 94, 0.08)",
  movies: "rgba(234, 179, 8, 0.08)",
  music: "rgba(168, 85, 247, 0.08)",
  games: "rgba(16, 185, 129, 0.08)",
  default: "rgba(6, 182, 212, 0.08)",
};

const PREVIEW_BORDER: Record<ThemeKey, string> = {
  sports: "rgba(34, 197, 94, 0.2)",
  movies: "rgba(234, 179, 8, 0.2)",
  music: "rgba(168, 85, 247, 0.2)",
  games: "rgba(16, 185, 129, 0.2)",
  default: "rgba(6, 182, 212, 0.2)",
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
 *
 * // Preview mode during active scoring
 * <ThemedScoreDisplay score={75} category="Sports" isPreview />
 * ```
 */
export function ThemedScoreDisplay({
  score,
  category,
  variant = "compact",
  showLabel = false,
  animated = true,
  className,
  isPreview = false,
  accentColor,
}: ThemedScoreDisplayProps) {
  const theme = mapCategoryToTheme(category);
  const Renderer = THEME_RENDERERS[theme];

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Preview variant - compact display with enhanced feedback
  if (variant === "preview" || isPreview) {
    return (
      <PreviewWrapper
        theme={theme}
        accentColor={accentColor}
        animated={animated && !prefersReducedMotion}
        className={className}
      >
        <Renderer
          score={score}
          variant="inline"
          showLabel={showLabel}
          animated={animated && !prefersReducedMotion}
        />
      </PreviewWrapper>
    );
  }

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

/**
 * Preview wrapper with themed styling and entrance animation
 */
interface PreviewWrapperProps {
  theme: ThemeKey;
  accentColor?: string;
  animated?: boolean;
  className?: string;
  children: React.ReactNode;
}

function PreviewWrapper({
  theme,
  accentColor,
  animated = true,
  className,
  children,
}: PreviewWrapperProps) {
  const bgColor = accentColor ? `${accentColor}10` : PREVIEW_BG[theme];
  const borderColor = accentColor ? `${accentColor}30` : PREVIEW_BORDER[theme];

  if (!animated) {
    return (
      <div
        className={`relative rounded-lg px-2 py-1.5 backdrop-blur-sm transition-all duration-200 ${className ?? ""}`}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={`relative rounded-lg px-2 py-1.5 backdrop-blur-sm ${className ?? ""}`}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: PREVIEW_ANIMATION.duration,
        ease: PREVIEW_ANIMATION.ease,
      }}
    >
      {children}
    </motion.div>
  );
}
