/**
 * TierRankingMode
 * Alternative ranking mode where users drag items directly into tiers
 */

export { TierRankingMode } from './TierRankingMode';
export { TierDropZone, MiniTierDropZone, TierQuickSelect } from './TierDropZone';
export { TierAutoArranger, BulkTierArranger, applyArrangementStrategy } from './TierAutoArranger';
export type { ArrangementStrategy } from './TierAutoArranger';
export { TierRowCustomizer } from './TierRowCustomizer';

// Re-export from lib/tiers for convenience
export {
  TierRow,
  TierRowCompact,
  createTierRowDropData,
  createTierItemDragData,
  isTierRowDropData,
  isTierItemDragData,
} from '@/lib/tiers/TierRow';

export type {
  TierRowDropData,
  TierItemDragData,
} from '@/lib/tiers/TierRow';

export {
  TierConverter,
  createTierConverter,
  convertTiersToPositions,
  convertPositionsToTiers,
} from '@/lib/tiers/TierConverter';

export type {
  TierItem,
  TierAssignment,
  TierToPositionResult,
  PositionToTierResult,
  ConversionStrategy,
  ConversionConfig,
} from '@/lib/tiers/TierConverter';
