/**
 * Studio Store
 *
 * Zustand store for the List Creation Studio feature.
 * Manages topic input, AI generation, generated items, and list metadata state.
 * Supports progressive streaming generation via NDJSON.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { apiClient, getApiErrorMessage } from '@/lib/api/client';
import { getTemplateById } from '@/lib/criteria/templates';
import { getListTemplateById } from '@/lib/templates/list-templates';

import type { CriteriaProfile, ListCriteriaConfig } from '@/lib/criteria/types';
import type { EnrichedItem } from '@/types/studio';

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
// Generation concurrency control
// ─────────────────────────────────────────────────────────────

/** Active AbortController — aborted when a new generation starts */
let activeAbortController: AbortController | null = null;

/** Monotonically increasing nonce — guards stale set() calls */
let generationNonce = 0;

// ─────────────────────────────────────────────────────────────
// Streaming batch buffer — collects items and flushes once per frame
// ─────────────────────────────────────────────────────────────

let streamBuffer: EnrichedItem[] = [];
let streamRafId: number | null = null;
let streamProgressMsg: string | null = null;

// ─────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────

interface StudioState {
  // Form state
  topic: string;
  /**
   * Final ranked list size (the "N" in "Top N").
   *
   * This determines how many grid positions are available in the match
   * interface. Only the top `listSize` items end up in the published
   * ranked list. Items beyond this count serve as the backlog pool for
   * ranking and are NOT discarded -- they give the user a larger pool
   * to choose from when filling the grid.
   */
  listSize: number;
  /**
   * Total number of items to generate via the AI studio.
   *
   * This is intentionally larger than `listSize` because the extra items
   * populate the backlog pool. For example, with listSize=10 and
   * generateCount=30, the user ranks their top 10 from a pool of 30
   * candidates. The remaining 20 items stay in the backlog and are
   * available for swapping but are NOT discarded.
   */
  generateCount: number;

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

  // Template state
  appliedTemplateId: string | null;

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
  streamGenerate: () => Promise<void>; // Alias for generateItems
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

  // List settings
  allowCustomItems: boolean;

  // Actions - List settings
  setAllowCustomItems: (allow: boolean) => void;

  // Actions - Publishing
  setPublishing: (isPublishing: boolean) => void;
  setPublishError: (error: string | null) => void;
  setPublishedListId: (id: string | null) => void;
  setShowSuccess: (show: boolean) => void;

  // Actions - Template
  applyTemplate: (templateId: string) => void;

  // Actions - Reset
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
  // Initial state - Form
  topic: '',
  listSize: 10,        // Default "Top 10" list
  generateCount: 30,   // Generate 30 candidates; 20 extra serve as backlog pool

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

  // Initial state - Template
  appliedTemplateId: null,

  // Initial state - List settings
  allowCustomItems: true,

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
  // Uses AbortController + nonce to cancel stale streams on re-invocation
  generateItems: async () => {
    const { topic, generateCount, category } = get();

    // Validate topic
    if (!topic.trim()) {
      set({ error: 'Please enter a topic' });
      return;
    }

    // Abort any in-flight generation
    if (activeAbortController) {
      activeAbortController.abort();
    }
    const controller = new AbortController();
    activeAbortController = controller;
    const myNonce = ++generationNonce;

    /** Guard: returns true if this generation is still the active one */
    const isStale = () => myNonce !== generationNonce;

    // Start generation with progress message
    set({ isGenerating: true, error: null, generationProgress: 'Generating ideas...' });

    // Get existing item titles to exclude duplicates
    const existingTitles = get().generatedItems.map((item) => item.title.toLowerCase().trim());

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
        signal: controller.signal,
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

        // If a newer generation has started, stop processing
        if (isStale()) {
          reader.cancel();
          return;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (isStale()) return;

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
              if (isStale()) return;
              // Auto-fill title and description if empty (read fresh state)
              const currentMeta = get();
              const metaUpdates: Partial<{ listTitle: string; listDescription: string }> = {};
              if (!currentMeta.listTitle.trim() && parsed.suggested_title) {
                metaUpdates.listTitle = parsed.suggested_title;
              }
              if (!currentMeta.listDescription.trim() && parsed.suggested_description) {
                metaUpdates.listDescription = parsed.suggested_description;
              }
              if (Object.keys(metaUpdates).length > 0) {
                set(metaUpdates);
              }
              break;
            }

            case 'item': {
              if (isStale()) return;
              // Stamp a stable uid so duplicate titles never collide on React
              // keys / dnd-kit sortable ids downstream.
              const item = { ...parsed.data, uid: parsed.data.uid ?? crypto.randomUUID() };
              const titleKey = item.title.toLowerCase().trim();
              // Filter duplicates (case-insensitive)
              if (!existingTitles.includes(titleKey)) {
                existingTitles.push(titleKey);
                newItems.push(item);
                // Batch: buffer the item and schedule a single rAF flush
                streamBuffer.push(item);
                streamProgressMsg = `Loading item ${parsed.index + 1}/${parsed.total}...`;
                if (streamRafId === null) {
                  streamRafId = requestAnimationFrame(() => {
                    streamRafId = null;
                    const buffered = streamBuffer;
                    const progress = streamProgressMsg;
                    streamBuffer = [];
                    streamProgressMsg = null;
                    if (buffered.length > 0) {
                      set({
                        generatedItems: [...get().generatedItems, ...buffered],
                        generationProgress: progress,
                      });
                    }
                  });
                }
              }
              break;
            }

            case 'done': {
              if (isStale()) return;
              // Flush any remaining buffered items before marking done
              if (streamBuffer.length > 0) {
                if (streamRafId !== null) { cancelAnimationFrame(streamRafId); streamRafId = null; }
                set({ generatedItems: [...get().generatedItems, ...streamBuffer] });
                streamBuffer = [];
                streamProgressMsg = null;
              }
              set({
                isGenerating: false,
                generationProgress: 'Generation complete!',
              });

              // Clear "Generation complete!" after 2 seconds
              setTimeout(() => {
                if (isStale()) return;
                const current = get();
                if (current.generationProgress === 'Generation complete!') {
                  set({ generationProgress: null });
                }
              }, 2000);
              break;
            }

            case 'error': {
              if (isStale()) return;
              // Flush buffered items before reporting error
              if (streamBuffer.length > 0) {
                if (streamRafId !== null) { cancelAnimationFrame(streamRafId); streamRafId = null; }
                set({ generatedItems: [...get().generatedItems, ...streamBuffer] });
                streamBuffer = [];
                streamProgressMsg = null;
              }
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

      if (isStale()) return;

      // Flush any remaining buffered items after stream ends
      if (streamBuffer.length > 0) {
        if (streamRafId !== null) { cancelAnimationFrame(streamRafId); streamRafId = null; }
        set({ generatedItems: [...get().generatedItems, ...streamBuffer] });
        streamBuffer = [];
        streamProgressMsg = null;
      }

      // If we exited the loop without a done/error line, finalize
      const currentState = get();
      if (currentState.isGenerating) {
        set({ isGenerating: false, generationProgress: null });
      }

      // Match new items against DB (post-stream, same as before)
      if (newItems.length > 0 && !isStale()) {
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

          if (isStale()) return;

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
        } catch (err) {
          console.warn('[Studio] DB match-items failed:', err instanceof Error ? err.message : err);
        }
      }
    } catch (error) {
      // Ignore abort errors from intentional cancellation
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      if (isStale()) return;
      set({
        error: getApiErrorMessage(error),
        isGenerating: false,
        generationProgress: null,
      });
    } finally {
      // Clean up controller reference if this is still the active one
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    }
  },

  // Alias for generateItems -- satisfies the streamGenerate contract
  streamGenerate: () => get().generateItems(),

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
    const withId = { ...item, uid: item.uid ?? crypto.randomUUID() };
    set({ generatedItems: [...generatedItems, withId] });
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

    // Only 'none' has no config. Do NOT gate on selectedProfileId here: custom
    // mode never sets it, so gating on it silently discarded all custom criteria.
    if (criteriaMode === 'none') {
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

    // For presets, resolve the template by ID
    if (criteriaMode === 'preset' && selectedProfileId) {
      const template = getTemplateById(selectedProfileId);
      if (template) {
        const now = new Date().toISOString();
        return {
          profileId: template.id,
          profileName: template.name,
          criteria: template.criteria,
          createdAt: now,
          updatedAt: now,
        };
      }
    }

    return null;
  },

  // List settings actions
  setAllowCustomItems: (allowCustomItems) => set({ allowCustomItems }),

  // Publishing actions
  setPublishing: (isPublishing) => set({ isPublishing }),
  setPublishError: (publishError) => set({ publishError }),
  setPublishedListId: (publishedListId) => set({ publishedListId }),
  setShowSuccess: (showSuccess) => set({ showSuccess }),

  // Template action — pre-fills form from a curated template
  applyTemplate: (templateId: string) => {
    const template = getListTemplateById(templateId);
    if (!template) return;

    // Convert starter items to EnrichedItem format
    const seededItems: EnrichedItem[] = template.starterItems.map((item) => ({
      title: item.title,
      description: item.description,
      wikipedia_url: item.wikipedia_url,
      image_url: null,
      uid: crypto.randomUUID(),
    }));

    set({
      topic: template.topic,
      category: template.category,
      listTitle: template.name,
      listDescription: template.description,
      listSize: template.listSize,
      generateCount: template.generateCount,
      generatedItems: seededItems,
      appliedTemplateId: template.id,
      // Apply criteria profile if the template specifies one
      criteriaMode: template.criteriaProfileId ? 'preset' : 'none',
      selectedProfileId: template.criteriaProfileId,
      customProfile: null,
      // Reset transient state
      error: null,
      generationProgress: null,
    });
  },

  // Full reset
  reset: () => {
    // Abort any in-flight generation stream
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
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
      appliedTemplateId: null,
      allowCustomItems: true,
      isPublishing: false,
      publishError: null,
      publishedListId: null,
      showSuccess: false,
    });
  },
    }),
    {
      name: 'goat-studio-store',
      partialize: (state) => ({
        generatedItems: state.generatedItems,
        listTitle: state.listTitle,
        listDescription: state.listDescription,
        category: state.category,
        topic: state.topic,
        generateCount: state.generateCount,
        criteriaMode: state.criteriaMode,
        selectedProfileId: state.selectedProfileId,
        customProfile: state.customProfile,
        appliedTemplateId: state.appliedTemplateId,
      }),
    }
  )
);

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
      streamGenerate: state.streamGenerate,
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
 * Template state selector - applied template info and applyTemplate action
 */
export const useStudioTemplate = () =>
  useStudioStore(
    useShallow((state) => ({
      appliedTemplateId: state.appliedTemplateId,
      applyTemplate: state.applyTemplate,
    }))
  );

/**
 * List settings selector - custom item creation toggle
 */
export const useStudioSettings = () =>
  useStudioStore(
    useShallow((state) => ({
      allowCustomItems: state.allowCustomItems,
      setAllowCustomItems: state.setAllowCustomItems,
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
      streamGenerate: state.streamGenerate,
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
      applyTemplate: state.applyTemplate,
      reset: state.reset,
    }))
  );
