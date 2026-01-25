/**
 * Threshold Store
 * Manages dynamic tier thresholds with adjustable breakpoints and presets
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TierAlgorithm,
  TierPreset,
  TierDefinition,
} from '@/lib/tiers/types';
import { TIER_PRESETS, getBestPresetForSize } from '@/lib/tiers/constants';
import { calculateTierBoundaries, createTiersFromBoundaries } from '@/lib/tiers/TierCalculator';

/**
 * Threshold preset configuration
 */
export interface ThresholdPreset {
  id: string;
  name: string;
  description: string;
  algorithm: TierAlgorithm;
  boundaries: number[];  // Percentages (0-100)
  isBuiltIn: boolean;
  isCustom: boolean;
  createdAt?: number;
}

/**
 * Threshold adjustment event
 */
export interface ThresholdAdjustment {
  boundaryIndex: number;
  oldPosition: number;
  newPosition: number;
  timestamp: number;
}

/**
 * Live preview state
 */
export interface ThresholdPreview {
  tiers: TierDefinition[];
  isValid: boolean;
  errors: string[];
  distribution: number[];  // Items per tier
}

/**
 * Threshold store state
 */
interface ThresholdState {
  // Current thresholds
  listId: string | null;
  listSize: number;
  currentBoundaries: number[];  // Absolute positions
  originalBoundaries: number[];

  // Algorithm state
  selectedAlgorithm: TierAlgorithm;
  selectedPreset: ThresholdPreset | null;

  // Custom presets
  customPresets: ThresholdPreset[];

  // UI state
  isDragging: boolean;
  activeBoundaryIndex: number | null;
  isPreviewMode: boolean;
  preview: ThresholdPreview | null;

  // History for undo
  adjustmentHistory: ThresholdAdjustment[];
  historyIndex: number;

  // Flags
  hasUnsavedChanges: boolean;
  isCalculating: boolean;
  lastCalculated: number | null;
}

/**
 * Threshold store actions
 */
interface ThresholdActions {
  // Initialization
  initialize: (listId: string, listSize: number, tierCount?: number) => void;
  reset: () => void;

  // Algorithm selection
  setAlgorithm: (algorithm: TierAlgorithm) => void;
  applyPreset: (preset: ThresholdPreset) => void;

  // Boundary manipulation
  setBoundary: (index: number, position: number) => void;
  setBoundaries: (boundaries: number[]) => void;
  moveBoundary: (index: number, delta: number) => void;

  // Drag state
  startDrag: (boundaryIndex: number) => void;
  updateDrag: (position: number) => void;
  endDrag: () => void;

  // Preview
  calculatePreview: (boundaries: number[]) => ThresholdPreview;
  setPreviewMode: (enabled: boolean) => void;

  // Custom presets
  saveCustomPreset: (name: string, description?: string) => ThresholdPreset;
  deleteCustomPreset: (presetId: string) => void;
  renameCustomPreset: (presetId: string, newName: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  saveThresholds: () => void;
  loadThresholds: (listId: string) => boolean;

  // Utilities
  getBoundariesAsPercentages: () => number[];
  setBoundariesFromPercentages: (percentages: number[]) => void;
  validateBoundaries: (boundaries: number[]) => { valid: boolean; errors: string[] };
  getRecommendedAlgorithm: () => TierAlgorithm;
}

/**
 * Built-in threshold presets
 */
export const BUILT_IN_PRESETS: ThresholdPreset[] = [
  {
    id: 'preset-equal',
    name: 'Equal Distribution',
    description: 'Evenly split items across all tiers',
    algorithm: 'equal',
    boundaries: [20, 40, 60, 80],  // For 5 tiers
    isBuiltIn: true,
    isCustom: false,
  },
  {
    id: 'preset-pyramid',
    name: 'Pyramid',
    description: 'Fewer items at top, more at bottom',
    algorithm: 'pyramid',
    boundaries: [6, 18, 38, 68],  // Exponential growth
    isBuiltIn: true,
    isCustom: false,
  },
  {
    id: 'preset-bell',
    name: 'Bell Curve',
    description: 'Most items in middle tiers',
    algorithm: 'bell',
    boundaries: [10, 30, 70, 90],  // Normal distribution
    isBuiltIn: true,
    isCustom: false,
  },
  {
    id: 'preset-percentile',
    name: 'Percentile',
    description: 'Standard percentile divisions',
    algorithm: 'percentile',
    boundaries: [10, 25, 50, 75],  // Quartile-based
    isBuiltIn: true,
    isCustom: false,
  },
  {
    id: 'preset-elite',
    name: 'Elite Focus',
    description: 'Very exclusive top tier (5%)',
    algorithm: 'custom',
    boundaries: [5, 15, 35, 65],
    isBuiltIn: true,
    isCustom: false,
  },
  {
    id: 'preset-balanced',
    name: 'Balanced Pyramid',
    description: 'Moderate pyramid distribution',
    algorithm: 'custom',
    boundaries: [10, 25, 45, 70],
    isBuiltIn: true,
    isCustom: false,
  },
];

/**
 * Storage key prefix for per-list thresholds
 */
const THRESHOLD_STORAGE_KEY = 'goat_thresholds_';

/**
 * Default state
 */
const defaultState: ThresholdState = {
  listId: null,
  listSize: 0,
  currentBoundaries: [],
  originalBoundaries: [],
  selectedAlgorithm: 'pyramid',
  selectedPreset: BUILT_IN_PRESETS[1],  // Default to pyramid
  customPresets: [],
  isDragging: false,
  activeBoundaryIndex: null,
  isPreviewMode: false,
  preview: null,
  adjustmentHistory: [],
  historyIndex: -1,
  hasUnsavedChanges: false,
  isCalculating: false,
  lastCalculated: null,
};

/**
 * Threshold store
 */
export const useThresholdStore = create<ThresholdState & ThresholdActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Initialize for a specific list
      initialize: (listId: string, listSize: number, tierCount: number = 5) => {
        const state = get();

        // Try to load saved thresholds
        if (state.loadThresholds(listId)) {
          return;
        }

        // Calculate initial boundaries based on algorithm
        const boundaries = calculateTierBoundaries(
          listSize,
          tierCount,
          state.selectedAlgorithm
        );

        set({
          listId,
          listSize,
          currentBoundaries: boundaries,
          originalBoundaries: [...boundaries],
          adjustmentHistory: [],
          historyIndex: -1,
          hasUnsavedChanges: false,
          lastCalculated: Date.now(),
        });
      },

      // Reset to defaults
      reset: () => {
        const { listSize, selectedAlgorithm } = get();
        const tierCount = get().currentBoundaries.length - 1;

        const boundaries = calculateTierBoundaries(
          listSize,
          tierCount,
          selectedAlgorithm
        );

        set({
          currentBoundaries: boundaries,
          originalBoundaries: [...boundaries],
          adjustmentHistory: [],
          historyIndex: -1,
          hasUnsavedChanges: false,
          lastCalculated: Date.now(),
        });
      },

      // Set algorithm and recalculate
      setAlgorithm: (algorithm: TierAlgorithm) => {
        const { listSize, currentBoundaries } = get();
        const tierCount = currentBoundaries.length - 1;

        const boundaries = calculateTierBoundaries(listSize, tierCount, algorithm);

        set({
          selectedAlgorithm: algorithm,
          currentBoundaries: boundaries,
          hasUnsavedChanges: true,
          lastCalculated: Date.now(),
        });
      },

      // Apply a preset
      applyPreset: (preset: ThresholdPreset) => {
        const { listSize } = get();

        // Convert percentages to absolute positions
        const boundaries = [0];
        for (const pct of preset.boundaries) {
          boundaries.push(Math.round((pct / 100) * listSize));
        }
        boundaries.push(listSize);

        set({
          selectedPreset: preset,
          selectedAlgorithm: preset.algorithm,
          currentBoundaries: boundaries,
          hasUnsavedChanges: true,
          lastCalculated: Date.now(),
        });
      },

      // Set a single boundary
      setBoundary: (index: number, position: number) => {
        const state = get();
        const newBoundaries = [...state.currentBoundaries];
        const oldPosition = newBoundaries[index];

        // Validate position
        const minPos = index > 0 ? newBoundaries[index - 1] + 1 : 0;
        const maxPos = index < newBoundaries.length - 1
          ? newBoundaries[index + 1] - 1
          : state.listSize;

        const clampedPosition = Math.max(minPos, Math.min(maxPos, position));
        newBoundaries[index] = clampedPosition;

        // Record adjustment
        const adjustment: ThresholdAdjustment = {
          boundaryIndex: index,
          oldPosition,
          newPosition: clampedPosition,
          timestamp: Date.now(),
        };

        const newHistory = state.adjustmentHistory.slice(0, state.historyIndex + 1);
        newHistory.push(adjustment);

        set({
          currentBoundaries: newBoundaries,
          adjustmentHistory: newHistory,
          historyIndex: newHistory.length - 1,
          hasUnsavedChanges: true,
          lastCalculated: Date.now(),
        });
      },

      // Set all boundaries at once
      setBoundaries: (boundaries: number[]) => {
        set({
          currentBoundaries: boundaries,
          hasUnsavedChanges: true,
          lastCalculated: Date.now(),
        });
      },

      // Move a boundary by delta
      moveBoundary: (index: number, delta: number) => {
        const state = get();
        const currentPos = state.currentBoundaries[index];
        state.setBoundary(index, currentPos + delta);
      },

      // Start dragging a boundary
      startDrag: (boundaryIndex: number) => {
        set({
          isDragging: true,
          activeBoundaryIndex: boundaryIndex,
          isPreviewMode: true,
        });
      },

      // Update drag position
      updateDrag: (position: number) => {
        const state = get();
        if (!state.isDragging || state.activeBoundaryIndex === null) return;

        // Calculate preview without committing
        const previewBoundaries = [...state.currentBoundaries];
        const index = state.activeBoundaryIndex;

        const minPos = index > 0 ? previewBoundaries[index - 1] + 1 : 0;
        const maxPos = index < previewBoundaries.length - 1
          ? previewBoundaries[index + 1] - 1
          : state.listSize;

        previewBoundaries[index] = Math.max(minPos, Math.min(maxPos, position));

        const preview = state.calculatePreview(previewBoundaries);
        set({ preview });
      },

      // End dragging
      endDrag: () => {
        const state = get();
        if (state.activeBoundaryIndex !== null && state.preview) {
          // Commit the preview
          const newBoundaries = [...state.currentBoundaries];
          // Use preview boundaries if valid
          if (state.preview.isValid) {
            // The preview was already calculated with clamped values
          }
        }

        set({
          isDragging: false,
          activeBoundaryIndex: null,
          isPreviewMode: false,
          preview: null,
        });
      },

      // Calculate preview for boundaries
      calculatePreview: (boundaries: number[]) => {
        const { listSize } = get();
        const preset = getBestPresetForSize(listSize);

        const validation = get().validateBoundaries(boundaries);

        if (!validation.valid) {
          return {
            tiers: [],
            isValid: false,
            errors: validation.errors,
            distribution: [],
          };
        }

        const tiers = createTiersFromBoundaries(boundaries, preset);

        // Calculate distribution (items per tier)
        const distribution = tiers.map(tier =>
          tier.endPosition - tier.startPosition
        );

        return {
          tiers,
          isValid: true,
          errors: [],
          distribution,
        };
      },

      // Set preview mode
      setPreviewMode: (enabled: boolean) => {
        set({ isPreviewMode: enabled });
      },

      // Save as custom preset
      saveCustomPreset: (name: string, description?: string) => {
        const state = get();
        const percentages = state.getBoundariesAsPercentages();

        const preset: ThresholdPreset = {
          id: `custom-${Date.now()}`,
          name,
          description: description || `Custom preset created on ${new Date().toLocaleDateString()}`,
          algorithm: 'custom',
          boundaries: percentages.slice(1, -1),  // Exclude 0 and 100
          isBuiltIn: false,
          isCustom: true,
          createdAt: Date.now(),
        };

        set({
          customPresets: [...state.customPresets, preset],
          selectedPreset: preset,
        });

        return preset;
      },

      // Delete custom preset
      deleteCustomPreset: (presetId: string) => {
        const state = get();
        set({
          customPresets: state.customPresets.filter(p => p.id !== presetId),
          selectedPreset: state.selectedPreset?.id === presetId
            ? null
            : state.selectedPreset,
        });
      },

      // Rename custom preset
      renameCustomPreset: (presetId: string, newName: string) => {
        const state = get();
        set({
          customPresets: state.customPresets.map(p =>
            p.id === presetId ? { ...p, name: newName } : p
          ),
        });
      },

      // Undo last change
      undo: () => {
        const state = get();
        if (state.historyIndex < 0) return;

        const adjustment = state.adjustmentHistory[state.historyIndex];
        const newBoundaries = [...state.currentBoundaries];
        newBoundaries[adjustment.boundaryIndex] = adjustment.oldPosition;

        set({
          currentBoundaries: newBoundaries,
          historyIndex: state.historyIndex - 1,
          lastCalculated: Date.now(),
        });
      },

      // Redo last undone change
      redo: () => {
        const state = get();
        if (state.historyIndex >= state.adjustmentHistory.length - 1) return;

        const adjustment = state.adjustmentHistory[state.historyIndex + 1];
        const newBoundaries = [...state.currentBoundaries];
        newBoundaries[adjustment.boundaryIndex] = adjustment.newPosition;

        set({
          currentBoundaries: newBoundaries,
          historyIndex: state.historyIndex + 1,
          lastCalculated: Date.now(),
        });
      },

      // Check if can undo
      canUndo: () => {
        return get().historyIndex >= 0;
      },

      // Check if can redo
      canRedo: () => {
        const state = get();
        return state.historyIndex < state.adjustmentHistory.length - 1;
      },

      // Save thresholds to localStorage
      saveThresholds: () => {
        const state = get();
        if (!state.listId) return;

        const key = `${THRESHOLD_STORAGE_KEY}${state.listId}`;
        const data = {
          boundaries: state.currentBoundaries,
          algorithm: state.selectedAlgorithm,
          presetId: state.selectedPreset?.id,
          savedAt: Date.now(),
        };

        localStorage.setItem(key, JSON.stringify(data));
        set({ hasUnsavedChanges: false });
      },

      // Load thresholds from localStorage
      loadThresholds: (listId: string) => {
        const key = `${THRESHOLD_STORAGE_KEY}${listId}`;
        const stored = localStorage.getItem(key);

        if (!stored) return false;

        try {
          const data = JSON.parse(stored);
          const preset = [...BUILT_IN_PRESETS, ...get().customPresets]
            .find(p => p.id === data.presetId) || null;

          set({
            listId,
            currentBoundaries: data.boundaries,
            originalBoundaries: [...data.boundaries],
            selectedAlgorithm: data.algorithm,
            selectedPreset: preset,
            hasUnsavedChanges: false,
            lastCalculated: data.savedAt,
          });

          return true;
        } catch {
          return false;
        }
      },

      // Get boundaries as percentages (0-100)
      getBoundariesAsPercentages: () => {
        const { currentBoundaries, listSize } = get();
        if (listSize === 0) return [];

        return currentBoundaries.map(b => Math.round((b / listSize) * 100));
      },

      // Set boundaries from percentages
      setBoundariesFromPercentages: (percentages: number[]) => {
        const { listSize } = get();
        const boundaries = percentages.map(pct =>
          Math.round((pct / 100) * listSize)
        );

        set({
          currentBoundaries: boundaries,
          hasUnsavedChanges: true,
          lastCalculated: Date.now(),
        });
      },

      // Validate boundaries
      validateBoundaries: (boundaries: number[]) => {
        const errors: string[] = [];
        const { listSize } = get();

        // Check length
        if (boundaries.length < 2) {
          errors.push('At least 2 boundaries required');
        }

        // Check first and last
        if (boundaries[0] !== 0) {
          errors.push('First boundary must be 0');
        }
        if (boundaries[boundaries.length - 1] !== listSize) {
          errors.push('Last boundary must equal list size');
        }

        // Check ascending order and minimum gap
        for (let i = 1; i < boundaries.length; i++) {
          if (boundaries[i] <= boundaries[i - 1]) {
            errors.push(`Boundary ${i} must be greater than boundary ${i - 1}`);
          }
          // Minimum 1 item per tier
          if (boundaries[i] - boundaries[i - 1] < 1) {
            errors.push(`Tier ${i} must have at least 1 position`);
          }
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      },

      // Get recommended algorithm based on list characteristics
      getRecommendedAlgorithm: () => {
        const { listSize } = get();

        // For small lists, equal distribution works well
        if (listSize <= 10) return 'equal';

        // For medium lists, pyramid creates nice progression
        if (listSize <= 25) return 'pyramid';

        // For larger lists, percentile-based is more intuitive
        if (listSize <= 50) return 'percentile';

        // For very large lists, bell curve distributes middle items
        return 'bell';
      },
    }),
    {
      name: 'threshold-store',
      partialize: (state) => ({
        customPresets: state.customPresets,
        selectedAlgorithm: state.selectedAlgorithm,
      }),
    }
  )
);

/**
 * Hook for getting all available presets (built-in + custom)
 */
export function useAllPresets(): ThresholdPreset[] {
  const customPresets = useThresholdStore(state => state.customPresets);
  return [...BUILT_IN_PRESETS, ...customPresets];
}

/**
 * Hook for getting tier distribution percentages
 */
export function useTierDistribution(): number[] {
  const boundaries = useThresholdStore(state => state.currentBoundaries);
  const listSize = useThresholdStore(state => state.listSize);

  if (boundaries.length < 2 || listSize === 0) return [];

  const distribution: number[] = [];
  for (let i = 1; i < boundaries.length; i++) {
    const tierSize = boundaries[i] - boundaries[i - 1];
    distribution.push(Math.round((tierSize / listSize) * 100));
  }

  return distribution;
}

export default useThresholdStore;
