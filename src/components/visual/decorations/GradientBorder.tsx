'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// GRADIENT PRESETS
// =============================================================================

/**
 * Pre-defined gradient presets for common use cases
 * Medal colors for ranking displays, utility colors for general use
 */
export const GRADIENT_PRESETS = {
  // Medal colors (for ranking/podium displays)
  gold: 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)',
  silver: 'linear-gradient(135deg, #cbd5e1, #94a3b8, #cbd5e1)',
  bronze: 'linear-gradient(135deg, #fb923c, #ea580c, #fb923c)',
  // Utility colors
  primary: 'linear-gradient(135deg, #06b6d4, #0891b2, #06b6d4)',
  rainbow: 'linear-gradient(135deg, #f472b6, #8b5cf6, #06b6d4, #22c55e)',
} as const;

export type GradientPreset = keyof typeof GRADIENT_PRESETS;

// =============================================================================
// TYPES
// =============================================================================

export interface GradientBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Border width in pixels
   * @default 2
   */
  borderWidth?: number;
  /**
   * CSS gradient string or preset name
   * @default GRADIENT_PRESETS.primary
   */
  gradient?: string | GradientPreset;
  /**
   * Tailwind rounded class for border radius
   * @default 'rounded-lg'
   */
  rounded?: string;
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * GradientBorder - Wraps content with a gradient border
 *
 * Uses padding + background approach (not background-clip) to avoid
 * transform conflicts with animations and 3D effects.
 *
 * @example
 * // Using preset
 * <GradientBorder gradient="gold">
 *   <Card>1st Place</Card>
 * </GradientBorder>
 *
 * @example
 * // Custom gradient
 * <GradientBorder gradient="linear-gradient(90deg, red, blue)">
 *   <Card>Custom Border</Card>
 * </GradientBorder>
 *
 * @example
 * // Thicker border with different radius
 * <GradientBorder borderWidth={4} rounded="rounded-xl">
 *   <Card>Premium Content</Card>
 * </GradientBorder>
 */
export const GradientBorder = React.forwardRef<HTMLDivElement, GradientBorderProps>(
  (
    {
      borderWidth = 2,
      gradient = GRADIENT_PRESETS.primary,
      rounded = 'rounded-lg',
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Resolve gradient - check if it's a preset key or custom string
    const resolvedGradient =
      gradient in GRADIENT_PRESETS
        ? GRADIENT_PRESETS[gradient as GradientPreset]
        : gradient;

    return (
      <div
        ref={ref}
        className={cn('relative', rounded, className)}
        style={{ padding: borderWidth, background: resolvedGradient, ...style }}
        {...props}
      >
        <div className={cn('relative bg-background h-full', rounded)}>
          {children}
        </div>
      </div>
    );
  }
);

GradientBorder.displayName = 'GradientBorder';
