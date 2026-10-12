"use client";

import { useCallback } from "react";

import { useItemPopupStore } from "@/stores/item-popup-store";

import { quickAssignFromBacklog } from "./ItemDetailPopupProvider";
import { ItemInspector, RelatedItem } from "./ItemInspector";

/**
 * ItemInspectorProvider
 *
 * A provider component that renders the ItemInspector modal.
 * Should be placed in a layout file to be available globally.
 *
 * The inspector can be opened from anywhere using useItemPopupStore:
 * ```tsx
 * const openInspector = useItemPopupStore((state) => state.openInspector);
 * openInspector(itemId);
 * ```
 */
export function ItemInspectorProvider() {
  const itemId = useItemPopupStore((state) => state.inspectorItemId);
  const isOpen = useItemPopupStore((state) => state.inspectorIsOpen);
  const closeInspector = useItemPopupStore((state) => state.closeInspector);
  const openInspector = useItemPopupStore((state) => state.openInspector);

  // Quick assign from the inspector: the ONE quick-assign implementation shared
  // with ItemDetailPopupProvider (atomic assignToNextOpenSlot: lock + verify +
  // mark used). Previously a stub that only logged and let the inspector close.
  const handleQuickAssign = useCallback((id: string) => {
    quickAssignFromBacklog(id);
  }, []);

  // Handle clicking a related item - opens that item in inspector
  const handleRelatedItemClick = useCallback((item: RelatedItem) => {
    openInspector(item.id);
  }, [openInspector]);

  return (
    <ItemInspector
      itemId={itemId}
      isOpen={isOpen}
      onClose={closeInspector}
      onQuickAssign={handleQuickAssign}
      onRelatedItemClick={handleRelatedItemClick}
    />
  );
}

export default ItemInspectorProvider;
