/**
 * Unified Ranking Types
 *
 * Types for the unified ranking system that serves as single source of truth
 * across all ranking modes (Podium, Goat, Rushmore, Bracket, Tier List).
 */

import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import type { BracketState, BracketSize } from '@/app/features/Match/lib/bracketGenerator';
import type { SeedingStrategy } from '@/app/features/Match/lib/seedingEngine';

// ============================================================================
// Core Ranking Types
// ============================================================================

/**
 * Active ranking mode
 */
export type RankingMode = 'direct' | 'bracket' | 'tierlist';

/**
 * View mode within direct ranking (different visualizations)
 */
export type DirectViewMode = 'podium' | 'goat' | 'rushmore';

/**
 * A single ranked item in the ranking
 */
export interface RankedItem {
  /** Unique ID for this ranking slot (e.g., "rank-0", "rank-1") */
  id: string;

  /** 0-based position in the ranking */
  position: number;

  /** Reference to the backlog item ID (null = empty slot) */
  itemId: string | null;

  /** Denormalized item data for display (null = empty slot) */
  item: TransferableItem | null;

  /** Metadata about how this ranking was assigned */
  metadata?: {
    /** When this item was assigned */
    assignedAt: number;

    /** Which mode assigned this item */
    assignedBy: RankingMode;

    /** Optional notes */
    notes?: string;
  };
}

// ============================================================================
// Bracket Types
// ============================================================================

/**
 * Bracket configuration
 */
export interface BracketConfig {
  /** Size of the bracket (8, 16, 32, 64) */
  size: BracketSize;

  /** Seeding strategy for initial placement */
  seedingStrategy: SeedingStrategy;
}

/**
 * Extended bracket state with ranking integration
 */
export interface RankingBracketState extends BracketState {
  /** When results were applied to ranking (null = not yet applied) */
  appliedToRankingAt: number | null;

  /** Snapshot of item IDs at time of application (for comparison) */
  rankingSnapshot: string[] | null;
}

// ============================================================================
// Tier Types
// ============================================================================

/**
 * Standard tier labels
 */
export type TierLabel = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Extended tier labels (for detailed presets)
 */
export type ExtendedTierLabel = TierLabel | 'A+' | 'A-' | 'B+' | 'B-';

/**
 * Single tier definition
 */
export interface TierDefinition {
  /** Unique tier ID */
  id: string;

  /** Display label (S, A, B, etc.) */
  label: TierLabel | ExtendedTierLabel;

  /** Human-readable name */
  displayName: string;

  /** Description of what this tier means */
  description: string;

  /** Color scheme for this tier */
  color: TierColor;
}

/**
 * Tier color configuration
 */
export interface TierColor {
  /** Primary background color */
  primary: string;

  /** Secondary/accent color */
  secondary: string;

  /** Accent for highlights */
  accent: string;

  /** Gradient string for backgrounds */
  gradient: string;

  /** Glow effect color */
  glow: string;

  /** Text color */
  text: string;

  /** Border color */
  border: string;
}

/**
 * Tier with items assigned
 */
export interface TierWithItems extends TierDefinition {
  /** Item IDs assigned to this tier (in order) */
  itemIds: string[];

  /** Whether this tier is collapsed in the UI */
  collapsed: boolean;
}

/**
 * Configuration for tier list behavior
 */
export interface TierConfig {
  /** Current preset ID */
  presetId: string;

  /** Tier definitions (structure, not items) */
  tiers: TierDefinition[];

  /** How tiers are derived: computed from ranking or explicitly set */
  derivationMode: 'computed' | 'explicit';
}

/**
 * Current tier state
 */
export interface TierState {
  /** Tiers with their assigned items */
  tiers: TierWithItems[];

  /** Item IDs not yet placed in any tier */
  unrankedItemIds: string[];

  /** Whether tier state has unsaved changes */
  isDirty: boolean;

  /** Last ranking state synced from (for conflict detection) */
  lastSyncedFromRanking: string[] | null;
}

// ============================================================================
// Tier Preset Types
// ============================================================================

/**
 * Complete tier list preset configuration
 */
export interface TierPreset {
  /** Unique preset ID */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Category (gaming, sports, entertainment, etc.) */
  category: string;

  /** Tier definitions with default colors */
  tiers: TierDefinition[];

  /** Whether to show unranked pool */
  showUnranked: boolean;
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Tier position boundaries (for deriving tiers from ranking)
 */
export interface TierBoundary {
  /** Tier ID */
  tierId: string;

  /** Starting position (inclusive) */
  startPosition: number;

  /** Ending position (inclusive) */
  endPosition: number;
}

/**
 * Computed tier boundaries based on ranking size
 */
export interface TierBoundaries {
  /** Total ranking size these boundaries were computed for */
  rankingSize: number;

  /** Boundaries for each tier */
  boundaries: TierBoundary[];
}

// ============================================================================
// Store State Types
// ============================================================================

/**
 * Complete unified ranking store state
 */
export interface RankingStoreState {
  // === Core Ranking ===

  /** The canonical ranking (source of truth) */
  ranking: RankedItem[];

  /** Maximum ranking size (e.g., 10, 50) */
  maxRankingSize: number;

  /** Currently active mode */
  activeMode: RankingMode;

  /** Direct view mode when in direct mode */
  directViewMode: DirectViewMode;

  // === Bracket State ===

  /** Current bracket state (null if no bracket active) */
  bracketState: RankingBracketState | null;

  /** Bracket configuration */
  bracketConfig: BracketConfig | null;

  // === Tier State ===

  /** Current tier state */
  tierState: TierState;

  /** Tier configuration */
  tierConfig: TierConfig;

  // === Computed Statistics ===

  /** Number of filled positions */
  filledCount: number;

  /** Completion percentage */
  completionPercentage: number;

  /** Whether ranking is complete */
  isComplete: boolean;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Result of a ranking operation
 */
export interface RankingOperationResult {
  /** Whether operation succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Position affected (if applicable) */
  position?: number;

  /** Item affected (if applicable) */
  itemId?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Create an empty ranked item for a position
 */
export function createEmptyRankedItem(position: number): RankedItem {
  return {
    id: `rank-${position}`,
    position,
    itemId: null,
    item: null,
  };
}

/**
 * Create a ranked item with an item assigned
 */
export function createRankedItem(
  position: number,
  item: TransferableItem,
  assignedBy: RankingMode = 'direct'
): RankedItem {
  return {
    id: `rank-${position}`,
    position,
    itemId: item.id,
    item,
    metadata: {
      assignedAt: Date.now(),
      assignedBy,
    },
  };
}

/**
 * Initialize an empty ranking of given size
 */
export function createEmptyRanking(size: number): RankedItem[] {
  return Array.from({ length: size }, (_, i) => createEmptyRankedItem(i));
}

/**
 * Default tier config (classic S-F tiers)
 */
export const DEFAULT_TIER_CONFIG: TierConfig = {
  presetId: 'classic',
  tiers: [
    {
      id: 'S',
      label: 'S',
      displayName: 'S Tier',
      description: 'The best of the best',
      color: {
        primary: '#FF4444',
        secondary: '#FF6666',
        accent: '#FF8888',
        gradient: 'linear-gradient(135deg, #FF4444, #FF6666)',
        glow: 'rgba(255, 68, 68, 0.5)',
        text: '#FFFFFF',
        border: '#FF4444',
      },
    },
    {
      id: 'A',
      label: 'A',
      displayName: 'A Tier',
      description: 'Excellent choices',
      color: {
        primary: '#FF8800',
        secondary: '#FFA033',
        accent: '#FFB866',
        gradient: 'linear-gradient(135deg, #FF8800, #FFA033)',
        glow: 'rgba(255, 136, 0, 0.5)',
        text: '#FFFFFF',
        border: '#FF8800',
      },
    },
    {
      id: 'B',
      label: 'B',
      displayName: 'B Tier',
      description: 'Good picks',
      color: {
        primary: '#FFCC00',
        secondary: '#FFD633',
        accent: '#FFE066',
        gradient: 'linear-gradient(135deg, #FFCC00, #FFD633)',
        glow: 'rgba(255, 204, 0, 0.5)',
        text: '#000000',
        border: '#FFCC00',
      },
    },
    {
      id: 'C',
      label: 'C',
      displayName: 'C Tier',
      description: 'Average selections',
      color: {
        primary: '#00CC44',
        secondary: '#33D966',
        accent: '#66E088',
        gradient: 'linear-gradient(135deg, #00CC44, #33D966)',
        glow: 'rgba(0, 204, 68, 0.5)',
        text: '#FFFFFF',
        border: '#00CC44',
      },
    },
    {
      id: 'D',
      label: 'D',
      displayName: 'D Tier',
      description: 'Below average',
      color: {
        primary: '#0088FF',
        secondary: '#33A0FF',
        accent: '#66B8FF',
        gradient: 'linear-gradient(135deg, #0088FF, #33A0FF)',
        glow: 'rgba(0, 136, 255, 0.5)',
        text: '#FFFFFF',
        border: '#0088FF',
      },
    },
    {
      id: 'F',
      label: 'F',
      displayName: 'F Tier',
      description: 'Not recommended',
      color: {
        primary: '#8844FF',
        secondary: '#9966FF',
        accent: '#AA88FF',
        gradient: 'linear-gradient(135deg, #8844FF, #9966FF)',
        glow: 'rgba(136, 68, 255, 0.5)',
        text: '#FFFFFF',
        border: '#8844FF',
      },
    },
  ],
  derivationMode: 'computed',
};

/**
 * Compute tier boundaries for a given ranking size
 * Uses standard distribution: S(10%), A(15%), B(25%), C(25%), D(15%), F(10%)
 */
export function computeTierBoundaries(
  rankingSize: number,
  tierIds: string[] = ['S', 'A', 'B', 'C', 'D', 'F']
): TierBoundaries {
  // Distribution percentages
  const distribution = [0.10, 0.15, 0.25, 0.25, 0.15, 0.10];

  const boundaries: TierBoundary[] = [];
  let currentPosition = 0;

  for (let i = 0; i < tierIds.length; i++) {
    const tierSize = Math.round(rankingSize * distribution[i]);
    const endPosition = Math.min(currentPosition + tierSize - 1, rankingSize - 1);

    if (currentPosition <= endPosition) {
      boundaries.push({
        tierId: tierIds[i],
        startPosition: currentPosition,
        endPosition,
      });
    }

    currentPosition = endPosition + 1;
  }

  // Ensure all positions are covered
  if (boundaries.length > 0 && currentPosition < rankingSize) {
    boundaries[boundaries.length - 1].endPosition = rankingSize - 1;
  }

  return { rankingSize, boundaries };
}

/**
 * Get the tier ID for a given position
 */
export function getTierForPosition(
  position: number,
  boundaries: TierBoundaries
): string | null {
  for (const boundary of boundaries.boundaries) {
    if (position >= boundary.startPosition && position <= boundary.endPosition) {
      return boundary.tierId;
    }
  }
  return null;
}
