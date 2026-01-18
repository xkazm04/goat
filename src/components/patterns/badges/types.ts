/**
 * Badge Pattern Library Types
 *
 * Shared types for badges, indicators, and visual status markers.
 * Provides a consistent interface for ranking badges, consensus indicators,
 * and status displays across the application.
 */

import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Core Badge Types
// =============================================================================

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type BadgeVariant = 'solid' | 'outline' | 'ghost' | 'gradient';
export type BadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface BadgeColor {
  background: string;
  text: string;
  border?: string;
  glow?: string;
}

// =============================================================================
// Position & Ranking Badges
// =============================================================================

export type PositionTier = 'gold' | 'silver' | 'bronze' | 'top10' | 'standard' | 'minimal';

export interface PositionBadgeProps {
  /** 0-indexed position */
  position: number;
  /** Badge size */
  size?: BadgeSize;
  /** Show tier styling */
  showTier?: boolean;
  /** Custom class name */
  className?: string;
}

export interface RankBadgeProps {
  /** Ranking value (1-based) */
  rank: number;
  /** Badge size */
  size?: BadgeSize;
  /** Show star icon */
  showIcon?: boolean;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Consensus & Stats Badges
// =============================================================================

export type ConsensusTier = 'elite' | 'top' | 'solid' | 'common' | 'unranked';

export interface TierConfig {
  tier: ConsensusTier;
  label: string;
  icon: LucideIcon;
  color: BadgeColor;
  minRank?: number;
  maxRank?: number;
}

export interface TierIndicatorProps {
  /** Item ID to fetch tier for */
  itemId?: string;
  /** Direct tier value */
  tier?: ConsensusTier;
  /** Average rank (for tier calculation) */
  averageRank?: number;
  /** Badge size */
  size?: BadgeSize;
  /** Position on parent element */
  position?: BadgePosition;
  /** Custom class name */
  className?: string;
}

export interface ConsensusBadgeType {
  id: string;
  label: string;
  icon: LucideIcon;
  color: BadgeColor;
  condition: (metrics: ConsensusMetrics) => boolean;
}

export interface ConsensusMetrics {
  medianRank: number;
  averageRank: number;
  volatility: number;
  totalRankings: number;
  confidence: number;
}

export interface ConsensusBadgeProps {
  /** Consensus metrics for badge calculation */
  metrics: ConsensusMetrics;
  /** Badge size */
  size?: BadgeSize;
  /** Max badges to show */
  maxBadges?: number;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Average Ranking Badge
// =============================================================================

export interface AverageRankingBadgeProps {
  /** Item ID to fetch stats for */
  itemId?: string;
  /** Direct values (alternative to itemId) */
  averageRank?: number;
  percentile?: number;
  selectionCount?: number;
  /** Badge position on parent */
  position?: BadgePosition;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Badge size */
  size?: BadgeSize;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Status Badges
// =============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error' | 'conflict';

export interface StatusConfig {
  status: SyncStatus;
  label: string;
  icon: LucideIcon;
  color: BadgeColor;
  animate?: boolean;
}

export interface SyncStatusIndicatorProps {
  /** Current sync status */
  status?: SyncStatus;
  /** Pending changes count */
  pendingCount?: number;
  /** Has conflicts */
  hasConflict?: boolean;
  /** Show status label */
  showDetails?: boolean;
  /** Badge size */
  size?: BadgeSize;
  /** Click handler for conflicts */
  onConflictClick?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Progress Badges
// =============================================================================

export type ProgressVariant = 'dots' | 'bars' | 'line' | 'numbers';

export interface ProgressIndicatorProps {
  /** Current step/index */
  current: number;
  /** Total steps */
  total: number;
  /** Display variant */
  variant?: ProgressVariant;
  /** Accent color */
  accentColor?: string;
  /** Allow navigation clicks */
  allowNavigation?: boolean;
  /** Auto-play progress (0-100) */
  autoPlayProgress?: number;
  /** Position relative to content */
  direction?: 'top' | 'bottom' | 'left' | 'right';
  /** Navigation callback */
  onNavigate?: (index: number) => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Milestone & Achievement Badges
// =============================================================================

export interface MilestoneLevel {
  level: number;
  threshold: number;
  label: string;
  gradient: [string, string];
}

// =============================================================================
// Badge Animation Types
// =============================================================================

export interface BadgeAnimation {
  /** Entry animation type */
  enter?: 'fade' | 'scale' | 'slide' | 'spring' | 'bounce';
  /** Exit animation type */
  exit?: 'fade' | 'scale' | 'slide';
  /** Animation duration in ms */
  duration?: number;
  /** Animation delay in ms */
  delay?: number;
  /** Enable pulsing glow */
  pulse?: boolean;
  /** Enable shimmer effect */
  shimmer?: boolean;
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface BaseBadgeProps {
  /** Badge content */
  children?: React.ReactNode;
  /** Badge size */
  size?: BadgeSize;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge color scheme */
  color?: BadgeColor;
  /** Icon to display */
  icon?: LucideIcon;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Animation config */
  animation?: BadgeAnimation;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

export interface BadgeSizeConfig {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: number;
  gap: string;
}

export interface BadgePositionStyles {
  position: 'absolute';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}
