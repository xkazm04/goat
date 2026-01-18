/**
 * Badge Pattern Library
 *
 * Reusable badge components for displaying ranks, tiers,
 * status indicators, and visual markers.
 *
 * @example
 * ```tsx
 * import {
 *   Badge,
 *   BadgeGroup,
 *   PositionBadge,
 *   TierIndicator,
 *   badgeColors,
 * } from '@/components/patterns/badges';
 *
 * // Basic badge
 * <Badge icon={Star} color={badgeColors.gold}>Featured</Badge>
 *
 * // Position badge with tier styling
 * <PositionBadge position={0} /> // Gold #1
 *
 * // Tier indicator
 * <TierIndicator averageRank={5} position="top-right" />
 *
 * // Badge group with max display
 * <BadgeGroup max={3}>
 *   <Badge>Tag 1</Badge>
 *   <Badge>Tag 2</Badge>
 *   <Badge>Tag 3</Badge>
 *   <Badge>Tag 4</Badge> // Shows as "+1"
 * </BadgeGroup>
 * ```
 */

// Types
export * from './types';

// Components
export {
  Badge,
  BadgeGroup,
  PositionedBadge,
  badgeColors,
  type BadgeProps,
  type BadgeGroupProps,
  type PositionedBadgeProps,
} from './Badge';

export {
  PositionBadge,
  PositionBadgeWithIcon,
  PodiumBadge,
  getPositionTier,
  type PositionBadgeWithIconProps,
  type PodiumBadgeProps,
} from './PositionBadge';

export {
  TierIndicator,
  TierBadge,
  TierLegend,
  tierConfigs,
  getTierFromRank,
  getTierConfig,
  type TierBadgeProps,
  type TierLegendProps,
} from './TierIndicator';
