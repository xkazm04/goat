/**
 * Unified Ranking Store - Single Source of Truth
 *
 * This store serves as the unified source of truth for all ranking data across
 * all modes (Podium, Goat, Rushmore, Bracket, Tier List). It manages:
 * - Core ranking array (the canonical ranking)
 * - Bracket state (tournament progress)
 * - Tier state (tier assignments)
 * - Smart tier calculation (auto-classification, algorithms, suggestions)
 *
 * Design principles:
 * - ranking[] is the single source of truth
 * - Bracket and tier states derive from and write to ranking
 * - All modes read from and write to this store
 * - Backward compatible with grid-store patterns
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { TransferableItem } from '@/lib/dnd/transfer-protocol';
import { GRID_LIMITS } from '@/lib/grid/constants';
import type { BacklogItem } from '@/types/backlog-groups';
import type {
  RankingMode,
  DirectViewMode,
  RankedItem,
  BracketConfig,
  RankingBracketState,
  TierState,
  TierConfig,
  TierWithItems,
  TierDefinition as BaseTierDefinition,
  RankingStoreState,
  TierBoundaries,
} from '@/types/ranking';
import {
  createEmptyRanking,
  createRankedItem,
  createEmptyRankedItem,
  DEFAULT_TIER_CONFIG,
  computeTierBoundaries,
  getTierForPosition,
} from '@/types/ranking';
import {
  createEmptyBracket,
  seedBracket,
  recordMatchupResult,
  bracketToRanking,
  type BracketState,
  type BracketSize,
} from '@/app/features/Match/lib/bracketGenerator';
import { seedParticipants, type SeedingStrategy } from '@/app/features/Match/lib/seedingEngine';
import { backlogToTransferable } from '@/lib/dnd/type-guards';
import {
  calculateTierBoundaries,
  createTiersFromBoundaries,
  assignTiersToItems,
  calculateTierSummary,
  extractBoundaries,
  generateTierSuggestions,
  adjustPresetToSize,
} from '@/lib/tiers/TierCalculator';
import {
  getBestPresetForSize,
  DEFAULT_TIER_CONFIGURATION,
} from '@/lib/tiers/constants';
import type {
  TierDefinition,
  TieredItem,
  TierBoundary as TierBoundaryType,
  TierSummary,
  TierSuggestion,
  TierAlgorithm,
  TierPreset,
  TierConfiguration,
} from '@/lib/tiers/types';
import { tierLogger } from '@/lib/logger';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute statistics from ranking
 */
function computeStatistics(ranking: RankedItem[]) {
  const filledCount = ranking.filter(r => r.itemId !== null).length;
  const total = ranking.length;
  return {
    filledCount,
    completionPercentage: total > 0 ? Math.round((filledCount / total) * 100) : 0,
    isComplete: filledCount === total && total > 0,
  };
}

/**
 * Derive tier state from ranking
 */
function deriveTiersFromRanking(
  ranking: RankedItem[],
  tierConfig: TierConfig
): TierState {
  const filledItems = ranking.filter(r => r.itemId !== null);
  const rankingSize = filledItems.length || ranking.length;
  const boundaries = computeTierBoundaries(rankingSize, tierConfig.tiers.map(t => t.id));

  // Build tiers with items
  const tiers: TierWithItems[] = tierConfig.tiers.map(tierDef => ({
    ...tierDef,
    itemIds: [],
    collapsed: false,
  }));

  // Assign items to tiers based on position
  for (const rankedItem of filledItems) {
    const tierId = getTierForPosition(rankedItem.position, boundaries);
    if (tierId) {
      const tier = tiers.find(t => t.id === tierId);
      if (tier && rankedItem.itemId) {
        tier.itemIds.push(rankedItem.itemId);
      }
    }
  }

  return {
    tiers,
    unrankedItemIds: [],
    isDirty: false,
    lastSyncedFromRanking: filledItems.map(r => r.itemId!),
  };
}

/**
 * Convert tier state to ranking positions
 */
function tiersToRanking(
  tierState: TierState,
  itemsMap: Map<string, TransferableItem>,
  maxSize: number
): RankedItem[] {
  const ranking: RankedItem[] = [];
  let position = 0;

  // Add items in tier order
  for (const tier of tierState.tiers) {
    for (const itemId of tier.itemIds) {
      if (position >= maxSize) break;
      const item = itemsMap.get(itemId);
      if (item) {
        ranking.push(createRankedItem(position, item, 'tierlist'));
        position++;
      }
    }
  }

  // Fill remaining positions with empty slots
  while (ranking.length < maxSize) {
    ranking.push(createEmptyRankedItem(ranking.length));
  }

  return ranking;
}

// ============================================================================
// Initial State
// ============================================================================

const initialTierState: TierState = {
  tiers: DEFAULT_TIER_CONFIG.tiers.map(t => ({
    ...t,
    itemIds: [],
    collapsed: false,
  })),
  unrankedItemIds: [],
  isDirty: false,
  lastSyncedFromRanking: null,
};

/**
 * Smart tier calculation state
 * Consolidated from tier-store.ts
 */
interface SmartTierState {
  /** Tier configuration for auto-calculation */
  configuration: TierConfiguration;
  /** Calculated tier definitions with boundaries */
  currentTiers: TierDefinition[];
  /** Tier boundaries for UI rendering */
  boundaries: TierBoundaryType[];
  /** Items with tier assignments */
  tieredItems: TieredItem[];
  /** Tier summary statistics */
  summary: TierSummary | null;
  /** AI-generated tier suggestions */
  suggestions: TierSuggestion[];
  /** Whether calculation is in progress */
  isCalculating: boolean;
  /** Timestamp of last calculation */
  lastCalculated: number | null;
}

const initialSmartTierState: SmartTierState = {
  configuration: DEFAULT_TIER_CONFIGURATION,
  currentTiers: [],
  boundaries: [],
  tieredItems: [],
  summary: null,
  suggestions: [],
  isCalculating: false,
  lastCalculated: null,
};

// ============================================================================
// Store Definition
// ============================================================================

interface RankingActions {
  // === Initialization ===
  initializeRanking: (size: number) => void;
  loadRanking: (ranking: RankedItem[]) => void;

  // === Core Ranking Actions ===
  assignToPosition: (item: TransferableItem | BacklogItem, position: number) => void;
  removeFromPosition: (position: number) => void;
  movePosition: (fromPosition: number, toPosition: number) => void;
  swapPositions: (posA: number, posB: number) => void;
  clearRanking: () => void;

  // === Mode Actions ===
  setActiveMode: (mode: RankingMode) => void;
  setDirectViewMode: (mode: DirectViewMode) => void;

  // === Bracket Actions ===
  initializeBracket: (items: BacklogItem[], config: BracketConfig) => void;
  recordMatchup: (matchupId: string, winnerId: string) => void;
  applyBracketToRanking: () => void;
  resetBracket: () => void;

  // === Tier Actions ===
  assignToTier: (itemId: string, tierId: string, item?: TransferableItem) => void;
  removeFromTier: (itemId: string, tierId: string) => void;
  moveWithinTier: (tierId: string, fromIndex: number, toIndex: number) => void;
  moveBetweenTiers: (itemId: string, fromTierId: string, toTierId: string, toIndex?: number) => void;
  addToUnranked: (itemId: string, item?: TransferableItem) => void;
  removeFromUnranked: (itemId: string) => void;
  syncTiersFromRanking: () => void;
  syncRankingFromTiers: (itemsMap: Map<string, TransferableItem>) => void;
  setTierConfig: (config: TierConfig) => void;

  // === Custom Tier Config Actions ===
  addTier: (tier: BaseTierDefinition, position?: number) => void;
  removeTier: (tierId: string) => void;
  updateTier: (tierId: string, updates: Partial<BaseTierDefinition>) => void;
  reorderTiers: (fromIndex: number, toIndex: number) => void;
  toggleTierCollapse: (tierId: string) => void;
  setAllTiersCollapsed: (collapsed: boolean) => void;

  // === Smart Tier Actions (consolidated from tier-store) ===
  setSmartTierEnabled: (enabled: boolean) => void;
  setSmartTierPreset: (preset: TierPreset) => void;
  setCustomThresholds: (thresholds: number[]) => void;
  toggleBands: () => void;
  toggleLabels: () => void;
  toggleSeparators: () => void;
  calculateSmartTiers: (listSize: number, filledPositions: number[]) => void;
  recalculateSmartTiers: () => void;
  applyAlgorithm: (algorithm: TierAlgorithm, params?: Record<string, number>) => void;
  adjustBoundary: (boundaryIndex: number, newPosition: number) => void;
  resetBoundaries: () => void;
  getSmartTierSuggestions: () => void;
  applySmartTierSuggestion: (suggestion: TierSuggestion) => void;
  resetSmartTiers: () => void;

  // === Utilities ===
  getItemAtPosition: (position: number) => TransferableItem | null;
  getNextAvailablePosition: () => number | null;
  isPositionOccupied: (position: number) => boolean;
}

/** Extended store state with smart tier calculation */
interface ExtendedRankingStoreState extends RankingStoreState {
  smartTierState: SmartTierState;
}

/** Complete store type combining state and actions */
type RankingStore = ExtendedRankingStoreState & RankingActions;

/** Selector type helper */
type RankingState = ExtendedRankingStoreState;

export const useRankingStore = create<RankingStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // === Initial State ===
        ranking: [],
        maxRankingSize: GRID_LIMITS.MAX_SIZE,
        activeMode: 'direct' as RankingMode,
        directViewMode: 'podium' as DirectViewMode,
        bracketState: null,
        bracketConfig: null,
        tierState: initialTierState,
        tierConfig: DEFAULT_TIER_CONFIG,
        smartTierState: initialSmartTierState,
        filledCount: 0,
        completionPercentage: 0,
        isComplete: false,

        // === Initialization ===
        initializeRanking: (size: number) => {
          const ranking = createEmptyRanking(size);
          const stats = computeStatistics(ranking);

          set({
            ranking,
            maxRankingSize: size,
            ...stats,
            tierState: {
              ...initialTierState,
              tiers: get().tierConfig.tiers.map(t => ({
                ...t,
                itemIds: [],
                collapsed: false,
              })),
            },
            // Reset bracket state when list changes
            bracketState: null,
            bracketConfig: null,
          });
        },

        loadRanking: (ranking: RankedItem[]) => {
          const stats = computeStatistics(ranking);
          const tierState = deriveTiersFromRanking(ranking, get().tierConfig);

          set({
            ranking,
            maxRankingSize: ranking.length,
            ...stats,
            tierState,
          });
        },

        // === Core Ranking Actions ===
        assignToPosition: (item, position) => {
          set(state => {
            if (position < 0 || position >= state.ranking.length) return state;
            if (state.ranking[position].itemId !== null) return state;

            const transferable: TransferableItem =
              'category' in item && typeof (item as BacklogItem).category === 'string'
                ? backlogToTransferable(item as BacklogItem)
                : (item as TransferableItem);

            const newRanking = [...state.ranking];
            newRanking[position] = createRankedItem(position, transferable, state.activeMode);

            const stats = computeStatistics(newRanking);

            return {
              ranking: newRanking,
              ...stats,
            };
          });
        },

        removeFromPosition: (position) => {
          set(state => {
            if (position < 0 || position >= state.ranking.length) return state;

            const newRanking = [...state.ranking];
            newRanking[position] = createEmptyRankedItem(position);

            const stats = computeStatistics(newRanking);

            return {
              ranking: newRanking,
              ...stats,
            };
          });
        },

        movePosition: (fromPosition, toPosition) => {
          set(state => {
            if (fromPosition < 0 || fromPosition >= state.ranking.length) return state;
            if (toPosition < 0 || toPosition >= state.ranking.length) return state;
            if (fromPosition === toPosition) return state;

            const newRanking = [...state.ranking];
            const fromItem = newRanking[fromPosition];
            const toItem = newRanking[toPosition];

            // If target is empty, move. If occupied, swap.
            if (toItem.itemId === null) {
              // Move: source becomes empty, target gets the item
              newRanking[toPosition] = {
                ...fromItem,
                id: `rank-${toPosition}`,
                position: toPosition,
              };
              newRanking[fromPosition] = createEmptyRankedItem(fromPosition);
            } else {
              // Swap
              newRanking[fromPosition] = {
                ...toItem,
                id: `rank-${fromPosition}`,
                position: fromPosition,
              };
              newRanking[toPosition] = {
                ...fromItem,
                id: `rank-${toPosition}`,
                position: toPosition,
              };
            }

            return { ranking: newRanking };
          });
        },

        swapPositions: (posA, posB) => {
          get().movePosition(posA, posB);
        },

        clearRanking: () => {
          const size = get().maxRankingSize;
          get().initializeRanking(size);
        },

        // === Mode Actions ===
        setActiveMode: (mode) => {
          set(state => {
            // When switching to tier mode, sync tiers from ranking
            if (mode === 'tierlist' && state.activeMode !== 'tierlist') {
              const tierState = deriveTiersFromRanking(state.ranking, state.tierConfig);
              return { activeMode: mode, tierState };
            }
            return { activeMode: mode };
          });
        },

        setDirectViewMode: (mode) => {
          set({ directViewMode: mode });
        },

        // === Bracket Actions ===
        initializeBracket: (items, config) => {
          const { size, seedingStrategy } = config;

          // Create and seed bracket
          const emptyBracket = createEmptyBracket(size);
          const participants = seedParticipants(items, size, { strategy: seedingStrategy });
          const seededBracket = seedBracket(emptyBracket, participants);

          const bracketState: RankingBracketState = {
            ...seededBracket,
            appliedToRankingAt: null,
            rankingSnapshot: null,
          };

          set({
            bracketState,
            bracketConfig: config,
            activeMode: 'bracket',
          });
        },

        recordMatchup: (matchupId, winnerId) => {
          set(state => {
            if (!state.bracketState) return state;

            const updated = recordMatchupResult(state.bracketState, matchupId, winnerId);
            const bracketState: RankingBracketState = {
              ...updated,
              appliedToRankingAt: state.bracketState.appliedToRankingAt,
              rankingSnapshot: state.bracketState.rankingSnapshot,
            };

            return { bracketState };
          });
        },

        applyBracketToRanking: () => {
          set(state => {
            if (!state.bracketState || !state.bracketState.isComplete) return state;

            // Convert bracket to ranked participants
            const rankedParticipants = bracketToRanking(state.bracketState);

            // Build new ranking
            const maxSize = state.maxRankingSize;
            const newRanking: RankedItem[] = [];

            for (let i = 0; i < maxSize; i++) {
              if (i < rankedParticipants.length && rankedParticipants[i].item) {
                const item = rankedParticipants[i].item!;
                const transferable: TransferableItem = {
                  id: item.id,
                  title: item.title || item.name || 'Untitled',
                  description: item.description,
                  image_url: item.image_url,
                  tags: item.tags,
                  category: item.category,
                };
                newRanking.push(createRankedItem(i, transferable, 'bracket'));
              } else {
                newRanking.push(createEmptyRankedItem(i));
              }
            }

            const stats = computeStatistics(newRanking);

            // Update bracket state with application timestamp
            const bracketState: RankingBracketState = {
              ...state.bracketState,
              appliedToRankingAt: Date.now(),
              rankingSnapshot: newRanking.filter(r => r.itemId).map(r => r.itemId!),
            };

            return {
              ranking: newRanking,
              bracketState,
              activeMode: 'direct',
              directViewMode: 'podium',
              ...stats,
            };
          });
        },

        resetBracket: () => {
          set({
            bracketState: null,
            bracketConfig: null,
          });
        },

        // === Tier Actions ===
        assignToTier: (itemId, tierId, item) => {
          set(state => {
            const tierIndex = state.tierState.tiers.findIndex(t => t.id === tierId);
            if (tierIndex === -1) return state;

            // Check if already in this tier
            if (state.tierState.tiers[tierIndex].itemIds.includes(itemId)) return state;

            // Remove from any other tier first
            const newTiers = state.tierState.tiers.map(tier => ({
              ...tier,
              itemIds: tier.itemIds.filter(id => id !== itemId),
            }));

            // Add to target tier
            newTiers[tierIndex] = {
              ...newTiers[tierIndex],
              itemIds: [...newTiers[tierIndex].itemIds, itemId],
            };

            // Remove from unranked if present
            const newUnranked = state.tierState.unrankedItemIds.filter(id => id !== itemId);

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
                unrankedItemIds: newUnranked,
                isDirty: true,
              },
            };
          });
        },

        removeFromTier: (itemId, tierId) => {
          set(state => {
            const tierIndex = state.tierState.tiers.findIndex(t => t.id === tierId);
            if (tierIndex === -1) return state;

            const newTiers = [...state.tierState.tiers];
            newTiers[tierIndex] = {
              ...newTiers[tierIndex],
              itemIds: newTiers[tierIndex].itemIds.filter(id => id !== itemId),
            };

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
                isDirty: true,
              },
            };
          });
        },

        moveWithinTier: (tierId, fromIndex, toIndex) => {
          set(state => {
            const tierIndex = state.tierState.tiers.findIndex(t => t.id === tierId);
            if (tierIndex === -1) return state;

            const tier = state.tierState.tiers[tierIndex];
            if (fromIndex < 0 || fromIndex >= tier.itemIds.length) return state;
            if (toIndex < 0 || toIndex >= tier.itemIds.length) return state;

            const newItemIds = [...tier.itemIds];
            const [removed] = newItemIds.splice(fromIndex, 1);
            newItemIds.splice(toIndex, 0, removed);

            const newTiers = [...state.tierState.tiers];
            newTiers[tierIndex] = {
              ...tier,
              itemIds: newItemIds,
            };

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
                isDirty: true,
              },
            };
          });
        },

        moveBetweenTiers: (itemId, fromTierId, toTierId, toIndex) => {
          set(state => {
            const fromTierIndex = state.tierState.tiers.findIndex(t => t.id === fromTierId);
            const toTierIndex = state.tierState.tiers.findIndex(t => t.id === toTierId);

            if (fromTierIndex === -1 || toTierIndex === -1) return state;

            const newTiers = [...state.tierState.tiers];

            // Remove from source
            newTiers[fromTierIndex] = {
              ...newTiers[fromTierIndex],
              itemIds: newTiers[fromTierIndex].itemIds.filter(id => id !== itemId),
            };

            // Add to target
            const targetIds = [...newTiers[toTierIndex].itemIds];
            if (toIndex !== undefined && toIndex >= 0) {
              targetIds.splice(toIndex, 0, itemId);
            } else {
              targetIds.push(itemId);
            }
            newTiers[toTierIndex] = {
              ...newTiers[toTierIndex],
              itemIds: targetIds,
            };

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
                isDirty: true,
              },
            };
          });
        },

        addToUnranked: (itemId, item) => {
          set(state => {
            if (state.tierState.unrankedItemIds.includes(itemId)) return state;

            // Remove from any tier first
            const newTiers = state.tierState.tiers.map(tier => ({
              ...tier,
              itemIds: tier.itemIds.filter(id => id !== itemId),
            }));

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
                unrankedItemIds: [...state.tierState.unrankedItemIds, itemId],
                isDirty: true,
              },
            };
          });
        },

        removeFromUnranked: (itemId) => {
          set(state => ({
            tierState: {
              ...state.tierState,
              unrankedItemIds: state.tierState.unrankedItemIds.filter(id => id !== itemId),
              isDirty: true,
            },
          }));
        },

        syncTiersFromRanking: () => {
          set(state => {
            const tierState = deriveTiersFromRanking(state.ranking, state.tierConfig);
            return { tierState };
          });
        },

        syncRankingFromTiers: (itemsMap) => {
          set(state => {
            const newRanking = tiersToRanking(state.tierState, itemsMap, state.maxRankingSize);
            const stats = computeStatistics(newRanking);

            return {
              ranking: newRanking,
              tierState: {
                ...state.tierState,
                isDirty: false,
                lastSyncedFromRanking: newRanking.filter(r => r.itemId).map(r => r.itemId!),
              },
              ...stats,
            };
          });
        },

        setTierConfig: (config) => {
          set(state => {
            // Rebuild tier state with new config
            const newTiers = config.tiers.map(tierDef => {
              const existingTier = state.tierState.tiers.find(t => t.id === tierDef.id);
              return {
                ...tierDef,
                itemIds: existingTier?.itemIds || [],
                collapsed: existingTier?.collapsed || false,
              };
            });

            return {
              tierConfig: config,
              tierState: {
                ...state.tierState,
                tiers: newTiers,
              },
            };
          });
        },

        // === Custom Tier Config Actions ===
        addTier: (tier, position) => {
          set(state => {
            // Validate: max 10 tiers
            if (state.tierConfig.tiers.length >= 10) {
              tierLogger.warn('Cannot add tier: maximum of 10 tiers allowed');
              return state;
            }

            const newTiers = [...state.tierConfig.tiers];
            const insertPos = position ?? newTiers.length;
            newTiers.splice(insertPos, 0, tier);

            const newTierState: TierWithItems[] = [...state.tierState.tiers];
            newTierState.splice(insertPos, 0, {
              ...tier,
              itemIds: [],
              collapsed: false,
            });

            return {
              tierConfig: {
                ...state.tierConfig,
                tiers: newTiers,
              },
              tierState: {
                ...state.tierState,
                tiers: newTierState,
              },
            };
          });
        },

        removeTier: (tierId) => {
          set(state => {
            // Validate: min 2 tiers
            if (state.tierConfig.tiers.length <= 2) {
              tierLogger.warn('Cannot remove tier: minimum of 2 tiers required');
              return state;
            }

            // Find the tier being removed
            const removedTier = state.tierState.tiers.find(t => t.id === tierId);
            const itemsToMove = removedTier?.itemIds || [];

            // Remove from config
            const newConfigTiers = state.tierConfig.tiers.filter(t => t.id !== tierId);
            const newStateTiers = state.tierState.tiers.filter(t => t.id !== tierId);

            // Move items to unranked pool
            const newUnranked = [...state.tierState.unrankedItemIds, ...itemsToMove];

            return {
              tierConfig: {
                ...state.tierConfig,
                tiers: newConfigTiers,
              },
              tierState: {
                ...state.tierState,
                tiers: newStateTiers,
                unrankedItemIds: newUnranked,
                isDirty: true,
              },
            };
          });
        },

        updateTier: (tierId, updates) => {
          set(state => {
            // Update in config
            const newConfigTiers = state.tierConfig.tiers.map(t =>
              t.id === tierId ? { ...t, ...updates } : t
            );

            // Update in state
            const newStateTiers = state.tierState.tiers.map(t =>
              t.id === tierId ? { ...t, ...updates } : t
            );

            return {
              tierConfig: {
                ...state.tierConfig,
                tiers: newConfigTiers,
              },
              tierState: {
                ...state.tierState,
                tiers: newStateTiers,
              },
            };
          });
        },

        reorderTiers: (fromIndex, toIndex) => {
          set(state => {
            if (fromIndex < 0 || fromIndex >= state.tierConfig.tiers.length) return state;
            if (toIndex < 0 || toIndex >= state.tierConfig.tiers.length) return state;

            // Reorder config tiers
            const newConfigTiers = [...state.tierConfig.tiers];
            const [movedConfig] = newConfigTiers.splice(fromIndex, 1);
            newConfigTiers.splice(toIndex, 0, movedConfig);

            // Reorder state tiers
            const newStateTiers = [...state.tierState.tiers];
            const [movedState] = newStateTiers.splice(fromIndex, 1);
            newStateTiers.splice(toIndex, 0, movedState);

            return {
              tierConfig: {
                ...state.tierConfig,
                tiers: newConfigTiers,
              },
              tierState: {
                ...state.tierState,
                tiers: newStateTiers,
              },
            };
          });
        },

        toggleTierCollapse: (tierId) => {
          set(state => {
            const newTiers = state.tierState.tiers.map(t =>
              t.id === tierId ? { ...t, collapsed: !t.collapsed } : t
            );

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
              },
            };
          });
        },

        setAllTiersCollapsed: (collapsed) => {
          set(state => {
            const newTiers = state.tierState.tiers.map(t => ({ ...t, collapsed }));

            return {
              tierState: {
                ...state.tierState,
                tiers: newTiers,
              },
            };
          });
        },

        // === Smart Tier Actions (consolidated from tier-store) ===
        setSmartTierEnabled: (enabled) => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: { ...state.smartTierState.configuration, enabled },
            },
          }));

          // Recalculate if enabling
          if (enabled) {
            get().recalculateSmartTiers();
          }
        },

        setSmartTierPreset: (preset) => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: { ...state.smartTierState.configuration, preset },
            },
          }));
          get().recalculateSmartTiers();
        },

        setCustomThresholds: (thresholds) => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: { ...state.smartTierState.configuration, customThresholds: thresholds },
            },
          }));
          get().recalculateSmartTiers();
        },

        toggleBands: () => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                showBands: !state.smartTierState.configuration.showBands,
              },
            },
          }));
        },

        toggleLabels: () => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                showLabels: !state.smartTierState.configuration.showLabels,
              },
            },
          }));
        },

        toggleSeparators: () => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                showSeparators: !state.smartTierState.configuration.showSeparators,
              },
            },
          }));
        },

        calculateSmartTiers: (listSize, filledPositions) => {
          set(state => ({
            smartTierState: { ...state.smartTierState, isCalculating: true },
          }));

          try {
            const state = get();
            const { configuration } = state.smartTierState;

            // Get or adjust preset for list size
            let preset = configuration.preset;
            if (
              listSize < preset.listSizeRange.min ||
              listSize > preset.listSizeRange.max
            ) {
              preset = getBestPresetForSize(listSize);
            }

            // Calculate boundaries based on algorithm
            const algorithm: TierAlgorithm = configuration.autoAdjust
              ? 'pyramid'
              : 'equal';

            const boundaries =
              configuration.customThresholds.length > 0
                ? configuration.customThresholds
                : calculateTierBoundaries(listSize, preset.tierCount, algorithm);

            // Adjust preset to fit actual list size
            const adjustedPreset = adjustPresetToSize(preset, listSize);

            // Create tier definitions from boundaries
            const tiers = createTiersFromBoundaries(boundaries, adjustedPreset);

            // Convert filled positions to item format
            const itemData = filledPositions.map((pos, idx) => ({
              itemId: `item-${pos}`,
              position: pos,
            }));

            // Assign tiers to items
            const tieredItems = assignTiersToItems(itemData, tiers);

            // Calculate summary
            const summary = calculateTierSummary(tiers, tieredItems, listSize);

            // Extract boundaries
            const tierBoundaries = extractBoundaries(tiers);

            // Generate suggestions
            const suggestions = generateTierSuggestions(
              listSize,
              filledPositions,
              preset.tierCount
            );

            set(state => ({
              smartTierState: {
                ...state.smartTierState,
                configuration: { ...state.smartTierState.configuration, preset: adjustedPreset },
                currentTiers: tiers,
                boundaries: tierBoundaries,
                tieredItems,
                summary,
                suggestions,
                isCalculating: false,
                lastCalculated: Date.now(),
              },
            }));
          } catch (error) {
            tierLogger.error('Smart tier calculation failed:', error);
            set(state => ({
              smartTierState: { ...state.smartTierState, isCalculating: false },
            }));
          }
        },

        recalculateSmartTiers: () => {
          // Mark as needing recalculation - actual recalculation happens when called with data
          set(state => ({
            smartTierState: { ...state.smartTierState, lastCalculated: null },
          }));
        },

        applyAlgorithm: (algorithm, params = {}) => {
          const state = get();
          const { currentTiers, configuration } = state.smartTierState;

          if (currentTiers.length === 0) return;

          const listSize = currentTiers[currentTiers.length - 1].endPosition;
          const boundaries = calculateTierBoundaries(
            listSize,
            configuration.preset.tierCount,
            algorithm,
            params
          );

          // Update with new boundaries
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                customThresholds: boundaries,
              },
            },
          }));

          // Recalculate with new boundaries
          get().recalculateSmartTiers();
        },

        adjustBoundary: (boundaryIndex, newPosition) => {
          const state = get();
          const { boundaries, currentTiers } = state.smartTierState;

          if (boundaryIndex < 0 || boundaryIndex >= boundaries.length) return;

          // Validate the new position is within valid range
          const minPos = boundaryIndex > 0
            ? boundaries[boundaryIndex - 1].position + 1
            : currentTiers[0].startPosition + 1;
          const maxPos = boundaryIndex < boundaries.length - 1
            ? boundaries[boundaryIndex + 1].position - 1
            : currentTiers[currentTiers.length - 1].endPosition - 1;

          const clampedPosition = Math.max(minPos, Math.min(maxPos, newPosition));

          // Update the boundary
          const newBoundaries = [...boundaries];
          newBoundaries[boundaryIndex] = {
            ...newBoundaries[boundaryIndex],
            position: clampedPosition,
            isCustomized: true,
          };

          // Update tier definitions
          const newTiers = [...currentTiers];
          newTiers[boundaryIndex] = {
            ...newTiers[boundaryIndex],
            endPosition: clampedPosition,
          };
          newTiers[boundaryIndex + 1] = {
            ...newTiers[boundaryIndex + 1],
            startPosition: clampedPosition,
          };

          // Extract custom thresholds
          const customThresholds = [
            0,
            ...newBoundaries.map((b) => b.position),
            newTiers[newTiers.length - 1].endPosition,
          ];

          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              boundaries: newBoundaries,
              currentTiers: newTiers,
              configuration: {
                ...state.smartTierState.configuration,
                customThresholds,
              },
            },
          }));

          // Recalculate summary
          get().recalculateSmartTiers();
        },

        resetBoundaries: () => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                customThresholds: [],
              },
            },
          }));
          get().recalculateSmartTiers();
        },

        getSmartTierSuggestions: () => {
          const state = get();
          const { currentTiers, tieredItems, configuration } = state.smartTierState;

          if (currentTiers.length === 0) return;

          const listSize = currentTiers[currentTiers.length - 1].endPosition;
          const filledPositions = tieredItems.map((item) => item.position);

          const suggestions = generateTierSuggestions(
            listSize,
            filledPositions,
            configuration.preset.tierCount
          );

          set(state => ({
            smartTierState: { ...state.smartTierState, suggestions },
          }));
        },

        applySmartTierSuggestion: (suggestion) => {
          set(state => ({
            smartTierState: {
              ...state.smartTierState,
              configuration: {
                ...state.smartTierState.configuration,
                customThresholds: suggestion.boundaries,
              },
            },
          }));

          get().recalculateSmartTiers();
        },

        resetSmartTiers: () => {
          set({ smartTierState: initialSmartTierState });
        },

        // === Utilities ===
        getItemAtPosition: (position) => {
          const { ranking } = get();
          if (position < 0 || position >= ranking.length) return null;
          return ranking[position].item;
        },

        getNextAvailablePosition: () => {
          const { ranking } = get();
          const index = ranking.findIndex(r => r.itemId === null);
          return index >= 0 ? index : null;
        },

        isPositionOccupied: (position) => {
          const { ranking } = get();
          if (position < 0 || position >= ranking.length) return false;
          return ranking[position].itemId !== null;
        },
      }),
      {
        name: 'ranking-store',
        partialize: (state) => ({
          ranking: state.ranking,
          maxRankingSize: state.maxRankingSize,
          activeMode: state.activeMode,
          directViewMode: state.directViewMode,
          bracketState: state.bracketState,
          bracketConfig: state.bracketConfig,
          tierState: state.tierState,
          tierConfig: state.tierConfig,
          smartTierState: {
            configuration: state.smartTierState.configuration,
          },
        }),
        onRehydrateStorage: () => (state) => {
          if (state && state.ranking) {
            const stats = computeStatistics(state.ranking);
            Object.assign(state, stats);
          }
        },
      }
    )
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get ranking item at specific position
 */
export const useRankedItemAtPosition = (position: number) =>
  useRankingStore((state) => state.ranking[position] ?? null);

/**
 * Get all filled ranking items
 */
export const useFilledRankingItems = () =>
  useRankingStore((state) => state.ranking.filter((r) => r.itemId !== null));

/**
 * Get ranking statistics
 */
export const useRankingStats = () =>
  useRankingStore((state) => ({
    filledCount: state.filledCount,
    completionPercentage: state.completionPercentage,
    isComplete: state.isComplete,
    total: state.maxRankingSize,
  }));

/**
 * Get bracket progress
 */
export const useBracketProgress = () =>
  useRankingStore((state) => {
    if (!state.bracketState) return null;
    const totalMatchups = state.bracketState.rounds.reduce(
      (sum, round) => sum + round.matchups.length,
      0
    );
    const completedMatchups = state.bracketState.rounds.reduce(
      (sum, round) => sum + round.matchups.filter((m) => m.isComplete).length,
      0
    );
    return {
      total: totalMatchups,
      completed: completedMatchups,
      percentage: totalMatchups > 0 ? Math.round((completedMatchups / totalMatchups) * 100) : 0,
      isComplete: state.bracketState.isComplete,
      champion: state.bracketState.champion,
    };
  });

/**
 * Get tier with items
 */
export const useTierWithItems = (tierId: string) =>
  useRankingStore((state) => state.tierState.tiers.find((t) => t.id === tierId) ?? null);

/**
 * Get all tiers
 */
export const useAllTiers = () => useRankingStore((state) => state.tierState.tiers);

/**
 * Get unranked items
 */
export const useUnrankedItemIds = () => useRankingStore((state) => state.tierState.unrankedItemIds);

// ============================================================================
// Smart Tier Selectors (consolidated from tier-store)
// ============================================================================

/**
 * Get smart tier configuration
 */
export const selectSmartTierConfiguration = (state: RankingStore) => state.smartTierState.configuration;

/**
 * Get calculated smart tiers
 */
export const selectCurrentSmartTiers = (state: RankingStore) => state.smartTierState.currentTiers;

/**
 * Get tiered items from smart tier calculation
 */
export const selectSmartTieredItems = (state: RankingStore) => state.smartTierState.tieredItems;

/**
 * Get smart tier summary
 */
export const selectSmartTierSummary = (state: RankingStore) => state.smartTierState.summary;

/**
 * Get smart tier boundaries
 */
export const selectSmartTierBoundaries = (state: RankingStore) => state.smartTierState.boundaries;

/**
 * Get smart tier suggestions
 */
export const selectSmartTierSuggestions = (state: RankingStore) => state.smartTierState.suggestions;

/**
 * Check if smart tier calculation is in progress
 */
export const selectIsSmartTierCalculating = (state: RankingStore) => state.smartTierState.isCalculating;

/**
 * Check if smart tiers are enabled
 */
export const selectSmartTiersEnabled = (state: RankingStore) => state.smartTierState.configuration.enabled;

/**
 * Hook to get tier for a specific position (smart tier)
 */
export function useSmartTierForPosition(position: number) {
  const tiers = useRankingStore(selectCurrentSmartTiers);
  const enabled = useRankingStore(selectSmartTiersEnabled);

  if (!enabled || tiers.length === 0) return null;

  for (const tier of tiers) {
    if (position >= tier.startPosition && position < tier.endPosition) {
      return tier;
    }
  }

  return tiers[tiers.length - 1] || null;
}

/**
 * Hook to get smart tier stats
 */
export function useSmartTierStats() {
  const summary = useRankingStore(selectSmartTierSummary);
  return summary?.tierStats || [];
}

/**
 * Hook to check if position is at a smart tier boundary
 */
export function useIsSmartTierBoundary(position: number) {
  const boundaries = useRankingStore(selectSmartTierBoundaries);
  return boundaries.some((b) => b.position === position);
}

// ============================================================================
// Custom Tier Config Selectors
// ============================================================================

/**
 * Get current tier configuration
 */
export const selectTierConfig = (state: RankingStore) => state.tierConfig;

/**
 * Get tier config preset ID
 */
export const selectTierPresetId = (state: RankingStore) => state.tierConfig.presetId;

/**
 * Get tier count
 */
export const selectTierCount = (state: RankingStore) => state.tierConfig.tiers.length;

/**
 * Get tier definitions (without items)
 */
export const selectTierDefinitions = (state: RankingStore) => state.tierConfig.tiers;

/**
 * Hook to get tier config
 */
export function useTierConfig() {
  return useRankingStore(selectTierConfig);
}

/**
 * Hook to get tier definitions
 */
export function useTierDefinitions() {
  return useRankingStore(selectTierDefinitions);
}

/**
 * Hook to get collapsed tier IDs
 */
export function useCollapsedTierIds() {
  return useRankingStore((state) =>
    state.tierState.tiers.filter(t => t.collapsed).map(t => t.id)
  );
}
