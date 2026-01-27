/**
 * Studio Store
 *
 * Zustand store for the List Creation Studio feature.
 * Manages topic input, AI generation, generated items, and list metadata state.
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

  // Metadata state
  listTitle: string;
  listDescription: string;
  category: string;

  // Actions - Form
  setTopic: (topic: string) => void;
  setItemCount: (count: number) => void;

  // Actions - Generation
  generateItems: () => Promise<void>;
  clearItems: () => void;
  clearError: () => void;

  // Actions - Metadata
  setListTitle: (title: string) => void;
  setListDescription: (description: string) => void;
  setCategory: (category: string) => void;
  suggestTitleFromTopic: () => void;

  // Actions - Reset
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state - Form
  topic: '',
  itemCount: 10,

  // Initial state - Generation
  generatedItems: [],
  isGenerating: false,
  error: null,

  // Initial state - Metadata
  listTitle: '',
  listDescription: '',
  category: 'Music',

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

  // Metadata actions
  setListTitle: (title) => set({ listTitle: title }),
  setListDescription: (description) => set({ listDescription: description }),
  setCategory: (category) => set({ category }),

  suggestTitleFromTopic: () => {
    const { topic, listTitle } = get();
    if (!listTitle.trim() && topic.trim()) {
      set({ listTitle: topic.trim() });
    }
  },

  // Full reset
  reset: () =>
    set({
      topic: '',
      itemCount: 10,
      generatedItems: [],
      isGenerating: false,
      error: null,
      listTitle: '',
      listDescription: '',
      category: 'Music',
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
 * Metadata state selector - list title, description, category
 */
export const useStudioMetadata = () =>
  useStudioStore((state) => ({
    listTitle: state.listTitle,
    listDescription: state.listDescription,
    category: state.category,
    setListTitle: state.setListTitle,
    setListDescription: state.setListDescription,
    setCategory: state.setCategory,
    suggestTitleFromTopic: state.suggestTitleFromTopic,
  }));

/**
 * Validation state selector - publish readiness
 */
export const useStudioValidation = () =>
  useStudioStore((state) => ({
    canPublish: state.listTitle.trim() !== '' && state.generatedItems.length >= 5,
    hasTitle: state.listTitle.trim() !== '',
    hasItems: state.generatedItems.length >= 5,
    itemCount: state.generatedItems.length,
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
    setListTitle: state.setListTitle,
    setListDescription: state.setListDescription,
    setCategory: state.setCategory,
    suggestTitleFromTopic: state.suggestTitleFromTopic,
    reset: state.reset,
  }));
