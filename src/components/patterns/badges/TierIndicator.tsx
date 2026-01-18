'use client';

/**
 * TierIndicator Component
 *
 * Shows community ranking tier based on average position.
 * Displays Elite/Top/Solid/Common/Unranked tiers with appropriate icons.
 *
 * @example
 * ```tsx
 * // Direct tier value
 * <TierIndicator tier="elite" />
 *
 * // Calculate from average rank
 * <TierIndicator averageRank={2.5} />
 *
 * // Positioned on an item
 * <div className="relative">
 *   <img src={item.image} />
 *   <TierIndicator
 *     averageRank={item.avgRank}
 *     position="top-right"
 *     size="sm"
 *   />
 * </div>
 * ```
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  TierIndicatorProps,
  ConsensusTier,
  TierConfig,
  BadgeSize,
  BadgePosition,
} from './types';

// =============================================================================
// Tier Configuration
// =============================================================================

export const tierConfigs: Record<ConsensusTier, Omit<TierConfig, 'tier'>> = {
  elite: {
    label: 'Elite',
    icon: Trophy,
    color: {
      background: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      glow: 'shadow-yellow-500/20',
    },
    minRank: 1,
    maxRank: 3,
  },
  top: {
    label: 'Top',
    icon: Medal,
    color: {
      background: 'bg-cyan-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
    },
    minRank: 4,
    maxRank: 10,
  },
  solid: {
    label: 'Solid',
    icon: Star,
    color: {
      background: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/20',
    },
    minRank: 11,
    maxRank: 25,
  },
  common: {
    label: 'Common',
    icon: Circle,
    color: {
      background: 'bg-zinc-500/20',
      text: 'text-zinc-400',
      border: 'border-zinc-500/30',
    },
    minRank: 26,
    maxRank: 50,
  },
  unranked: {
    label: 'Unranked',
    icon: Circle,
    color: {
      background: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
  },
};

// =============================================================================
// Size Configuration
// =============================================================================

interface SizeConfig {
  container: string;
  fontSize: string;
  iconSize: number;
  gap: string;
}

const sizeConfigs: Record<BadgeSize, SizeConfig> = {
  xs: {
    container: 'h-4 px-1.5',
    fontSize: 'text-[9px]',
    iconSize: 8,
    gap: 'gap-0.5',
  },
  sm: {
    container: 'h-5 px-2',
    fontSize: 'text-[10px]',
    iconSize: 10,
    gap: 'gap-1',
  },
  md: {
    container: 'h-6 px-2.5',
    fontSize: 'text-xs',
    iconSize: 12,
    gap: 'gap-1',
  },
  lg: {
    container: 'h-7 px-3',
    fontSize: 'text-sm',
    iconSize: 14,
    gap: 'gap-1.5',
  },
};

// =============================================================================
// Position Styles
// =============================================================================

const positionStyles: Record<BadgePosition, string> = {
  'top-left': 'absolute top-1 left-1',
  'top-right': 'absolute top-1 right-1',
  'bottom-left': 'absolute bottom-1 left-1',
  'bottom-right': 'absolute bottom-1 right-1',
  center: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate tier from average rank
 */
export function getTierFromRank(averageRank: number | undefined): ConsensusTier {
  if (averageRank === undefined || averageRank === null) return 'unranked';
  if (averageRank <= 3) return 'elite';
  if (averageRank <= 10) return 'top';
  if (averageRank <= 25) return 'solid';
  if (averageRank <= 50) return 'common';
  return 'unranked';
}

/**
 * Get tier config from tier or average rank
 */
export function getTierConfig(
  tier?: ConsensusTier,
  averageRank?: number
): TierConfig {
  const resolvedTier = tier ?? getTierFromRank(averageRank);
  const config = tierConfigs[resolvedTier];
  return { tier: resolvedTier, ...config };
}

// =============================================================================
// TierIndicator Component
// =============================================================================

export const TierIndicator = React.memo(function TierIndicator({
  itemId,
  tier: tierProp,
  averageRank,
  size = 'sm',
  position,
  className,
}: TierIndicatorProps) {
  const config = useMemo(
    () => getTierConfig(tierProp, averageRank),
    [tierProp, averageRank]
  );

  const sizeConfig = sizeConfigs[size];
  const Icon = config.icon;
  const colorConfig = config.color;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'inline-flex items-center rounded-full backdrop-blur-sm',
        sizeConfig.container,
        sizeConfig.gap,
        colorConfig.background,
        colorConfig.border && `border ${colorConfig.border}`,
        colorConfig.glow && `shadow-sm ${colorConfig.glow}`,
        position && positionStyles[position],
        position && 'z-10',
        className
      )}
    >
      <Icon size={sizeConfig.iconSize} className={cn(colorConfig.text)} />
      <span className={cn(sizeConfig.fontSize, colorConfig.text, 'font-medium')}>
        {config.label}
      </span>
    </motion.div>
  );
});

// =============================================================================
// Tier Badge (Compact version, icon only)
// =============================================================================

export interface TierBadgeProps {
  tier: ConsensusTier;
  size?: BadgeSize;
  showTooltip?: boolean;
  className?: string;
}

export const TierBadge = React.memo(function TierBadge({
  tier,
  size = 'sm',
  showTooltip = false,
  className,
}: TierBadgeProps) {
  const config = tierConfigs[tier];
  const sizeConfig = sizeConfigs[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'aspect-square',
        sizeConfig.container.replace('px-2', '').replace('px-2.5', '').replace('px-3', ''),
        config.color.background,
        config.color.border && `border ${config.color.border}`,
        config.color.glow && `shadow-sm ${config.color.glow}`,
        className
      )}
      title={showTooltip ? config.label : undefined}
    >
      <Icon size={sizeConfig.iconSize} className={config.color.text} />
    </div>
  );

  return badge;
});

// =============================================================================
// Tier Legend (For documentation/UI guides)
// =============================================================================

export interface TierLegendProps {
  size?: BadgeSize;
  direction?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

export function TierLegend({
  size = 'sm',
  direction = 'horizontal',
  showLabels = true,
  className,
}: TierLegendProps) {
  const tiers: ConsensusTier[] = ['elite', 'top', 'solid', 'common', 'unranked'];

  return (
    <div
      className={cn(
        'flex gap-2',
        direction === 'vertical' && 'flex-col',
        className
      )}
    >
      {tiers.map((tier) => (
        <div key={tier} className="flex items-center gap-1.5">
          <TierBadge tier={tier} size={size} />
          {showLabels && (
            <span className="text-xs text-zinc-400">
              {tierConfigs[tier].label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default TierIndicator;
