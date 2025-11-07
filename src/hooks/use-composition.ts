import { useCompositionModalStore, CompositionFormData } from '@/stores/composition-modal-store';

/**
 * Hook for interacting with the global Composition Modal
 *
 * Usage examples:
 *
 * // Simple open
 * const { openComposition } = useComposition();
 * openComposition();
 *
 * // Open with preset data (e.g., from showcase card)
 * openComposition({
 *   category: "Movies",
 *   subcategory: "Action",
 *   hierarchy: "Top 10"
 * });
 *
 * // Open with custom colors
 * openComposition({
 *   color: {
 *     primary: "#3b82f6",
 *     secondary: "#2563eb",
 *     accent: "#60a5fa"
 *   }
 * });
 *
 * // Close modal
 * const { closeComposition } = useComposition();
 * closeComposition();
 *
 * // Reset to defaults
 * const { resetComposition } = useComposition();
 * resetComposition();
 *
 * // Update form fields
 * const { updateFormData } = useComposition();
 * updateFormData({ title: "My Custom List" });
 */
export function useComposition() {
  const {
    isOpen,
    isExpanded,
    formData,
    openModal,
    closeModal,
    resetModal,
    setIsExpanded,
    updateFormData,
    setFormData,
    populateFromPreset
  } = useCompositionModalStore();

  return {
    // State
    isOpen,
    isExpanded,
    formData,

    // Actions
    openComposition: (config?: Partial<CompositionFormData>) => openModal(config),
    closeComposition: closeModal,
    resetComposition: resetModal,
    toggleExpanded: (expanded?: boolean) => {
      setIsExpanded(expanded !== undefined ? expanded : !isExpanded);
    },
    updateFormData,
    setFormData,

    // Convenience methods
    openWithPreset: populateFromPreset
  };
}
