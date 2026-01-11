import { useCallback, useMemo } from 'react';
import {
  useCompositionModalStore,
  CompositionMode,
  TemplateData,
} from '@/stores/composition-modal-store';
import { useShallow } from 'zustand/react/shallow';
import { ListTemplate } from '@/types/templates';
import { TopList } from '@/types/top-lists';
import { Blueprint } from '@/types/blueprint';
import {
  ListIntent,
  ListIntentColor,
  ListIntentTimePeriod,
  ListIntentSource,
} from '@/types/list-intent';

// Re-export types for convenient access
export type {
  CompositionMode,
  TemplateData,
} from '@/stores/composition-modal-store';

export type {
  ListIntent,
  ListIntentColor,
  ListIntentTimePeriod,
  ListIntentSource,
} from '@/types/list-intent';

/**
 * Hook for interacting with the global Composition Modal
 *
 * Usage examples:
 *
 * // Simple open
 * const { openComposition } = useComposition();
 * openComposition();
 *
 * // Open with preset (e.g., from showcase card)
 * const { openWithPreset } = useComposition();
 * openWithPreset({
 *   category: "Movies",
 *   subcategory: "Action",
 *   hierarchy: "Top 10"
 * });
 *
 * // Open with template
 * const { openWithTemplate } = useComposition();
 * openWithTemplate(template);
 *
 * // Open to clone a list ("Use as Template")
 * const { openWithSourceList } = useComposition();
 * openWithSourceList(list);
 *
 * // Open with blueprint (shareable list configuration)
 * const { openWithBlueprint } = useComposition();
 * openWithBlueprint(blueprint);
 *
 * // Show template gallery
 * const { setShowTemplateGallery } = useComposition();
 * setShowTemplateGallery(true);
 *
 * // Close modal
 * const { closeComposition } = useComposition();
 * closeComposition();
 *
 * // Reset to defaults
 * const { resetComposition } = useComposition();
 * resetComposition();
 *
 * // Update intent fields
 * const { updateIntent } = useComposition();
 * updateIntent({ title: "My Custom List" });
 */
export function useComposition() {
  // Use useShallow to prevent unnecessary re-renders when selecting multiple state values
  const state = useCompositionModalStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      isExpanded: s.isExpanded,
      intent: s.intent,
      mode: s.mode,
      templateData: s.templateData,
      showTemplateGallery: s.showTemplateGallery,
    }))
  );

  // Get stable action references
  const openModal = useCompositionModalStore((s) => s.openModal);
  const closeModal = useCompositionModalStore((s) => s.closeModal);
  const resetModal = useCompositionModalStore((s) => s.resetModal);
  const setIsExpanded = useCompositionModalStore((s) => s.setIsExpanded);
  const updateIntentAction = useCompositionModalStore((s) => s.updateIntent);
  const setIntentAction = useCompositionModalStore((s) => s.setIntent);
  const getIntentAction = useCompositionModalStore((s) => s.getIntent);
  const populateFromPreset = useCompositionModalStore((s) => s.populateFromPreset);
  const setMode = useCompositionModalStore((s) => s.setMode);
  const setShowTemplateGallery = useCompositionModalStore((s) => s.setShowTemplateGallery);
  const openWithTemplateAction = useCompositionModalStore((s) => s.openWithTemplate);
  const openWithSourceListAction = useCompositionModalStore((s) => s.openWithSourceList);
  const openWithBlueprintAction = useCompositionModalStore((s) => s.openWithBlueprint);
  const clearTemplateData = useCompositionModalStore((s) => s.clearTemplateData);

  // Memoize wrapper functions
  const openComposition = useCallback(
    () => openModal(),
    [openModal]
  );

  const toggleExpanded = useCallback(
    (expanded?: boolean) => {
      setIsExpanded(expanded !== undefined ? expanded : !state.isExpanded);
    },
    [setIsExpanded, state.isExpanded]
  );

  const openWithTemplate = useCallback(
    (template: ListTemplate) => openWithTemplateAction(template),
    [openWithTemplateAction]
  );

  const openWithSourceList = useCallback(
    (list: TopList) => openWithSourceListAction(list),
    [openWithSourceListAction]
  );

  const openWithBlueprint = useCallback(
    (blueprint: Blueprint) => openWithBlueprintAction(blueprint),
    [openWithBlueprintAction]
  );

  const updateIntent = useCallback(
    (updates: Partial<ListIntent>) => updateIntentAction(updates),
    [updateIntentAction]
  );

  const setIntent = useCallback(
    (intent: ListIntent) => setIntentAction(intent),
    [setIntentAction]
  );

  const getIntent = useCallback(() => getIntentAction(), [getIntentAction]);

  return useMemo(() => ({
    // State
    ...state,

    // Actions
    openComposition,
    closeComposition: closeModal,
    resetComposition: resetModal,
    toggleExpanded,

    // ListIntent-based actions
    updateIntent,
    setIntent,
    getIntent,

    // Template actions
    setMode,
    setShowTemplateGallery,
    openWithTemplate,
    openWithSourceList,
    openWithBlueprint,
    clearTemplateData,

    // Convenience methods
    openWithPreset: populateFromPreset,
  }), [
    state,
    openComposition,
    closeModal,
    resetModal,
    toggleExpanded,
    updateIntent,
    setIntent,
    getIntent,
    setMode,
    setShowTemplateGallery,
    openWithTemplate,
    openWithSourceList,
    openWithBlueprint,
    clearTemplateData,
    populateFromPreset,
  ]);
}
