'use client';

/**
 * PositionBadge Component
 *
 * A tier-based position indicator with visual hierarchy.
 * Gold/Silver/Bronze for podium positions, styled numbers for others.
 *
 * @example
 * ```tsx
 * // Podium positions (0-indexed)
 * <PositionBadge position={0} /> // Gold - #1
 * <PositionBadge position={1} /> // Silver - #2
 * <PositionBadge position={2} /> // Bronze - #3
 *
 * // Top 10
 * <PositionBadge position={5} /> // Cyan pill - #6
 *
 * // Standard
 * <PositionBadge position={15} /> // Minimal - #16
 * ```
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  positionTierStyles,
  positionBadgeSizeScale,
  resolveTierFromPosition,
} from '@/lib/tokens/badge-tokens';
import type { PositionBadgeProps, BadgeSize } from './types';

export { resolveTierFromPosition as getPositionTier } from '@/lib/tokens/badge-tokens';

const tierStyles = positionTierStyles;
const sizeConfigs = positionBadgeSizeScale;

/**
 * Clamp position to a safe non-negative integer.
 * Returns 0 for NaN, negative, or non-finite values.
 */
function safePosition(position: number): number {
  if (!Number.isFinite(position) || position < 0) return 0;
  return Math.floor(position);
}

/**
 * Get display number (1-indexed)
 */
function getDisplayNumber(position: number): string {
  return `#${position + 1}`;
}

// =============================================================================
// PositionBadge Component
// =============================================================================

export const PositionBadge = React.memo(function PositionBadge({
  position: rawPosition,
  size = 'sm',
  showTier = true,
  className,
}: PositionBadgeProps) {
  const position = safePosition(rawPosition);
  const tier = useMemo(() => resolveTierFromPosition(position), [position]);
  const displayNumber = useMemo(() => getDisplayNumber(position), [position]);

  const tierStyle = tierStyles[tier];
  const sizeConfig = sizeConfigs[size];

  // Podium positions get special animated treatment
  const isPodium = tier === 'gold' || tier === 'silver' || tier === 'bronze';

  if (!showTier && tier === 'minimal') {
    return (
      <span
        className={cn(
          'font-grotesk tabular-nums',
          tierStyle.text,
          sizeConfig.fontSize,
          className
        )}
      >
        {displayNumber}
      </span>
    );
  }

  const badge = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        tierStyle.container,
        tierStyle.shadow,
        sizeConfig.container,
        sizeConfig.fontSize,
        sizeConfig.minWidth,
        className
      )}
    >
      <span className={cn('tabular-nums font-grotesk', tierStyle.text)}>
        {displayNumber}
      </span>
    </div>
  );

  // Add spring animation for podium positions
  if (isPodium) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
});

// =============================================================================
// Position Badge with Icon
// =============================================================================

import { Trophy, Medal, Award, Star, Circle } from 'lucide-react';

const tierIcons = {
  gold: Trophy,
  silver: Medal,
  bronze: Award,
  top10: Star,
  standard: Circle,
  minimal: Circle,
};

export interface PositionBadgeWithIconProps extends PositionBadgeProps {
  /** Show tier icon */
  showIcon?: boolean;
}

export const PositionBadgeWithIcon = React.memo(function PositionBadgeWithIcon({
  position: rawPosition,
  size = 'sm',
  showTier = true,
  showIcon = false,
  className,
}: PositionBadgeWithIconProps) {
  const position = safePosition(rawPosition);
  const tier = useMemo(() => resolveTierFromPosition(position), [position]);
  const displayNumber = useMemo(() => getDisplayNumber(position), [position]);

  const tierStyle = tierStyles[tier];
  const sizeConfig = sizeConfigs[size];
  const Icon = tierIcons[tier];

  const iconSizes: Record<BadgeSize, number> = {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full',
        tierStyle.container,
        tierStyle.shadow,
        sizeConfig.container,
        sizeConfig.fontSize,
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} className={tierStyle.text} />}
      <span className={cn('tabular-nums font-grotesk', tierStyle.text)}>
        {displayNumber}
      </span>
    </div>
  );
});

// =============================================================================
// Podium Badge (Large, decorative)
// =============================================================================

export interface PodiumBadgeProps {
  /** Position (0, 1, or 2) */
  position: 0 | 1 | 2;
  /** Show crown icon */
  showCrown?: boolean;
  /** Custom class name */
  className?: string;
}

import { Crown } from 'lucide-react';

export function PodiumBadge({
  position,
  showCrown = true,
  className,
}: PodiumBadgeProps) {
  const tier = position === 0 ? 'gold' : position === 1 ? 'silver' : 'bronze';
  const tierStyle = tierStyles[tier];
  const ordinal = position === 0 ? '1st' : position === 1 ? '2nd' : '3rd';

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 15,
        delay: position * 0.1,
      }}
      className={cn(
        'flex flex-col items-center gap-1',
        className
      )}
    >
      {showCrown && position === 0 && (
        <motion.div
          animate={{
            y: [0, -4, 0],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        >
          <Crown className="text-yellow-400" size={24} />
        </motion.div>
      )}
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          tierStyle.container,
          tierStyle.shadow
        )}
      >
        <span className={cn('text-lg font-display', tierStyle.text)}>
          {ordinal}
        </span>
      </div>
    </motion.div>
  );
}

export default PositionBadge;
