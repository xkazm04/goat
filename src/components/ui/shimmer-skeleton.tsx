"use client";

import { motion } from "framer-motion";

/**
 * Accent color options for the shimmer skeleton glow effect
 */
export type ShimmerAccentColor = "cyan" | "amber" | "violet" | "rose" | "emerald" | "slate";

/**
 * Size presets for the shimmer skeleton
 */
export type ShimmerSize = "sm" | "md" | "lg" | "xl" | "card";

/**
 * Props for the ShimmerSkeleton component
 */
export interface ShimmerSkeletonProps {
  /** Size preset or custom className for height */
  size?: ShimmerSize;
  /** Custom height className (overrides size) */
  heightClass?: string;
  /** Accent color for the subtle glow effect */
  accentColor?: ShimmerAccentColor;
  /** Animation duration in seconds (default: 1.5) */
  duration?: number;
  /** Border radius className (default: "rounded-xl") */
  borderRadius?: string;
  /** Additional className */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// Height classes for each size preset
const SIZE_HEIGHT_MAP: Record<ShimmerSize, string> = {
  sm: "h-12",
  md: "h-16",
  lg: "h-20",
  xl: "h-28",
  card: "h-32",
};

// Accent color glow configurations
const ACCENT_GLOW_MAP: Record<ShimmerAccentColor, { gradient: string; glow: string }> = {
  cyan: {
    gradient: "rgba(6, 182, 212, 0.08)",
    glow: "0 0 20px rgba(6, 182, 212, 0.1)",
  },
  amber: {
    gradient: "rgba(245, 158, 11, 0.08)",
    glow: "0 0 20px rgba(245, 158, 11, 0.1)",
  },
  violet: {
    gradient: "rgba(139, 92, 246, 0.08)",
    glow: "0 0 20px rgba(139, 92, 246, 0.1)",
  },
  rose: {
    gradient: "rgba(244, 63, 94, 0.08)",
    glow: "0 0 20px rgba(244, 63, 94, 0.1)",
  },
  emerald: {
    gradient: "rgba(16, 185, 129, 0.08)",
    glow: "0 0 20px rgba(16, 185, 129, 0.1)",
  },
  slate: {
    gradient: "rgba(100, 116, 139, 0.08)",
    glow: "0 0 20px rgba(100, 116, 139, 0.1)",
  },
};

/**
 * Premium shimmer skeleton component with animated gradient effect.
 * Matches the loading state aesthetic used in FeaturedListsSection.
 *
 * Features:
 * - Linear gradient shimmer animation (105deg sweep)
 * - Optional accent color glow for visual polish
 * - Size presets or custom height
 * - Smooth, looping animation
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ShimmerSkeleton size="lg" />
 *
 * // With accent color glow
 * <ShimmerSkeleton size="xl" accentColor="cyan" />
 *
 * // Custom height
 * <ShimmerSkeleton heightClass="h-24" accentColor="amber" />
 * ```
 */
export function ShimmerSkeleton({
  size = "lg",
  heightClass,
  accentColor,
  duration = 1.5,
  borderRadius = "rounded-xl",
  className = "",
  testId = "shimmer-skeleton",
}: ShimmerSkeletonProps) {
  const height = heightClass || SIZE_HEIGHT_MAP[size];
  const accent = accentColor ? ACCENT_GLOW_MAP[accentColor] : null;

  // Base background gradient - matches FeaturedListsSection
  const baseBackground = accent
    ? `linear-gradient(135deg, rgba(30, 41, 59, 0.6), ${accent.gradient}, rgba(51, 65, 85, 0.4))`
    : `linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))`;

  return (
    <motion.div
      className={`${height} ${borderRadius} overflow-hidden relative ${className}`}
      style={{
        background: baseBackground,
        boxShadow: accent ? accent.glow : undefined,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid={testId}
    >
      {/* Shimmer sweep animation */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
        data-testid={`${testId}-shimmer`}
      />
    </motion.div>
  );
}

/**
 * Grid skeleton preset matching card layouts (like FeatureListItem)
 */
export function ShimmerCardSkeleton({
  accentColor = "cyan",
  className = "",
  testId = "shimmer-card-skeleton",
}: Omit<ShimmerSkeletonProps, "size" | "heightClass">) {
  return (
    <ShimmerSkeleton
      size="lg"
      accentColor={accentColor}
      className={className}
      testId={testId}
    />
  );
}

/**
 * List item skeleton preset for vertical list layouts
 */
export function ShimmerListItemSkeleton({
  accentColor,
  className = "",
  testId = "shimmer-list-skeleton",
}: Omit<ShimmerSkeletonProps, "size" | "heightClass">) {
  return (
    <ShimmerSkeleton
      size="md"
      accentColor={accentColor}
      className={className}
      testId={testId}
    />
  );
}

/**
 * Large grid skeleton for bigger card layouts
 */
export function ShimmerGridSkeleton({
  accentColor,
  className = "",
  testId = "shimmer-grid-skeleton",
}: Omit<ShimmerSkeletonProps, "size" | "heightClass">) {
  return (
    <ShimmerSkeleton
      size="xl"
      accentColor={accentColor}
      className={className}
      testId={testId}
    />
  );
}
