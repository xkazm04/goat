/**
 * Placement Store - Smart Auto-Placement State Management
 *
 * Manages prediction state and integrates with grid-store for
 * intelligent position suggestions during drag operations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';
import {
  PlacementPredictor,
  getPlacementPredictor,
  PlacementPrediction,
  UserPatterns,
} from '@/lib/placement/PlacementPredictor';
import {
  DropZoneScorer,
  getDropZoneScorer,
  DropZoneIndicator,
} from '@/lib/placement/DropZoneScorer';

/**
 * Smart fill mode state
 */
export type SmartFillMode = 'off' | 'active' | 'paused';

/**
 * Placement store state
 */
interface PlacementStoreState {
  // Smart Fill Mode
  smartFillMode: SmartFillMode;
  smartFillQueue: string[]; // Item IDs in queue
  smartFillCurrentIndex: number;
  smartFillSkipped: Set<string>;

  // Current drag prediction state
  isDragging: boolean;
  draggedItemId: string | null;
  draggedItem: BacklogItem | null;
  currentPrediction: PlacementPrediction | null;
  dropZoneIndicators: DropZoneIndicator[];

  // Quick-place state
  quickPlaceEnabled: boolean;
  quickPlaceSuggestions: number[]; // Up to 9 positions for 1-9 keys

  // User patterns (for learning)
  userPatterns: UserPatterns | null;

  // Actions - Smart Fill
  startSmartFill: (items: BacklogItem[]) => void;
  pauseSmartFill: () => void;
  resumeSmartFill: () => void;
  stopSmartFill: () => void;
  skipCurrentItem: () => void;
  advanceSmartFill: () => void;
  getCurrentSmartFillItem: (items: BacklogItem[]) => BacklogItem | null;

  // Actions - Drag Predictions
  startDrag: (item: BacklogItem, gridItems: GridItemType[]) => void;
  updateDragPrediction: (gridItems: GridItemType[]) => void;
  endDrag: () => void;

  // Actions - Quick Place
  setQuickPlaceEnabled: (enabled: boolean) => void;
  getQuickPlacePosition: (keyNumber: number) => number | null;

  // Actions - Pattern Learning
  recordPlacement: (item: BacklogItem, position: number) => void;
  exportPatterns: () => UserPatterns | null;
  importPatterns: (patterns: UserPatterns) => void;

  // Actions - Drop Zone Indicators
  getIndicatorForPosition: (position: number) => DropZoneIndicator | null;
  getTopSuggestions: (count?: number) => DropZoneIndicator[];

  // Reset
  reset: () => void;
}

/**
 * Initial user patterns
 */
const emptyPatterns: UserPatterns = {
  categoryPreferences: new Map(),
  recentPlacements: [],
  placementSpeed: new Map(),
};

export const usePlacementStore = create<PlacementStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      smartFillMode: 'off',
      smartFillQueue: [],
      smartFillCurrentIndex: 0,
      smartFillSkipped: new Set(),
      isDragging: false,
      draggedItemId: null,
      draggedItem: null,
      currentPrediction: null,
      dropZoneIndicators: [],
      quickPlaceEnabled: true,
      quickPlaceSuggestions: [],
      userPatterns: null,

      // Smart Fill Actions
      startSmartFill: (items) => {
        const itemIds = items.map(item => item.id);
        set({
          smartFillMode: 'active',
          smartFillQueue: itemIds,
          smartFillCurrentIndex: 0,
          smartFillSkipped: new Set(),
        });
      },

      pauseSmartFill: () => {
        set({ smartFillMode: 'paused' });
      },

      resumeSmartFill: () => {
        set({ smartFillMode: 'active' });
      },

      stopSmartFill: () => {
        set({
          smartFillMode: 'off',
          smartFillQueue: [],
          smartFillCurrentIndex: 0,
          smartFillSkipped: new Set(),
        });
      },

      skipCurrentItem: () => {
        const state = get();
        const currentItemId = state.smartFillQueue[state.smartFillCurrentIndex];

        if (currentItemId) {
          const newSkipped = new Set(state.smartFillSkipped);
          newSkipped.add(currentItemId);

          set({
            smartFillSkipped: newSkipped,
            smartFillCurrentIndex: state.smartFillCurrentIndex + 1,
          });
        }
      },

      advanceSmartFill: () => {
        const state = get();
        const nextIndex = state.smartFillCurrentIndex + 1;

        if (nextIndex >= state.smartFillQueue.length) {
          // Queue complete
          set({ smartFillMode: 'off' });
        } else {
          set({ smartFillCurrentIndex: nextIndex });
        }
      },

      getCurrentSmartFillItem: (items) => {
        const state = get();
        if (state.smartFillMode === 'off') return null;

        const currentItemId = state.smartFillQueue[state.smartFillCurrentIndex];
        if (!currentItemId || state.smartFillSkipped.has(currentItemId)) {
          return null;
        }

        return items.find(item => item.id === currentItemId) || null;
      },

      // Drag Prediction Actions
      startDrag: (item, gridItems) => {
        const predictor = getPlacementPredictor();
        const scorer = getDropZoneScorer();

        const prediction = predictor.predict(item, gridItems, { excludeOccupied: true });
        const indicators = scorer.scoreDropZones(item, gridItems);
        const quickPlaceSuggestions = prediction.predictions
          .slice(0, 9)
          .map(p => p.position);

        set({
          isDragging: true,
          draggedItemId: item.id,
          draggedItem: item,
          currentPrediction: prediction,
          dropZoneIndicators: indicators,
          quickPlaceSuggestions,
        });
      },

      updateDragPrediction: (gridItems) => {
        const state = get();
        if (!state.isDragging || !state.draggedItem) return;

        const predictor = getPlacementPredictor();
        const scorer = getDropZoneScorer();

        const prediction = predictor.predict(state.draggedItem, gridItems, { excludeOccupied: true });
        const indicators = scorer.scoreDropZones(state.draggedItem, gridItems);
        const quickPlaceSuggestions = prediction.predictions
          .slice(0, 9)
          .map(p => p.position);

        set({
          currentPrediction: prediction,
          dropZoneIndicators: indicators,
          quickPlaceSuggestions,
        });
      },

      endDrag: () => {
        set({
          isDragging: false,
          draggedItemId: null,
          draggedItem: null,
          currentPrediction: null,
          dropZoneIndicators: [],
          quickPlaceSuggestions: [],
        });
      },

      // Quick Place Actions
      setQuickPlaceEnabled: (enabled) => {
        set({ quickPlaceEnabled: enabled });
      },

      getQuickPlacePosition: (keyNumber) => {
        const state = get();
        if (!state.quickPlaceEnabled || keyNumber < 1 || keyNumber > 9) {
          return null;
        }

        return state.quickPlaceSuggestions[keyNumber - 1] ?? null;
      },

      // Pattern Learning Actions
      recordPlacement: (item, position) => {
        const predictor = getPlacementPredictor();
        predictor.recordPlacement(item, position);

        // Export and save patterns
        const patterns = predictor.exportPatterns();
        set({ userPatterns: patterns });
      },

      exportPatterns: () => {
        return get().userPatterns;
      },

      importPatterns: (patterns) => {
        const predictor = getPlacementPredictor();
        predictor.importPatterns(patterns);
        set({ userPatterns: patterns });
      },

      // Drop Zone Indicator Actions
      getIndicatorForPosition: (position) => {
        const state = get();
        return state.dropZoneIndicators.find(i => i.position === position) || null;
      },

      getTopSuggestions: (count = 3) => {
        const state = get();
        return state.dropZoneIndicators
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, count);
      },

      // Reset
      reset: () => {
        set({
          smartFillMode: 'off',
          smartFillQueue: [],
          smartFillCurrentIndex: 0,
          smartFillSkipped: new Set(),
          isDragging: false,
          draggedItemId: null,
          draggedItem: null,
          currentPrediction: null,
          dropZoneIndicators: [],
          quickPlaceSuggestions: [],
        });
      },
    }),
    {
      name: 'placement-store',
      partialize: (state) => ({
        quickPlaceEnabled: state.quickPlaceEnabled,
        userPatterns: state.userPatterns,
      }),
      // Handle Map serialization for userPatterns
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const data = JSON.parse(str);

          // Rehydrate Maps from arrays
          if (data.state?.userPatterns) {
            const patterns = data.state.userPatterns;
            if (patterns.categoryPreferences && Array.isArray(patterns.categoryPreferences)) {
              patterns.categoryPreferences = new Map<string, number[]>(patterns.categoryPreferences);
            }
            if (patterns.placementSpeed && Array.isArray(patterns.placementSpeed)) {
              patterns.placementSpeed = new Map<number, number>(patterns.placementSpeed);
            }
          }

          return data;
        },
        setItem: (name, value) => {
          // Serialize Maps to arrays - need to deep clone to avoid mutating state
          const data = JSON.parse(JSON.stringify(value, (key, val) => {
            if (val instanceof Map) {
              return Array.from(val.entries());
            }
            if (val instanceof Set) {
              return Array.from(val);
            }
            return val;
          }));

          localStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Selector hooks for performance
export const useSmartFillMode = () => usePlacementStore((state) => state.smartFillMode);
export const useIsDragging = () => usePlacementStore((state) => state.isDragging);
export const useDropZoneIndicators = () => usePlacementStore((state) => state.dropZoneIndicators);
export const useCurrentPrediction = () => usePlacementStore((state) => state.currentPrediction);
export const useQuickPlaceEnabled = () => usePlacementStore((state) => state.quickPlaceEnabled);
export const useQuickPlaceSuggestions = () => usePlacementStore((state) => state.quickPlaceSuggestions);

/**
 * Hook to get the indicator for a specific position
 */
export function useIndicatorAtPosition(position: number): DropZoneIndicator | null {
  return usePlacementStore((state) =>
    state.dropZoneIndicators.find(i => i.position === position) || null
  );
}

/**
 * Hook to check if a position is a top suggestion
 */
export function useIsTopSuggestion(position: number): boolean {
  return usePlacementStore((state) => {
    if (!state.currentPrediction) return false;
    return state.currentPrediction.topSuggestion?.position === position;
  });
}
