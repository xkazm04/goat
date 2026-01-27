/**
 * Studio Store
 *
 * Zustand store for the List Creation Studio feature.
 * Manages topic input, AI generation, and generated items state.
 */

import { create } from 'zustand';
import { apiClient, getApiErrorMessage } from '@/lib/api/client';
import type { EnrichedItem, GenerateResponse } from '@/types/studio';

// ─────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────

interface StudioState {
  // Form state
  topic: string;
  itemCount: number;

  // Generation state
  generatedItems: EnrichedItem[];
  isGenerating: boolean;
  error: string | null;

  // Actions
  setTopic: (topic: string) => void;
  setItemCount: (count: number) => void;
  generateItems: () => Promise<void>;
  clearItems: () => void;
  clearError: () => void;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state
  topic: '',
  itemCount: 10,
  generatedItems: [],
  isGenerating: false,
  error: null,

  // Form actions
  setTopic: (topic) => set({ topic }),
  setItemCount: (count) => set({ itemCount: count }),

  // Generation action
  generateItems: async () => {
    const { topic, itemCount } = get();

    // Validate topic
    if (!topic.trim()) {
      set({ error: 'Please enter a topic' });
      return;
    }

    // Start generation
    set({ isGenerating: true, error: null });

    try {
      const response = await apiClient.post<GenerateResponse>(
        '/api/studio/generate',
        { topic: topic.trim(), count: itemCount }
      );

      set({
        generatedItems: response.items,
        isGenerating: false,
      });
    } catch (error) {
      set({
        error: getApiErrorMessage(error),
        isGenerating: false,
      });
    }
  },

  // Clear actions
  clearItems: () => set({ generatedItems: [] }),
  clearError: () => set({ error: null }),

  // Full reset
  reset: () =>
    set({
      topic: '',
      itemCount: 10,
      generatedItems: [],
      isGenerating: false,
      error: null,
    }),
}));

// ─────────────────────────────────────────────────────────────
// Selector Hooks (prevent unnecessary re-renders)
// ─────────────────────────────────────────────────────────────

/**
 * Form state selector - topic and item count
 */
export const useStudioForm = () =>
  useStudioStore((state) => ({
    topic: state.topic,
    itemCount: state.itemCount,
    setTopic: state.setTopic,
    setItemCount: state.setItemCount,
  }));

/**
 * Generation state selector - loading and error states
 */
export const useStudioGeneration = () =>
  useStudioStore((state) => ({
    isGenerating: state.isGenerating,
    error: state.error,
    generateItems: state.generateItems,
    clearError: state.clearError,
  }));

/**
 * Items selector - generated items list
 */
export const useStudioItems = () =>
  useStudioStore((state) => ({
    generatedItems: state.generatedItems,
    clearItems: state.clearItems,
  }));

/**
 * Actions selector - all actions without state
 */
export const useStudioActions = () =>
  useStudioStore((state) => ({
    setTopic: state.setTopic,
    setItemCount: state.setItemCount,
    generateItems: state.generateItems,
    clearItems: state.clearItems,
    clearError: state.clearError,
    reset: state.reset,
  }));
