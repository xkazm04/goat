'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItemConsensus } from '@/stores/consensus-store';
import { getTierFromRank, getTierConfig, type InventoryTier } from '@/types/ranked-inventory';

interface TierIndicatorProps {
  /** The item ID to fetch tier for */
  itemId: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Position of the indicator */
  position?: 'top-left' | 'top-right';
  /** Additional CSS classes */
  className?: string;
}

const TIER_ICONS = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  circle: Circle,
};

/**
 * TierIndicator
 *
 * Shows a small tier badge on collection items indicating their
 * community ranking tier (Elite, Top, Solid, Common, or New).
 *
 * This helps users quickly identify popular items in the unranked pool,
 * supporting the "popular items bubble to top" discovery flow.
 */
export function TierIndicator({
  itemId,
  size = 'sm',
  position = 'top-left',
  className,
}: TierIndicatorProps) {
  const consensus = useItemConsensus(itemId);

  const tier = useMemo(() => {
    return getTierFromRank(consensus?.averageRank);
  }, [consensus]);

  const config = useMemo(() => getTierConfig(tier), [tier]);

  // Only show for items with consensus data (not 'unranked' tier)
  if (tier === 'unranked') {
    return null;
  }

  const Icon = TIER_ICONS[config.icon];
  const positionClasses = position === 'top-left' ? 'top-0.5 left-0.5' : 'top-0.5 right-0.5';
  const sizeClasses = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const iconSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 500,
          damping: 30,
          delay: 0.1,
        },
      }}
      className={cn(
        'absolute z-10',
        positionClasses,
        sizeClasses,
        'flex items-center justify-center',
        'rounded-full',
        config.bgColor,
        'ring-1',
        config.borderColor,
        'backdrop-blur-sm',
        className
      )}
      title={`${config.label} tier - Avg rank #${Math.round(consensus?.averageRank || 0)}`}
      data-testid={`tier-indicator-${itemId}`}
    >
      <Icon className={cn(iconSize, config.color)} />
    </motion.div>
  );
}

export default TierIndicator;
