"use client";

import { useCallback } from "react";
import { ItemInspector, RelatedItem } from "./ItemInspector";
import { useInspectorStore } from "@/stores/inspector-store";
import { useGridStore } from "@/stores/grid-store";

/**
 * ItemInspectorProvider
 *
 * A provider component that renders the ItemInspector modal.
 * Should be placed in a layout file to be available globally.
 *
 * The inspector can be opened from anywhere using the useInspectorStore:
 * ```tsx
 * const openInspector = useInspectorStore((state) => state.openInspector);
 * openInspector(itemId);
 * ```
 */
export function ItemInspectorProvider() {
  const { itemId, isOpen, closeInspector, openInspector } = useInspectorStore();
  const assignItemToGrid = useGridStore((state) => state.assignItemToGrid);
  const getNextAvailableGridPosition = useGridStore((state) => state.getNextAvailableGridPosition);

  // Handle quick assign from inspector
  const handleQuickAssign = useCallback((id: string) => {
    const nextPosition = getNextAvailableGridPosition();
    if (nextPosition !== null) {
      // We need the full item data - for now we'll need to get it from the API
      // This is a simplified version that just assigns by ID
      // In a full implementation, we'd fetch the item data first
      console.log('Quick assign item:', id, 'to position:', nextPosition);
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
