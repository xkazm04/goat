'use client';

/**
 * MetadataBadges
 * Visual metadata display for item cards.
 * Shows rating, year, genre, and other metadata as compact badges.
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Star,
  Calendar,
  Tag,
  Clock,
  Users,
  TrendingUp,
  Award,
  Flame,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Built-in badge types
 */
export type MetadataBadgeType =
  | 'rating'
  | 'year'
  | 'genre'
  | 'duration'
  | 'popularity'
  | 'trending'
  | 'award'
  | 'hot'
  | 'new'
  | 'custom';

/**
 * Badge data structure
 */
export interface MetadataBadgeData {
  /** Badge type */
  type: MetadataBadgeType;
  /** Badge value */
  value: string | number;
  /** Optional label */
  label?: string;
  /** Custom icon override */
  icon?: LucideIcon;
  /** Custom color */
  color?: string;
  /** Custom background */
  background?: string;
  /** Priority for ordering (higher = first) */
  priority?: number;
}

/**
 * Badge position
 */
export type MetadataBadgesPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Props for MetadataBadges component
 */
export interface MetadataBadgesProps {
  /** Badges to display */
  badges: MetadataBadgeData[];
  /** Position on card */
  position?: MetadataBadgesPosition;
  /** Badge size */
  size?: 'xs' | 'sm' | 'md';
  /** Maximum badges to show */
  maxVisible?: number;
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Custom class name */
  className?: string;
}

/**
 * Icon mapping for badge types
 */
const BADGE_ICONS: Record<MetadataBadgeType, LucideIcon> = {
  rating: Star,
  year: Calendar,
  genre: Tag,
  duration: Clock,
  popularity: Users,
  trending: TrendingUp,
  award: Award,
  hot: Flame,
  new: Zap,
  custom: Tag,
};

/**
 * Color configurations for badge types
 */
const BADGE_COLORS: Record<MetadataBadgeType, { bg: string; text: string; border: string }> = {
  rating: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
  year: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  genre: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  duration: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30',
  },
  popularity: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  trending: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  award: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  hot: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  new: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  custom: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-300',
    border: 'border-gray-500/30',
  },
};

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  xs: {
    container: 'px-1.5 py-0.5 gap-0.5',
    icon: 'w-2.5 h-2.5',
    text: 'text-[10px]',
  },
  sm: {
    container: 'px-2 py-1 gap-1',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5',
    icon: 'w-3.5 h-3.5',
    text: 'text-sm',
  },
};

/**
 * Position configurations
 */
const POSITION_CONFIG: Record<MetadataBadgesPosition, string> = {
  'top-left': 'absolute top-2 left-2',
  'top-right': 'absolute top-2 right-2',
  'bottom-left': 'absolute bottom-2 left-2',
  'bottom-right': 'absolute bottom-2 right-2',
};

/**
 * Format badge value for display
 */
function formatBadgeValue(value: string | number, type: MetadataBadgeType): string {
  if (typeof value === 'number') {
    if (type === 'rating') {
      return value.toFixed(1);
    }
    if (type === 'duration') {
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }
    if (type === 'popularity' && value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
  return value;
}

/**
 * Single badge component
 */
const Badge = memo(function Badge({
  badge,
  size = 'sm',
  index,
}: {
  badge: MetadataBadgeData;
  size: 'xs' | 'sm' | 'md';
  index: number;
}) {
  const Icon = badge.icon || BADGE_ICONS[badge.type];
  const colors = BADGE_COLORS[badge.type];
  const sizeConfig = SIZE_CONFIG[size];
  const formattedValue = formatBadgeValue(badge.value, badge.type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.05, duration: 0.15 }}
      className={cn(
        'flex items-center rounded-md border backdrop-blur-sm',
        sizeConfig.container,
        colors.bg,
        colors.border,
        badge.background
      )}
      title={badge.label || `${badge.type}: ${badge.value}`}
    >
      <Icon className={cn(sizeConfig.icon, colors.text, badge.color)} />
      <span className={cn(sizeConfig.text, 'font-medium', colors.text, badge.color)}>
        {formattedValue}
      </span>
    </motion.div>
  );
});

/**
 * MetadataBadges Component
 *
 * Displays compact metadata badges on item cards.
 * Supports multiple badge types with appropriate icons and colors.
 *
 * Features:
 * - Built-in types for common metadata
 * - Auto-formatting for values
 * - Priority-based ordering
 * - Animated entrance
 * - Compact display for multiple badges
 */
export const MetadataBadges = memo(function MetadataBadges({
  badges,
  position = 'top-right',
  size = 'sm',
  maxVisible = 3,
  direction = 'horizontal',
  className,
}: MetadataBadgesProps) {
  // Sort badges by priority and limit to maxVisible
  const sortedBadges = useMemo(() => {
    return [...badges]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, maxVisible);
  }, [badges, maxVisible]);

  const overflowCount = badges.length - maxVisible;

  if (sortedBadges.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'z-10 flex',
        direction === 'horizontal' ? 'flex-row gap-1' : 'flex-col gap-1',
        POSITION_CONFIG[position],
        className
      )}
      data-testid="metadata-badges"
    >
      <AnimatePresence mode="popLayout">
        {sortedBadges.map((badge, index) => (
          <Badge
            key={`${badge.type}-${badge.value}`}
            badge={badge}
            size={size}
            index={index}
          />
        ))}
      </AnimatePresence>

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center rounded-md border backdrop-blur-sm',
            SIZE_CONFIG[size].container,
            'bg-gray-700/50 border-gray-600/30 text-gray-400'
          )}
          title={`${overflowCount} more`}
        >
          <span className={cn(SIZE_CONFIG[size].text, 'font-medium')}>
            +{overflowCount}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Helper to create badge data from item metadata
 */
export function createBadgesFromMetadata(metadata: {
  rating?: number;
  year?: number | string;
  genre?: string;
  duration?: number;
  popularity?: number;
  isNew?: boolean;
  isTrending?: boolean;
  hasAward?: boolean;
}): MetadataBadgeData[] {
  const badges: MetadataBadgeData[] = [];

  if (metadata.rating !== undefined) {
    badges.push({
      type: 'rating',
      value: metadata.rating,
      priority: 10,
    });
  }

  if (metadata.year) {
    badges.push({
      type: 'year',
      value: metadata.year,
      priority: 5,
    });
  }

  if (metadata.genre) {
    badges.push({
      type: 'genre',
      value: metadata.genre,
      priority: 4,
    });
  }

  if (metadata.duration) {
    badges.push({
      type: 'duration',
      value: metadata.duration,
      priority: 3,
    });
  }

  if (metadata.popularity) {
    badges.push({
      type: 'popularity',
      value: metadata.popularity,
      priority: 2,
    });
  }

  if (metadata.isNew) {
    badges.push({
      type: 'new',
      value: 'NEW',
      priority: 15,
    });
  }

  if (metadata.isTrending) {
    badges.push({
      type: 'trending',
      value: 'HOT',
      priority: 12,
    });
  }

  if (metadata.hasAward) {
    badges.push({
      type: 'award',
      value: 'Award',
      priority: 8,
    });
  }

  return badges;
}

export default MetadataBadges;
