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
import { cn } from '@/lib/utils';
import {
  consensusTierConfigs,
  badgeSizeScale,
  resolveTierFromRank,
} from '@/lib/tokens/badge-tokens';
import type {
  TierIndicatorProps,
  ConsensusTier,
  TierConfig,
  BadgeSize,
  BadgePosition,
} from './types';

export { consensusTierConfigs as tierConfigs } from '@/lib/tokens/badge-tokens';
export { resolveTierFromRank as getTierFromRank } from '@/lib/tokens/badge-tokens';

const tierConfigs = consensusTierConfigs;

const sizeConfigs = {
  xs: {
    container: `${badgeSizeScale.xs.height} ${badgeSizeScale.xs.padding}`,
    fontSize: 'text-2xs',
    iconSize: badgeSizeScale.xs.iconSize - 2,
    gap: badgeSizeScale.xs.gap,
  },
  sm: {
    container: `${badgeSizeScale.sm.height} ${badgeSizeScale.sm.padding}`,
    fontSize: 'text-2xs',
    iconSize: badgeSizeScale.sm.iconSize - 2,
    gap: badgeSizeScale.sm.gap,
  },
  md: {
    container: `${badgeSizeScale.md.height} ${badgeSizeScale.md.padding}`,
    fontSize: 'text-xs',
    iconSize: badgeSizeScale.md.iconSize - 2,
    gap: 'gap-1',
  },
  lg: {
    container: 'h-7 px-3',
    fontSize: 'text-sm',
    iconSize: badgeSizeScale.lg.iconSize - 2,
    gap: badgeSizeScale.lg.gap,
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
 * Get tier config from tier or average rank
 */
export function getTierConfig(
  tier?: ConsensusTier,
  averageRank?: number
): TierConfig {
  const resolvedTier = tier ?? resolveTierFromRank(averageRank);
  // Guard against unknown tier values - fall back to 'unranked'
  const config = tierConfigs[resolvedTier] ?? tierConfigs.unranked;
  const safeTier = tierConfigs[resolvedTier] ? resolvedTier : 'unranked';
  return { tier: safeTier, ...config };
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
        'inline-flex items-center rounded-badge backdrop-blur-xs',
        sizeConfig.container,
        sizeConfig.gap,
        colorConfig.background,
        colorConfig.border && `border ${colorConfig.border}`,
        colorConfig.glow && `shadow-xs ${colorConfig.glow}`,
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
        config.color.glow && `shadow-xs ${config.color.glow}`,
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
