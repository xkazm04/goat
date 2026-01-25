/**
 * Unified Ranking Store - Single Source of Truth
 *
 * This store serves as the unified source of truth for all ranking data across
 * all modes (Podium, Goat, Rushmore, Bracket, Tier List). It manages:
 * - Core ranking array (the canonical ranking)
 * - Bracket state (tournament progress)
 * - Tier state (tier assignments)
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

  // === Utilities ===
  getItemAtPosition: (position: number) => TransferableItem | null;
  getNextAvailablePosition: () => number | null;
  isPositionOccupied: (position: number) => boolean;
}

type RankingStore = RankingStoreState & RankingActions;

export const useRankingStore = create<RankingStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // === Initial State ===
        ranking: [],
        maxRankingSize: 50,
        activeMode: 'direct' as RankingMode,
        directViewMode: 'podium' as DirectViewMode,
        bracketState: null,
        bracketConfig: null,
        tierState: initialTierState,
        tierConfig: DEFAULT_TIER_CONFIG,
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
