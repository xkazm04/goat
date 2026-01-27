/**
 * Studio Store
 *
 * Zustand store for the List Creation Studio feature.
 * Manages topic input, AI generation, generated items, and list metadata state.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { apiClient, getApiErrorMessage } from '@/lib/api/client';
import type { EnrichedItem, GenerateResponse } from '@/types/studio';

// ─────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────

interface StudioState {
  // Form state
  topic: string;
  listSize: number; // Final list size (Top N)
  generateCount: number; // How many items to generate (can be higher)

  // Generation state
  generatedItems: EnrichedItem[];
  isGenerating: boolean;
  error: string | null;

  // Metadata state
  listTitle: string;
  listDescription: string;
  category: string;

  // Publishing state
  isPublishing: boolean;
  publishError: string | null;
  publishedListId: string | null;
  showSuccess: boolean;

  // Actions - Form
  setTopic: (topic: string) => void;
  setListSize: (size: number) => void;
  setGenerateCount: (count: number) => void;

  // Actions - Generation
  generateItems: () => Promise<void>;
  clearItems: () => void;
  clearError: () => void;

  // Actions - Item Manipulation
  updateItem: (index: number, updates: Partial<EnrichedItem>) => void;
  removeItem: (index: number) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  addItem: (item: EnrichedItem) => void;

  // Actions - Metadata
  setListTitle: (title: string) => void;
  setListDescription: (description: string) => void;
  setCategory: (category: string) => void;
  suggestTitleFromTopic: () => void;

  // Actions - Publishing
  setPublishing: (isPublishing: boolean) => void;
  setPublishError: (error: string | null) => void;
  setPublishedListId: (id: string | null) => void;
  setShowSuccess: (show: boolean) => void;

  // Actions - Reset
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state - Form
  topic: '',
  listSize: 10,
  generateCount: 30,

  // Initial state - Generation
  generatedItems: [],
  isGenerating: false,
  error: null,

  // Initial state - Metadata
  listTitle: '',
  listDescription: '',
  category: 'Games',

  // Initial state - Publishing
  isPublishing: false,
  publishError: null,
  publishedListId: null,
  showSuccess: false,

  // Form actions
  setTopic: (topic) => set({ topic }),
  setListSize: (size) => set({ listSize: size }),
  setGenerateCount: (count) => set({ generateCount: count }),

  // Generation action - appends to existing items, avoiding duplicates
  // Also matches against existing DB items to reuse their IDs and images
  generateItems: async () => {
    const { topic, generateCount, generatedItems, category } = get();

    // Validate topic
    if (!topic.trim()) {
      set({ error: 'Please enter a topic' });
      return;
    }

    // Start generation
    set({ isGenerating: true, error: null });

    // Get existing item titles to exclude duplicates
    const existingTitles = generatedItems.map((item) => item.title.toLowerCase().trim());

    try {
      const response = await apiClient.post<GenerateResponse>(
        '/studio/generate',
        {
          topic: topic.trim(),
          count: generateCount,
          category,
          excludeTitles: existingTitles.length > 0 ? existingTitles : undefined,
        }
      );

      // Filter out any duplicates that slipped through (case-insensitive)
      let newItems = response.items.filter(
        (item) => !existingTitles.includes(item.title.toLowerCase().trim())
      );

      // Try to match new items against existing DB items
      if (newItems.length > 0) {
        try {
          const matchResponse = await apiClient.post<{
            items: Array<{
              title: string;
              matched: boolean;
              db_item?: {
                id: string;
                name: string;
                image_url: string | null;
                description: string | null;
              };
            }>;
          }>('/studio/match-items', {
            items: newItems.map((item) => ({
              title: item.title,
              description: item.description,
            })),
            category,
          });

          // Merge DB data into items (use DB image if available)
          newItems = newItems.map((item) => {
            const match = matchResponse.items.find(
              (m) => m.title.toLowerCase() === item.title.toLowerCase()
            );

            if (match?.matched && match.db_item) {
              return {
                ...item,
                db_item_id: match.db_item.id,
                db_matched: true,
                // Use DB image if item doesn't have one, or if DB has one
                image_url: match.db_item.image_url || item.image_url,
              };
            }

            return item;
          });
        } catch (matchError) {
          // Non-critical - continue without DB matching
          console.warn('DB matching failed:', matchError);
        }
      }

      // Append new items to existing items (don't replace)
      set({
        generatedItems: [...generatedItems, ...newItems],
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

  // Item manipulation actions
  updateItem: (index, updates) => {
    const { generatedItems } = get();
    if (index < 0 || index >= generatedItems.length) return;

    const newItems = [...generatedItems];
    newItems[index] = { ...newItems[index], ...updates };
    set({ generatedItems: newItems });
  },

  removeItem: (index) => {
    const { generatedItems } = get();
    if (index < 0 || index >= generatedItems.length) return;

    const newItems = generatedItems.filter((_, i) => i !== index);
    set({ generatedItems: newItems });
  },

  reorderItems: (fromIndex, toIndex) => {
    const { generatedItems } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= generatedItems.length ||
      toIndex < 0 ||
      toIndex >= generatedItems.length
    ) {
      return;
    }

    const newItems = [...generatedItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    set({ generatedItems: newItems });
  },

  addItem: (item) => {
    const { generatedItems } = get();
    set({ generatedItems: [...generatedItems, item] });
  },

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

  // Publishing actions
  setPublishing: (isPublishing) => set({ isPublishing }),
  setPublishError: (publishError) => set({ publishError }),
  setPublishedListId: (publishedListId) => set({ publishedListId }),
  setShowSuccess: (showSuccess) => set({ showSuccess }),

  // Full reset
  reset: () =>
    set({
      topic: '',
      listSize: 10,
      generateCount: 30,
      generatedItems: [],
      isGenerating: false,
      error: null,
      listTitle: '',
      listDescription: '',
      category: 'Games',
      isPublishing: false,
      publishError: null,
      publishedListId: null,
      showSuccess: false,
    }),
}));

// ─────────────────────────────────────────────────────────────
// Selector Hooks (prevent unnecessary re-renders)
// ─────────────────────────────────────────────────────────────

/**
 * Form state selector - topic, list size, and generate count
 */
export const useStudioForm = () =>
  useStudioStore(
    useShallow((state) => ({
      topic: state.topic,
      listSize: state.listSize,
      generateCount: state.generateCount,
      setTopic: state.setTopic,
      setListSize: state.setListSize,
      setGenerateCount: state.setGenerateCount,
    }))
  );

/**
 * Generation state selector - loading and error states
 */
export const useStudioGeneration = () =>
  useStudioStore(
    useShallow((state) => ({
      isGenerating: state.isGenerating,
      error: state.error,
      generateItems: state.generateItems,
      clearError: state.clearError,
    }))
  );

/**
 * Items selector - generated items list and manipulation actions
 */
export const useStudioItems = () =>
  useStudioStore(
    useShallow((state) => ({
      generatedItems: state.generatedItems,
      clearItems: state.clearItems,
      updateItem: state.updateItem,
      removeItem: state.removeItem,
      reorderItems: state.reorderItems,
      addItem: state.addItem,
    }))
  );

/**
 * Metadata state selector - list title, description, category
 */
export const useStudioMetadata = () =>
  useStudioStore(
    useShallow((state) => ({
      listTitle: state.listTitle,
      listDescription: state.listDescription,
      category: state.category,
      setListTitle: state.setListTitle,
      setListDescription: state.setListDescription,
      setCategory: state.setCategory,
      suggestTitleFromTopic: state.suggestTitleFromTopic,
    }))
  );

/**
 * Validation state selector - publish readiness
 */
export const useStudioValidation = () =>
  useStudioStore(
    useShallow((state) => ({
      canPublish: state.listTitle.trim() !== '' && state.generatedItems.length >= state.listSize,
      hasTitle: state.listTitle.trim() !== '',
      hasItems: state.generatedItems.length >= state.listSize,
      itemCount: state.generatedItems.length,
      listSize: state.listSize,
    }))
  );

/**
 * Publishing state selector - publish progress and success
 */
export const useStudioPublishing = () =>
  useStudioStore(
    useShallow((state) => ({
      isPublishing: state.isPublishing,
      publishError: state.publishError,
      publishedListId: state.publishedListId,
      showSuccess: state.showSuccess,
      setPublishing: state.setPublishing,
      setPublishError: state.setPublishError,
      setPublishedListId: state.setPublishedListId,
      setShowSuccess: state.setShowSuccess,
    }))
  );

/**
 * Actions selector - all actions without state
 */
export const useStudioActions = () =>
  useStudioStore(
    useShallow((state) => ({
      setTopic: state.setTopic,
      setListSize: state.setListSize,
      setGenerateCount: state.setGenerateCount,
      generateItems: state.generateItems,
      clearItems: state.clearItems,
      clearError: state.clearError,
      updateItem: state.updateItem,
      removeItem: state.removeItem,
      reorderItems: state.reorderItems,
      addItem: state.addItem,
      setListTitle: state.setListTitle,
      setListDescription: state.setListDescription,
      setCategory: state.setCategory,
      suggestTitleFromTopic: state.suggestTitleFromTopic,
      reset: state.reset,
    }))
  );
