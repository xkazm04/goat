"use client";

import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useItemPopupStore } from "@/stores/item-popup-store";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { ItemDetailPopup } from "./ItemDetailPopup";

/**
 * ItemDetailPopupProvider
 *
 * Renders all active item detail popups. Should be placed in the root layout
 * or in the match page layout to enable popup functionality throughout the app.
 *
 * Features:
 * - Renders multiple popups for side-by-side comparison
 * - Connects to grid store for quick-assign functionality
 * - Uses AnimatePresence for smooth enter/exit animations
 */
export function ItemDetailPopupProvider() {
  const popups = useItemPopupStore((state) => state.popups);
  const gridItems = useGridStore((state) => state.gridItems);
  const assignItemToGrid = useGridStore((state) => state.assignItemToGrid);
  const getItemById = useBacklogStore((state) => state.getItemById);

  // Handle quick-assign: add item to next available grid position
  const handleQuickAssign = useCallback((itemId: string) => {
    // Find next available position (first empty slot)
    const nextPosition = gridItems.findIndex(item => !item.matched) + 1;
    if (nextPosition === 0 || nextPosition > gridItems.length) {
      console.warn('No available grid positions');
      return;
    }

    // Get the full item data from backlog
    const item = getItemById?.(itemId);
    if (!item) {
      console.warn('Item not found in backlog:', itemId);
      return;
    }

    // Create grid item from backlog item
    const gridItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      position: nextPosition,
      matched: true,
    };

    assignItemToGrid(gridItem, nextPosition);
  }, [gridItems, assignItemToGrid, getItemById]);

  if (popups.length === 0) return null;

  return (
    <AnimatePresence mode="sync">
      {popups.map((popup) => (
        <ItemDetailPopup
          key={popup.id}
          popup={popup}
          onQuickAssign={handleQuickAssign}
        />
      ))}
    </AnimatePresence>
  );
}

export default ItemDetailPopupProvider;
