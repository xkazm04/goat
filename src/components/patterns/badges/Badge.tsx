'use client';

/**
 * Badge Component
 *
 * A flexible, reusable badge component that serves as the foundation
 * for all badge variants in the application.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Badge>New</Badge>
 *
 * // With icon
 * <Badge icon={Trophy} color={colors.gold}>Winner</Badge>
 *
 * // Gradient variant
 * <Badge variant="gradient" color={colors.podium}>Top 3</Badge>
 *
 * // Animated
 * <Badge animation={{ enter: 'spring', pulse: true }}>Live</Badge>
 * ```
 */

import { motion, AnimatePresence } from 'framer-motion';
import React, { useMemo } from 'react';

import { badgeSizeScale, badgeColors } from '@/lib/tokens/badge-tokens';
import { cn } from '@/lib/utils';

import type {
  BaseBadgeProps,
} from './types';

export { badgeColors } from '@/lib/tokens/badge-tokens';

const sizeConfigs = badgeSizeScale;

// =============================================================================
// Animation Presets
// =============================================================================

const animationVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
  slide: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  spring: {
    initial: { opacity: 0, scale: 0.5 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
    exit: { opacity: 0, scale: 0.5 },
  },
  bounce: {
    initial: { opacity: 0, scale: 0.3, y: 20 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 500, damping: 15 },
    },
    exit: { opacity: 0, scale: 0.3, y: 20 },
  },
};

// =============================================================================
// Badge Component
// =============================================================================

export interface BadgeProps extends BaseBadgeProps {
  /** Visible state for AnimatePresence */
  visible?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      children,
      size = 'sm',
      variant = 'solid',
      color = badgeColors.default,
      icon: Icon,
      iconPosition = 'left',
      animation,
      visible = true,
      className,
    },
    ref
  ) => {
    const sizeConfig = sizeConfigs[size];

    // Build class names based on variant
    const variantClasses = useMemo(() => {
      switch (variant) {
        case 'solid':
          return cn(
            color.background,
            color.text,
            'glow' in color && color.glow && 'shadow-xs',
            'glow' in color ? color.glow : undefined
          );
        case 'outline-solid':
          return cn(
            'bg-transparent',
            color.text,
            'border',
            color.border
          );
        case 'ghost':
          return cn(
            'bg-transparent',
            color.text,
            'hover:bg-white/5'
          );
        case 'gradient':
          return cn(
            color.background,
            color.text,
            'border',
            color.border,
            'glow' in color && color.glow && 'shadow-lg',
            'glow' in color && color.glow
          );
        default:
          // Fallback to solid styling for unknown variant types
          return cn(
            color.background,
            color.text
          );
      }
    }, [variant, color]);

    // Get animation variant
    const animVariant = animation?.enter
      ? animationVariants[animation.enter]
      : animationVariants.fade;

    // Build base badge element
    const badgeContent = (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-badge font-medium',
          'backdrop-blur-xs',
          sizeConfig.height,
          sizeConfig.padding,
          sizeConfig.fontSize,
          sizeConfig.gap,
          variantClasses,
          animation?.pulse && 'animate-pulse',
          animation?.shimmer && 'relative overflow-hidden',
          className
        )}
      >
        {/* Shimmer effect overlay */}
        {animation?.shimmer && (
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent"
            style={{
              animation: 'shimmer 2s infinite',
            }}
          />
        )}

        {/* Icon (left) */}
        {Icon && iconPosition === 'left' && (
          <Icon size={sizeConfig.iconSize} className="shrink-0" />
        )}

        {/* Content */}
        {children && <span className="truncate">{children}</span>}

        {/* Icon (right) */}
        {Icon && iconPosition === 'right' && (
          <Icon size={sizeConfig.iconSize} className="shrink-0" />
        )}
      </div>
    );

    // Wrap with motion if animated
    if (animation) {
      return (
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={animVariant.initial}
              animate={animVariant.animate}
              exit={animVariant.exit}
              transition={{
                duration: (animation.duration ?? 200) / 1000,
                delay: (animation.delay ?? 0) / 1000,
              }}
            >
              {badgeContent}
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    return badgeContent;
  }
);

Badge.displayName = 'Badge';

// =============================================================================
// Badge Group Component
// =============================================================================

export interface BadgeGroupProps {
  /** Badges to display */
  children: React.ReactNode;
  /** Maximum badges to show */
  max?: number;
  /** Spacing between badges */
  spacing?: 'tight' | 'normal' | 'loose';
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Custom class name */
  className?: string;
}

const spacingClasses = {
  tight: 'gap-1',
  normal: 'gap-2',
  loose: 'gap-3',
};

export function BadgeGroup({
  children,
  max,
  spacing = 'normal',
  direction = 'horizontal',
  className,
}: BadgeGroupProps) {
  const childArray = React.Children.toArray(children);
  const visibleChildren = max ? childArray.slice(0, max) : childArray;
  const hiddenCount = max ? childArray.length - max : 0;

  return (
    <div
      className={cn(
        'inline-flex items-center',
        direction === 'vertical' && 'flex-col',
        spacingClasses[spacing],
        className
      )}
    >
      {visibleChildren}
      {hiddenCount > 0 && (
        <Badge size="sm" color={badgeColors.default}>
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}

// =============================================================================
// Positioned Badge Wrapper
// =============================================================================

export interface PositionedBadgeProps {
  /** Badge position on parent */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Badge content */
  children: React.ReactNode;
  /** Offset from corner */
  offset?: number;
  /** Custom class name */
  className?: string;
}

const positionClasses = {
  'top-left': 'top-0 left-0 -translate-x-1/4 -translate-y-1/4',
  'top-right': 'top-0 right-0 translate-x-1/4 -translate-y-1/4',
  'bottom-left': 'bottom-0 left-0 -translate-x-1/4 translate-y-1/4',
  'bottom-right': 'bottom-0 right-0 translate-x-1/4 translate-y-1/4',
};

export function PositionedBadge({
  position,
  children,
  offset = 0,
  className,
}: PositionedBadgeProps) {
  return (
    <div
      className={cn(
        'absolute z-10',
        positionClasses[position],
        className
      )}
      style={{
        ...(offset !== 0 && {
          transform: `translate(${position.includes('left') ? -offset : offset}px, ${position.includes('top') ? -offset : offset}px)`,
        }),
      }}
    >
      {children}
    </div>
  );
}

export default Badge;
