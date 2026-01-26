'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Duration of the shimmer sweep animation in milliseconds
   * @default 600
   */
  duration?: number;
  /**
   * Angle of the shimmer gradient (in degrees)
   * @default 105
   */
  angle?: number;
  /**
   * Shimmer highlight color with opacity
   * @default 'rgba(255,255,255,0.08)'
   */
  shimmerColor?: string;
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Shimmer - Hover-triggered shine sweep effect
 *
 * Uses CSS transitions (not infinite keyframes) for performance.
 * Respects prefers-reduced-motion via motion-reduce utilities.
 *
 * @example
 * <Shimmer>
 *   <Card>Hover me for shimmer</Card>
 * </Shimmer>
 *
 * @example
 * // Custom duration and angle
 * <Shimmer duration={400} angle={120}>
 *   <Button>Premium Action</Button>
 * </Shimmer>
 */
export const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
  (
    {
      duration = 600,
      angle = 105,
      shimmerColor = 'rgba(255,255,255,0.08)',
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    // Compute gradient background with configurable angle and color
    const shimmerBackground = `linear-gradient(${angle}deg, transparent 30%, ${shimmerColor} 50%, transparent 70%)`;

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden group/shimmer', className)}
        style={style}
        {...props}
      >
        {children}
        {/* Shimmer overlay - sweeps on hover */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none',
            '-translate-x-full',
            'group-hover/shimmer:translate-x-full',
            'transition-transform ease-out',
            // Accessibility: disable animation for reduced motion preference
            'motion-reduce:transition-none',
            'motion-reduce:translate-x-0',
            'motion-reduce:opacity-0'
          )}
          style={{
            transitionDuration: `${duration}ms`,
            background: shimmerBackground,
          }}
          aria-hidden="true"
        />
      </div>
    );
  }
);

Shimmer.displayName = 'Shimmer';
