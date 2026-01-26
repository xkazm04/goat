'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  getGlow,
  GLOW_PRESET,
  type GlowColor,
  type GlowIntensity,
  type GlowPreset,
} from '@/components/visual/depth';

// =============================================================================
// TYPES
// =============================================================================

export interface GlowProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Glow color from depth tokens
   * @default 'primary'
   */
  color?: GlowColor;
  /**
   * Glow intensity level
   * @default 'medium'
   */
  intensity?: GlowIntensity;
  /**
   * Use a preset instead of color+intensity combination
   * When provided, overrides color and intensity props
   */
  preset?: GlowPreset;
  /**
   * Render glow as a background layer (diffuse, behind children)
   * vs directly on the wrapper element
   * @default false
   */
  asBackground?: boolean;
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Glow - Applies glow effects using depth system tokens
 *
 * Two modes:
 * 1. Direct (default): Applies glow as boxShadow on wrapper div
 * 2. Background: Creates diffuse glow layer behind children
 *
 * @example
 * // Direct glow
 * <Glow color="gold" intensity="medium">
 *   <Card>Content</Card>
 * </Glow>
 *
 * @example
 * // Preset glow
 * <Glow preset="goldIntense">
 *   <Card>Premium Content</Card>
 * </Glow>
 *
 * @example
 * // Background glow (diffuse)
 * <Glow color="primary" intensity="intense" asBackground>
 *   <Card>Highlighted Content</Card>
 * </Glow>
 */
export const Glow = React.forwardRef<HTMLDivElement, GlowProps>(
  (
    {
      color = 'primary',
      intensity = 'medium',
      preset,
      asBackground = false,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Compute glow value - use preset if provided, otherwise compute from color+intensity
    const glowValue = preset
      ? GLOW_PRESET[preset]
      : getGlow(intensity, color);

    // Background mode: glow layer behind children
    if (asBackground) {
      return (
        <div ref={ref} className={cn('relative', className)} style={style} {...props}>
          <div
            className="absolute inset-0 -z-10 rounded-[inherit] blur-xl pointer-events-none"
            style={{ boxShadow: glowValue }}
            aria-hidden="true"
          />
          {children}
        </div>
      );
    }

    // Direct mode: glow applied to wrapper
    return (
      <div
        ref={ref}
        className={cn('rounded-lg', className)}
        style={{ boxShadow: glowValue, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Glow.displayName = 'Glow';
