"use client";

import { useCallback } from "react";

import { gridLogger } from "@/lib/logger";
import { useBacklogStore } from "@/stores/backlog-store";
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

  // Handle quick assign from inspector. Previously a stub that only logged and
  // let the inspector close (implying success); now resolves the backlog item and
  // routes through the atomic assignToNextOpenSlot store action (lock + verify +
  // mark used), mirroring ItemDetailPopupProvider.
  const handleQuickAssign = useCallback((id: string) => {
    const backlogItem = useBacklogStore.getState().getItemById?.(id);
    if (!backlogItem) {
      gridLogger.warn('Quick assign: item not found in backlog', { id });
      return;
    }
    const position = useGridStore.getState().assignToNextOpenSlot(backlogItem);
    if (position === null) {
      gridLogger.debug('Quick assign: no open slot or already placed', { id });
    }
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
