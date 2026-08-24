/**
 * Badge Token System
 *
 * Single source of truth for badge color palettes, size scales,
 * tier configurations, and tier resolver functions used across
 * Badge, PositionBadge, and TierIndicator components.
 */

import { Trophy, Medal, Star, Circle } from 'lucide-react';

import type {
  BadgeColor,
  BadgeSize,
  BadgeSizeConfig,
  PositionTier,
  ConsensusTier,
} from '@/components/patterns/badges/types';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Size Scale
// =============================================================================

export const badgeSizeScale: Record<BadgeSize, BadgeSizeConfig> = {
  xs: {
    height: 'h-4',
    padding: 'px-1.5',
    fontSize: 'text-2xs',
    iconSize: 10,
    gap: 'gap-0.5',
  },
  sm: {
    height: 'h-5',
    padding: 'px-2',
    fontSize: 'text-xs',
    iconSize: 12,
    gap: 'gap-1',
  },
  md: {
    height: 'h-6',
    padding: 'px-2.5',
    fontSize: 'text-sm',
    iconSize: 14,
    gap: 'gap-1.5',
  },
  lg: {
    height: 'h-8',
    padding: 'px-3',
    fontSize: 'text-base',
    iconSize: 16,
    gap: 'gap-2',
  },
};

// =============================================================================
// Color Palette
// =============================================================================

export const badgeColors = {
  default: {
    background: 'bg-zinc-800',
    text: 'text-zinc-200',
    border: 'border-zinc-700',
  },
  primary: {
    background: 'bg-brand/20',
    text: 'text-brand-hover',
    border: 'border-brand/30',
    glow: 'shadow-brand/20',
  },
  success: {
    background: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  warning: {
    background: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
  },
  danger: {
    background: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
  },
  gold: {
    background: 'bg-linear-to-r from-yellow-500/30 to-amber-500/30',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    glow: 'shadow-yellow-500/30',
  },
  silver: {
    background: 'bg-linear-to-r from-slate-400/30 to-zinc-400/30',
    text: 'text-slate-300',
    border: 'border-slate-400/40',
    glow: 'shadow-slate-400/20',
  },
  bronze: {
    background: 'bg-linear-to-r from-orange-600/30 to-amber-700/30',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    glow: 'shadow-orange-500/20',
  },
} satisfies Record<string, BadgeColor>;

// =============================================================================
// Position Tier Styles (for PositionBadge)
// =============================================================================

export interface PositionTierStyle {
  container: string;
  text: string;
  shadow?: string;
}

export const positionTierStyles: Record<PositionTier, PositionTierStyle> = {
  gold: {
    container: 'bg-linear-to-br from-yellow-300 via-yellow-400 to-amber-500',
    text: 'text-yellow-950 font-bold',
    shadow: 'shadow-lg shadow-yellow-500/40',
  },
  silver: {
    container: 'bg-linear-to-br from-slate-200 via-slate-300 to-zinc-400',
    text: 'text-slate-900 font-bold',
    shadow: 'shadow-lg shadow-slate-400/30',
  },
  bronze: {
    container: 'bg-linear-to-br from-orange-400 via-orange-500 to-amber-600',
    text: 'text-orange-950 font-bold',
    shadow: 'shadow-lg shadow-orange-500/30',
  },
  top10: {
    container: 'bg-brand/20 border border-brand/40',
    text: 'text-brand-hover font-semibold',
  },
  standard: {
    container: 'bg-zinc-800/50 border border-zinc-700/50',
    text: 'text-zinc-400 font-medium',
  },
  minimal: {
    container: 'bg-transparent',
    text: 'text-zinc-500 font-mono',
  },
};

// =============================================================================
// Position Badge Size Scale (compact format for PositionBadge)
// =============================================================================

export interface PositionBadgeSizeConfig {
  container: string;
  fontSize: string;
  minWidth: string;
}

export const positionBadgeSizeScale: Record<BadgeSize, PositionBadgeSizeConfig> = {
  xs: {
    container: 'h-4 px-1',
    fontSize: 'text-2xs',
    minWidth: 'min-w-[16px]',
  },
  sm: {
    container: 'h-5 px-1.5',
    fontSize: 'text-xs',
    minWidth: 'min-w-[20px]',
  },
  md: {
    container: 'h-6 px-2',
    fontSize: 'text-sm',
    minWidth: 'min-w-[24px]',
  },
  lg: {
    container: 'h-8 px-2.5',
    fontSize: 'text-base',
    minWidth: 'min-w-[32px]',
  },
};

// =============================================================================
// Consensus Tier Configs (for TierIndicator)
// =============================================================================

export interface ConsensusTierConfig {
  label: string;
  icon: LucideIcon;
  color: BadgeColor;
  minRank?: number;
  maxRank?: number;
}

export const consensusTierConfigs: Record<ConsensusTier, ConsensusTierConfig> = {
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
      background: 'bg-brand/20',
      text: 'text-brand-hover',
      border: 'border-brand/30',
      glow: 'shadow-brand/20',
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
// Tier Resolver
// =============================================================================

/**
 * Resolve position tier from a 0-indexed grid position.
 * Covers podium (gold/silver/bronze), top 10, standard, and minimal tiers.
 */
export function resolveTierFromPosition(position: number): PositionTier {
  // Clamp negative or non-finite positions to 0
  if (!Number.isFinite(position) || position < 0) {
    return 'minimal';
  }
  if (position === 0) return 'gold';
  if (position === 1) return 'silver';
  if (position === 2) return 'bronze';
  if (position < 10) return 'top10';
  if (position < 25) return 'standard';
  return 'minimal';
}

/**
 * Resolve consensus tier from an average community rank.
 * Covers elite (1-3), top (4-10), solid (11-25), common (26-50),
 * and unranked (no data or >50).
 */
export function resolveTierFromRank(averageRank: number | undefined): ConsensusTier {
  if (averageRank === undefined || averageRank === null) return 'unranked';
  if (!Number.isFinite(averageRank) || averageRank < 0) return 'unranked';
  if (averageRank <= 3) return 'elite';
  if (averageRank <= 10) return 'top';
  if (averageRank <= 25) return 'solid';
  if (averageRank <= 50) return 'common';
  return 'unranked';
}
