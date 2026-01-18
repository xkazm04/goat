import { create } from 'zustand';
import type {
  ConsensusState,
  ConsensusViewMode,
  ItemConsensusWithClusters,
  ConsensusAPIResponse,
} from '@/types/consensus';
import type {
  InventorySortBy,
  InventorySortOrder,
  InventorySortConfig,
} from '@/types/ranked-inventory';
import {
  type SortConfig,
  sortItemIds as unifiedSortItemIds,
  fromLegacySortBy,
} from '@/lib/sorting';
import { consensusLogger } from '@/lib/logger';

interface ConsensusStoreActions {
  /** Set the consensus view mode */
  setViewMode: (mode: ConsensusViewMode) => void;

  /** Toggle through view modes */
  cycleViewMode: () => void;

  /** Fetch consensus data for a category */
  fetchConsensus: (category: string, subcategory?: string) => Promise<void>;

  /** Get consensus for a specific item */
  getItemConsensus: (itemId: string) => ItemConsensusWithClusters | null;

  /** Check if an item has high volatility (contested) */
  isContested: (itemId: string) => boolean;

  /** Get items sorted by consensus rank */
  getItemsByConsensusRank: () => string[];

  /** Get items sorted by volatility (most contested first) */
  getContestedItems: () => string[];

  /** Clear all consensus data */
  clearConsensus: () => void;

  /** Set sort configuration for inventory view */
  setSortConfig: (config: InventorySortConfig) => void;

  /** Get sorted item IDs based on current sort configuration */
  getSortedItemIds: (itemIds: string[]) => string[];

  /** Get consensus rank for sorting (returns high number if no data) */
  getConsensusRankForSort: (itemId: string) => number;
}

type ConsensusStore = ConsensusState & ConsensusStoreActions;

const VIEW_MODE_CYCLE: ConsensusViewMode[] = [
  'off',
  'median',
  'volatility',
  'peers',
  'discovery',
];

export const useConsensusStore = create<ConsensusStore>((set, get) => ({
  // Initial state
  viewMode: 'off',
  consensusData: {},
  isLoading: false,
  error: null,
  lastFetched: null,
  currentCategory: null,
  sortConfig: { sortBy: 'consensus' as InventorySortBy, sortOrder: 'asc' as InventorySortOrder },

  // Set view mode
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  // Cycle through view modes
  cycleViewMode: () => {
    const currentIndex = VIEW_MODE_CYCLE.indexOf(get().viewMode);
    const nextIndex = (currentIndex + 1) % VIEW_MODE_CYCLE.length;
    set({ viewMode: VIEW_MODE_CYCLE[nextIndex] });
  },

  // Fetch consensus data
  fetchConsensus: async (category, subcategory) => {
    const { currentCategory, lastFetched } = get();

    // Skip if we recently fetched for this category (5 minute cache)
    const cacheTime = 5 * 60 * 1000;
    if (
      currentCategory === category &&
      lastFetched &&
      Date.now() - lastFetched < cacheTime
    ) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({ category });
      if (subcategory) {
        params.append('subcategory', subcategory);
      }

      const response = await fetch(`/api/consensus?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch consensus: ${response.statusText}`);
      }

      const data: ConsensusAPIResponse = await response.json();

      set({
        consensusData: data.items,
        currentCategory: category,
        lastFetched: Date.now(),
        isLoading: false,
      });
    } catch (error) {
      consensusLogger.error('Error fetching consensus data:', error);
      set({
        error: error instanceof Error ? error : new Error('Unknown error'),
        isLoading: false,
      });
    }
  },

  // Get consensus for a specific item
  getItemConsensus: (itemId) => {
    return get().consensusData[itemId] || null;
  },

  // Check if item is contested (high volatility)
  isContested: (itemId) => {
    const consensus = get().consensusData[itemId];
    return consensus ? consensus.volatility >= 5 : false;
  },

  // Get items sorted by consensus rank
  getItemsByConsensusRank: () => {
    const { consensusData } = get();
    return Object.entries(consensusData)
      .sort(([, a], [, b]) => a.medianRank - b.medianRank)
      .map(([itemId]) => itemId);
  },

  // Get contested items (sorted by volatility)
  getContestedItems: () => {
    const { consensusData } = get();
    return Object.entries(consensusData)
      .filter(([, data]) => data.volatility >= 4)
      .sort(([, a], [, b]) => b.volatility - a.volatility)
      .map(([itemId]) => itemId);
  },

  // Clear all data
  clearConsensus: () => {
    set({
      consensusData: {},
      lastFetched: null,
      currentCategory: null,
      error: null,
    });
  },

  // Set sort configuration for inventory view
  setSortConfig: (config) => {
    set({ sortConfig: config });
  },

  // Get consensus rank for sorting (returns high number if no data)
  getConsensusRankForSort: (itemId) => {
    const consensus = get().consensusData[itemId];
    // Return 999 for items without consensus data to push them to the end
    return consensus?.averageRank ?? 999;
  },

  // Get sorted item IDs based on current sort configuration
  // Delegates to the unified InventorySorter for consistent behavior
  getSortedItemIds: (itemIds) => {
    const { consensusData, sortConfig } = get();
    const { sortBy, sortOrder } = sortConfig;

    // Convert legacy config to unified SortConfig
    const unifiedConfig = fromLegacySortBy(sortBy, sortOrder);

    // Use unified sorter with consensus lookup
    return unifiedSortItemIds(
      itemIds,
      unifiedConfig,
      (itemId) => consensusData[itemId] ?? null
    );
  },
}));

// Selectors
export const useConsensusViewMode = () =>
  useConsensusStore((state) => state.viewMode);

export const useConsensusLoading = () =>
  useConsensusStore((state) => state.isLoading);

export const useItemConsensus = (itemId: string) =>
  useConsensusStore((state) => state.consensusData[itemId] || null);

export const useConsensusSortConfig = () =>
  useConsensusStore((state) => state.sortConfig);

export const useConsensusSortBy = () =>
  useConsensusStore((state) => state.sortConfig.sortBy);

export const useConsensusSortOrder = () =>
  useConsensusStore((state) => state.sortConfig.sortOrder);
