"use client";

import { useCallback } from "react";

import { gridLogger } from "@/lib/logger";
import { useGridStore } from "@/stores/grid-store";
import { useItemPopupStore } from "@/stores/item-popup-store";

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
  const assignItemToGrid = useGridStore((state) => state.assignItemToGrid);
  const getNextAvailableGridPosition = useGridStore((state) => state.getNextAvailableGridPosition);

  // Handle quick assign from inspector
  const handleQuickAssign = useCallback((id: string) => {
    const nextPosition = getNextAvailableGridPosition();
    if (nextPosition !== null) {
      // We need the full item data - for now we'll need to get it from the API
      // This is a simplified version that just assigns by ID
      // In a full implementation, we'd fetch the item data first
      gridLogger.debug('Quick assign item', { id, position: nextPosition });
      // Note: The actual assignment would need the full item data
      // This would typically be done via a store action or API call
    }
  }, [getNextAvailableGridPosition]);

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
