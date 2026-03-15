/**
 * Studio Store
 *
 * Zustand store for the List Creation Studio feature.
 * Manages topic input, AI generation, generated items, and list metadata state.
 * Supports progressive streaming generation via NDJSON.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { apiClient, getApiErrorMessage } from '@/lib/api/client';
import type { EnrichedItem } from '@/types/studio';
import type { CriteriaProfile, ListCriteriaConfig } from '@/lib/criteria/types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type CriteriaMode = 'none' | 'preset' | 'custom';

/** NDJSON stream line types from /api/studio/generate?stream=true */
interface StreamMetaLine {
  type: 'meta';
  suggested_title: string;
  suggested_description: string;
}

interface StreamItemLine {
  type: 'item';
  data: EnrichedItem;
  index: number;
  total: number;
}

interface StreamDoneLine {
  type: 'done';
  total: number;
}

interface StreamErrorLine {
  type: 'error';
  message: string;
}

type StreamLine = StreamMetaLine | StreamItemLine | StreamDoneLine | StreamErrorLine;

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
  generationProgress: string | null;  // Progress message during generation
  error: string | null;

  // Metadata state
  listTitle: string;
  listDescription: string;
  category: string;

  // Criteria state
  criteriaMode: CriteriaMode;
  selectedProfileId: string | null;
  customProfile: CriteriaProfile | null;

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
  setGenerationProgress: (progress: string | null) => void;
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

  // Actions - Criteria
  setCriteriaMode: (mode: CriteriaMode) => void;
  setSelectedProfileId: (id: string | null) => void;
  setCustomProfile: (profile: CriteriaProfile | null) => void;
  getCriteriaConfig: () => ListCriteriaConfig | null;

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
  generationProgress: null,
  error: null,

  // Initial state - Metadata
  listTitle: '',
  listDescription: '',
  category: 'Games',

  // Initial state - Criteria
  criteriaMode: 'none',
  selectedProfileId: null,
  customProfile: null,

  // Initial state - Publishing
  isPublishing: false,
  publishError: null,
  publishedListId: null,
  showSuccess: false,

  // Form actions
  setTopic: (topic) => set({ topic }),
  setListSize: (size) => set({ listSize: size }),
  setGenerateCount: (count) => set({ generateCount: count }),

  // Generation action - uses streaming NDJSON to progressively append items
  // Also matches against existing DB items to reuse their IDs and images
  // Auto-fills title and description if empty using LLM suggestions
  generateItems: async () => {
    const { topic, generateCount, generatedItems, category, listTitle, listDescription } = get();

    // Validate topic
    if (!topic.trim()) {
      set({ error: 'Please enter a topic' });
      return;
    }

    // Start generation with progress message
    set({ isGenerating: true, error: null, generationProgress: 'Generating ideas...' });

    // Get existing item titles to exclude duplicates
    const existingTitles = generatedItems.map((item) => item.title.toLowerCase().trim());

    try {
      // Use streaming endpoint for progressive item reveal
      const response = await fetch('/api/studio/generate?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count: generateCount,
          category,
          excludeTitles: existingTitles.length > 0 ? existingTitles : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      const newItems: EnrichedItem[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let parsed: StreamLine;
          try {
            parsed = JSON.parse(trimmed) as StreamLine;
          } catch {
            continue; // Skip malformed lines
          }

          switch (parsed.type) {
            case 'meta': {
              // Auto-fill title and description if empty
              const metaUpdates: Partial<{ listTitle: string; listDescription: string }> = {};
              if (!listTitle.trim() && parsed.suggested_title) {
                metaUpdates.listTitle = parsed.suggested_title;
              }
              if (!listDescription.trim() && parsed.suggested_description) {
                metaUpdates.listDescription = parsed.suggested_description;
              }
              if (Object.keys(metaUpdates).length > 0) {
                set(metaUpdates);
              }
              break;
            }

            case 'item': {
              const item = parsed.data;
              // Filter duplicates (case-insensitive)
              if (!existingTitles.includes(item.title.toLowerCase().trim())) {
                newItems.push(item);
                // Progressive append: update store immediately so UI shows each item
                set({
                  generatedItems: [...generatedItems, ...newItems],
                  generationProgress: `Loading item ${parsed.index + 1}/${parsed.total}...`,
                });
              }
              break;
            }

            case 'done': {
              set({
                isGenerating: false,
                generationProgress: 'Generation complete!',
              });

              // Clear "Generation complete!" after 2 seconds
              setTimeout(() => {
                const current = get();
                if (current.generationProgress === 'Generation complete!') {
                  set({ generationProgress: null });
                }
              }, 2000);
              break;
            }

            case 'error': {
              set({
                error: `${parsed.message} Try a more specific topic, or rephrase your request.`,
                isGenerating: false,
                generationProgress: null,
              });
              return;
            }
          }
        }
      }

      // If we exited the loop without a done/error line, finalize
      const currentState = get();
      if (currentState.isGenerating) {
        set({ isGenerating: false, generationProgress: null });
      }

      // Match new items against DB (post-stream, same as before)
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

          // Merge DB matches back into the items
          const currentItems = get().generatedItems;
          const updatedItems = currentItems.map((item) => {
            const match = matchResponse.items.find(
              (m) => m.title.toLowerCase() === item.title.toLowerCase()
            );
            if (match?.matched && match.db_item) {
              return {
                ...item,
                db_item_id: match.db_item.id,
                db_matched: true,
                image_url: match.db_item.image_url || item.image_url,
              };
            }
            return item;
          });
          set({ generatedItems: updatedItems });
        } catch {
          // Non-critical - continue without DB matching
        }
      }
    } catch (error) {
      set({
        error: getApiErrorMessage(error),
        isGenerating: false,
        generationProgress: null,
      });
    }
  },

  // Progress action
  setGenerationProgress: (progress) => set({ generationProgress: progress }),

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

  // Criteria actions
  setCriteriaMode: (mode) => {
    set({ criteriaMode: mode });
    // Clear profile selection when switching to 'none'
    if (mode === 'none') {
      set({ selectedProfileId: null, customProfile: null });
    }
  },
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  setCustomProfile: (profile) => set({ customProfile: profile }),

  getCriteriaConfig: () => {
    const { criteriaMode, selectedProfileId, customProfile } = get();

    if (criteriaMode === 'none' || !selectedProfileId) {
      return null;
    }

    // For custom profiles, use the customProfile directly
    if (criteriaMode === 'custom' && customProfile) {
      return {
        profileId: customProfile.id,
        profileName: customProfile.name,
        criteria: customProfile.criteria,
        createdAt: customProfile.createdAt,
        updatedAt: customProfile.updatedAt,
      };
    }

    // For presets, we'll need to get the template - imported dynamically to avoid circular deps
    // The actual template lookup happens in MetadataPanel when publishing
    return null;
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
      generationProgress: null,
      error: null,
      listTitle: '',
      listDescription: '',
      category: 'Games',
      criteriaMode: 'none',
      selectedProfileId: null,
      customProfile: null,
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
 * Generation state selector - loading, progress, and error states
 */
export const useStudioGeneration = () =>
  useStudioStore(
    useShallow((state) => ({
      isGenerating: state.isGenerating,
      generationProgress: state.generationProgress,
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
 * Criteria state selector - criteria mode and profile selection
 */
export const useStudioCriteria = () =>
  useStudioStore(
    useShallow((state) => ({
      criteriaMode: state.criteriaMode,
      selectedProfileId: state.selectedProfileId,
      customProfile: state.customProfile,
      category: state.category,
      setCriteriaMode: state.setCriteriaMode,
      setSelectedProfileId: state.setSelectedProfileId,
      setCustomProfile: state.setCustomProfile,
      getCriteriaConfig: state.getCriteriaConfig,
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
