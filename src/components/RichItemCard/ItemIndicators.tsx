'use client';

/**
 * ItemIndicators
 * Visual status cues for item cards.
 * Shows ranked, favorite, new, and other status indicators.
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Check,
  Heart,
  Sparkles,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Pin,
  Bookmark,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Indicator types
 */
export type IndicatorType =
  | 'ranked'
  | 'favorite'
  | 'new'
  | 'recent'
  | 'locked'
  | 'visible'
  | 'hidden'
  | 'pinned'
  | 'bookmarked'
  | 'warning';

/**
 * Complete item state for indicators
 */
export interface ItemIndicatorState {
  /** Item has been ranked/placed */
  isRanked?: boolean;
  /** Rank position if ranked */
  rankPosition?: number;
  /** Item is favorited */
  isFavorite?: boolean;
  /** Item is new (recently added) */
  isNew?: boolean;
  /** Item was recently interacted with */
  isRecent?: boolean;
  /** Item is locked/protected */
  isLocked?: boolean;
  /** Item is visible in current filter */
  isVisible?: boolean;
  /** Item is pinned */
  isPinned?: boolean;
  /** Item is bookmarked */
  isBookmarked?: boolean;
  /** Item has a warning/issue */
  hasWarning?: boolean;
  /** Custom indicator */
  custom?: {
    icon: LucideIcon;
    label: string;
    color: string;
  };
}

/**
 * Indicator configuration
 */
interface IndicatorConfig {
  type: IndicatorType;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  priority: number;
}

/**
 * Indicator position
 */
export type IndicatorPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Props for ItemIndicators component
 */
export interface ItemIndicatorsProps {
  /** Item state */
  state: ItemIndicatorState;
  /** Position on card */
  position?: IndicatorPosition;
  /** Size of indicators */
  size?: 'xs' | 'sm' | 'md';
  /** Maximum indicators to show */
  maxVisible?: number;
  /** Show only primary indicator */
  primaryOnly?: boolean;
  /** Show rank number */
  showRankNumber?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Indicator configurations
 */
const INDICATOR_CONFIGS: Record<IndicatorType, Omit<IndicatorConfig, 'type'>> = {
  ranked: {
    icon: Check,
    label: 'Ranked',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 border-green-500/30',
    priority: 10,
  },
  favorite: {
    icon: Heart,
    label: 'Favorite',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20 border-pink-500/30',
    priority: 9,
  },
  new: {
    icon: Sparkles,
    label: 'New',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20 border-cyan-500/30',
    priority: 8,
  },
  recent: {
    icon: Clock,
    label: 'Recent',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
    priority: 5,
  },
  locked: {
    icon: Lock,
    label: 'Locked',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 border-amber-500/30',
    priority: 7,
  },
  visible: {
    icon: Eye,
    label: 'Visible',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
    priority: 1,
  },
  hidden: {
    icon: EyeOff,
    label: 'Hidden',
    color: 'text-gray-500',
    bgColor: 'bg-gray-600/20 border-gray-600/30',
    priority: 6,
  },
  pinned: {
    icon: Pin,
    label: 'Pinned',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
    priority: 8,
  },
  bookmarked: {
    icon: Bookmark,
    label: 'Bookmarked',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20 border-orange-500/30',
    priority: 4,
  },
  warning: {
    icon: AlertCircle,
    label: 'Warning',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20 border-red-500/30',
    priority: 10,
  },
};

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  xs: {
    container: 'w-4 h-4',
    icon: 'w-2.5 h-2.5',
    text: 'text-[8px]',
    gap: 'gap-0.5',
  },
  sm: {
    container: 'w-5 h-5',
    icon: 'w-3 h-3',
    text: 'text-[10px]',
    gap: 'gap-1',
  },
  md: {
    container: 'w-6 h-6',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
    gap: 'gap-1',
  },
};

/**
 * Position configurations
 */
const POSITION_CONFIG: Record<IndicatorPosition, string> = {
  'top-left': 'absolute top-1.5 left-1.5',
  'top-right': 'absolute top-1.5 right-1.5',
  'bottom-left': 'absolute bottom-1.5 left-1.5',
  'bottom-right': 'absolute bottom-1.5 right-1.5',
};

/**
 * Single indicator component
 */
const Indicator = memo(function Indicator({
  config,
  size = 'sm',
  showLabel = false,
  rankNumber,
}: {
  config: IndicatorConfig;
  size: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  rankNumber?: number;
}) {
  const Icon = config.icon;
  const sizeConfig = SIZE_CONFIG[size];

  // If showing rank number, display it instead of icon
  if (rankNumber !== undefined) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={cn(
          'flex items-center justify-center rounded-full border backdrop-blur-sm',
          sizeConfig.container,
          config.bgColor
        )}
        title={`Ranked #${rankNumber}`}
      >
        <span className={cn(sizeConfig.text, config.color, 'font-bold')}>
          {rankNumber}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        'flex items-center justify-center rounded-full border backdrop-blur-sm',
        sizeConfig.container,
        config.bgColor,
        showLabel && 'rounded-md px-1.5'
      )}
      title={config.label}
    >
      <Icon className={cn(sizeConfig.icon, config.color)} />
      {showLabel && (
        <span className={cn(sizeConfig.text, config.color, 'ml-0.5')}>
          {config.label}
        </span>
      )}
    </motion.div>
  );
});

/**
 * ItemIndicators Component
 *
 * Displays visual status indicators on item cards.
 * Shows ranked, favorite, new, and other statuses.
 *
 * Features:
 * - Multiple indicator types
 * - Priority-based ordering
 * - Optional rank number display
 * - Animated entrance
 * - Customizable position and size
 */
export const ItemIndicators = memo(function ItemIndicators({
  state,
  position = 'top-left',
  size = 'sm',
  maxVisible = 3,
  primaryOnly = false,
  showRankNumber = true,
  className,
}: ItemIndicatorsProps) {
  // Build active indicators from state
  const activeIndicators = useMemo(() => {
    const indicators: IndicatorConfig[] = [];

    if (state.hasWarning) {
      indicators.push({ type: 'warning', ...INDICATOR_CONFIGS.warning });
    }
    if (state.isRanked) {
      indicators.push({ type: 'ranked', ...INDICATOR_CONFIGS.ranked });
    }
    if (state.isFavorite) {
      indicators.push({ type: 'favorite', ...INDICATOR_CONFIGS.favorite });
    }
    if (state.isNew) {
      indicators.push({ type: 'new', ...INDICATOR_CONFIGS.new });
    }
    if (state.isPinned) {
      indicators.push({ type: 'pinned', ...INDICATOR_CONFIGS.pinned });
    }
    if (state.isLocked) {
      indicators.push({ type: 'locked', ...INDICATOR_CONFIGS.locked });
    }
    if (state.isRecent && !state.isNew) {
      indicators.push({ type: 'recent', ...INDICATOR_CONFIGS.recent });
    }
    if (state.isBookmarked) {
      indicators.push({ type: 'bookmarked', ...INDICATOR_CONFIGS.bookmarked });
    }
    if (state.isVisible === false) {
      indicators.push({ type: 'hidden', ...INDICATOR_CONFIGS.hidden });
    }

    // Sort by priority
    indicators.sort((a, b) => b.priority - a.priority);

    if (primaryOnly) {
      return indicators.slice(0, 1);
    }

    return indicators.slice(0, maxVisible);
  }, [state, primaryOnly, maxVisible]);

  if (activeIndicators.length === 0) return null;

  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex z-10',
        sizeConfig.gap,
        POSITION_CONFIG[position],
        className
      )}
      data-testid="item-indicators"
    >
      <AnimatePresence mode="popLayout">
        {activeIndicators.map((indicator, index) => (
          <Indicator
            key={indicator.type}
            config={indicator}
            size={size}
            rankNumber={
              indicator.type === 'ranked' && showRankNumber && state.rankPosition !== undefined
                ? state.rankPosition
                : undefined
            }
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Simple ranked indicator with number
 */
export const RankedIndicator = memo(function RankedIndicator({
  position,
  size = 'sm',
  className,
}: {
  position: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeConfig = SIZE_CONFIG[size];
  const config = INDICATOR_CONFIGS.ranked;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'flex items-center justify-center rounded-full border backdrop-blur-sm',
        sizeConfig.container,
        config.bgColor,
        className
      )}
      title={`Ranked #${position}`}
    >
      <span className={cn(sizeConfig.text, config.color, 'font-bold')}>
        {position}
      </span>
    </motion.div>
  );
});

/**
 * Favorite heart indicator
 */
export const FavoriteIndicator = memo(function FavoriteIndicator({
  isFavorite,
  size = 'sm',
  onClick,
  className,
}: {
  isFavorite: boolean;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{
        scale: isFavorite ? [1, 1.2, 1] : 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'flex items-center justify-center rounded-full border backdrop-blur-sm',
        sizeConfig.container,
        isFavorite
          ? 'bg-pink-500/20 border-pink-500/30'
          : 'bg-gray-800/50 border-gray-600/30 hover:bg-pink-500/10',
        className
      )}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn(
          sizeConfig.icon,
          isFavorite ? 'text-pink-400 fill-pink-400' : 'text-gray-400'
        )}
      />
    </motion.button>
  );
});

export default ItemIndicators;
