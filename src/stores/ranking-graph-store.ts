/**
 * Ranking Graph Store
 *
 * Zustand store for cross-list intelligence data.
 * Manages cached universal ratings, insights, trajectories,
 * anomalies, and placement suggestions.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  RankingGraphState,
  RankingGraphActions,
  UniversalRating,
  RankingGraphOverviewResponse,
} from '@/lib/ranking-graph/types';

const initialState: RankingGraphState = {
  ratings: {},
  insights: {},
  trajectories: {},
  currentAnomalies: [],
  currentSuggestions: [],
  isLoading: false,
  isLoadingItem: null,
  error: null,
  lastRefreshed: null,
};

export const useRankingGraphStore = create<RankingGraphState & RankingGraphActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchItemRating: async (itemId: string): Promise<UniversalRating | null> => {
      // Return cached if fresh (< 5 minutes)
      const cached = get().ratings[itemId];
      if (cached && Date.now() - cached.lastComputed < 5 * 60 * 1000) {
        return cached;
      }

      set({ isLoadingItem: itemId });

      try {
        const response = await fetch(`/api/ranking-graph/${encodeURIComponent(itemId)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch rating: ${response.status}`);
        }

        const data = await response.json();

        set(state => ({
          ratings: { ...state.ratings, [itemId]: data.rating },
          insights: { ...state.insights, [itemId]: data.insights },
          trajectories: { ...state.trajectories, [itemId]: data.trajectory },
          isLoadingItem: null,
          error: null,
        }));

        return data.rating;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ isLoadingItem: null, error: message });
        return null;
      }
    },

    fetchListSuggestions: async (
      listId: string,
      category: string,
      userPositions: Record<string, number>,
      listSize: number
    ): Promise<void> => {
      set({ isLoading: true, error: null });

      try {
        const response = await fetch('/api/ranking-graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suggestions',
            listId,
            category,
            userPositions,
            listSize,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch suggestions: ${response.status}`);
        }

        const data = await response.json();

        set({
          currentAnomalies: data.anomalies || [],
          currentSuggestions: data.suggestions || [],
          isLoading: false,
          error: null,
        });

        // Cache any ratings returned
        if (data.ratings) {
          set(state => ({
            ratings: { ...state.ratings, ...data.ratings },
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ isLoading: false, error: message });
      }
    },

    fetchOverview: async (category?: string): Promise<RankingGraphOverviewResponse | null> => {
      set({ isLoading: true, error: null });

      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);

        const response = await fetch(`/api/ranking-graph?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch overview: ${response.status}`);
        }

        const data: RankingGraphOverviewResponse = await response.json();

        // Cache all returned ratings
        const ratingsMap: Record<string, UniversalRating> = {};
        for (const item of [...data.topItems, ...data.risingItems, ...data.controversialItems]) {
          ratingsMap[item.itemId] = item;
        }

        set(state => ({
          ratings: { ...state.ratings, ...ratingsMap },
          isLoading: false,
          lastRefreshed: Date.now(),
          error: null,
        }));

        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        set({ isLoading: false, error: message });
        return null;
      }
    },

    invalidateItem: (itemId: string) => {
      set(state => {
        const { [itemId]: _r, ...ratings } = state.ratings;
        const { [itemId]: _i, ...insights } = state.insights;
        const { [itemId]: _t, ...trajectories } = state.trajectories;
        return { ratings, insights, trajectories };
      });
    },

    reset: () => set(initialState),
  }))
);
