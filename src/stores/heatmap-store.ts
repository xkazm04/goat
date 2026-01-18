/**
 * Heatmap Store
 * Zustand store for consensus heatmap visualization state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  HeatmapState,
  HeatmapActions,
  HeatmapConfig,
  HeatmapViewMode,
  CommunityRanking,
  HeatmapCell,
  ItemConsensus,
  ConsensusTrend,
  UserVsCommunityComparison,
  ConsensusUpdate,
  DEFAULT_HEATMAP_CONFIG,
} from '@/lib/consensus/types';
import {
  ConsensusDataService,
  generateHeatmapCells,
  compareUserToCommunity,
} from '@/lib/consensus/ConsensusDataService';
import { heatmapLogger } from '@/lib/logger';

/**
 * Initial state
 */
const initialState: HeatmapState = {
  config: DEFAULT_HEATMAP_CONFIG,
  communityData: null,
  cells: [],
  trends: new Map(),
  userComparison: null,
  isLoading: false,
  isConnected: false,
  lastSync: null,
  error: null,
};

/**
 * Heatmap Store
 */
export const useHeatmapStore = create<HeatmapState & HeatmapActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Configuration actions
      setEnabled: (enabled) => {
        set((state) => ({
          config: { ...state.config, enabled },
        }));

        if (enabled) {
          get().refreshData();
        }
      },

      setMode: (mode) => {
        set((state) => ({
          config: { ...state.config, mode },
        }));

        // Regenerate cells with new mode
        const { communityData, userComparison } = get();
        if (communityData) {
          const userPositions = userComparison
            ? new Map(
                userComparison.differences.map((d) => [d.itemId, d.userPosition])
              )
            : undefined;

          const validMode = mode === 'off' || mode === 'trending' ? 'consensus' : mode;
          const cells = generateHeatmapCells(
            communityData,
            validMode,
            userPositions
          );

          set({ cells });
        }
      },

      setOpacity: (opacity) => {
        set((state) => ({
          config: { ...state.config, opacity: Math.max(0, Math.min(1, opacity)) },
        }));
      },

      toggleLabels: () => {
        set((state) => ({
          config: { ...state.config, showLabels: !state.config.showLabels },
        }));
      },

      toggleBadges: () => {
        set((state) => ({
          config: { ...state.config, showBadges: !state.config.showBadges },
        }));
      },

      setColorScheme: (scheme) => {
        set((state) => ({
          config: { ...state.config, colorScheme: scheme },
        }));
      },

      // Data actions
      loadCommunityData: async (listId) => {
        set({ isLoading: true, error: null });

        try {
          const data = await ConsensusDataService.getCommunityRanking(
            listId,
            'default'
          );

          if (data) {
            // Reconstruct Maps from serialized data
            const items: ItemConsensus[] = data.items.map((item: any) => ({
              ...item,
              rankDistribution: new Map(item.rankDistribution),
            }));

            const communityData: CommunityRanking = {
              ...data,
              items,
              mostControversial: data.mostControversial.map((item: any) => ({
                ...item,
                rankDistribution: new Map(item.rankDistribution),
              })),
              mostAgreed: data.mostAgreed.map((item: any) => ({
                ...item,
                rankDistribution: new Map(item.rankDistribution),
              })),
            };

            const { config, userComparison } = get();
            const userPositions = userComparison
              ? new Map(
                  userComparison.differences.map((d) => [d.itemId, d.userPosition])
                )
              : undefined;

            const validMode2 = config.mode === 'off' || config.mode === 'trending' ? 'consensus' : config.mode;
            const cells = generateHeatmapCells(
              communityData,
              validMode2,
              userPositions
            );

            set({
              communityData,
              cells,
              isLoading: false,
              lastSync: Date.now(),
            });
          } else {
            set({
              isLoading: false,
              error: 'Failed to load community data',
            });
          }
        } catch (error) {
          heatmapLogger.error('Failed to load community data:', error);
          set({
            isLoading: false,
            error: 'Failed to load community data',
          });
        }
      },

      refreshData: async () => {
        const { communityData } = get();
        if (communityData?.listId) {
          await get().loadCommunityData(communityData.listId);
        }
      },

      updateItem: (itemId, data) => {
        set((state) => {
          if (!state.communityData) return state;

          const items = state.communityData.items.map((item) =>
            item.itemId === itemId ? { ...item, ...data } : item
          );

          const communityData = {
            ...state.communityData,
            items,
            lastUpdated: Date.now(),
          };

          return { communityData };
        });
      },

      // Real-time actions
      connect: (listId) => {
        heatmapLogger.debug('Connecting to consensus updates for:', listId);
        set({ isConnected: true });
        get().loadCommunityData(listId);
      },

      disconnect: () => {
        heatmapLogger.debug('Disconnecting from consensus updates');
        set({ isConnected: false });
      },

      handleUpdate: (update) => {
        const { type, data } = update;

        switch (type) {
          case 'item_update':
            if (!Array.isArray(data)) {
              get().updateItem(
                (data as Partial<ItemConsensus>).itemId!,
                data as Partial<ItemConsensus>
              );
            }
            break;

          case 'full_refresh':
            get().refreshData();
            break;

          case 'trend_update':
            if (Array.isArray(data)) {
              const trends = new Map(get().trends);
              (data as any[]).forEach((trend) => {
                trends.set(trend.itemId, trend);
              });
              set({ trends });
            }
            break;
        }
      },

      // Comparison actions
      setUserRanking: (positions) => {
        const { communityData } = get();
        if (!communityData) return;

        const comparison = compareUserToCommunity(
          'current-user',
          communityData.listId,
          positions,
          communityData
        );

        set({ userComparison: comparison });

        const { config } = get();
        if (config.mode === 'yourPick') {
          const cells = generateHeatmapCells(communityData, 'yourPick', positions);
          set({ cells });
        }
      },

      calculateComparison: () => {
        const { communityData, userComparison } = get();
        if (!communityData || !userComparison) return;

        const positions = new Map(
          userComparison.differences.map((d) => [d.itemId, d.userPosition])
        );

        const comparison = compareUserToCommunity(
          userComparison.userId,
          communityData.listId,
          positions,
          communityData
        );

        set({ userComparison: comparison });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'goat-heatmap-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

/**
 * Selectors
 */
export const selectHeatmapConfig = (state: HeatmapState) => state.config;
export const selectCommunityData = (state: HeatmapState) => state.communityData;
export const selectHeatmapCells = (state: HeatmapState) => state.cells;
export const selectUserComparison = (state: HeatmapState) => state.userComparison;
export const selectHeatmapLoading = (state: HeatmapState) => state.isLoading;
export const selectHeatmapEnabled = (state: HeatmapState) => state.config.enabled;
export const selectHeatmapMode = (state: HeatmapState) => state.config.mode;

/**
 * Hook to get cell data for a specific position
 */
export function useHeatmapCell(position: number) {
  const cells = useHeatmapStore(selectHeatmapCells);
  const enabled = useHeatmapStore(selectHeatmapEnabled);

  if (!enabled || cells.length === 0) return null;

  return cells.find((c) => c.position === position) || null;
}

/**
 * Hook for heatmap statistics
 */
export function useHeatmapStats() {
  const communityData = useHeatmapStore(selectCommunityData);

  if (!communityData) {
    return {
      totalRankings: 0,
      overallConsensus: 0,
      itemCount: 0,
      mostControversial: [],
      mostAgreed: [],
    };
  }

  return {
    totalRankings: Math.round(communityData.totalRankings),
    overallConsensus: communityData.overallConsensus,
    itemCount: communityData.items.length,
    mostControversial: communityData.mostControversial,
    mostAgreed: communityData.mostAgreed,
  };
}

export default useHeatmapStore;
