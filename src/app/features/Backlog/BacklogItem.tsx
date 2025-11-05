"use client";

import { BacklogItemType } from "@/types/match";
import { BacklogItem as BacklogItemNew } from "@/types/backlog-groups";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useItemStore } from "@/stores/item-store";
import { BacklogItemWrapper } from "./BacklogItemWrapper";
import { BacklogItemContent } from "./BacklogItemContent";
import { ContextMenu } from "./ContextMenu";
import { useComparisonStore } from "@/stores/comparison-store";
import { useBacklogStore } from "@/stores/backlog-store";

interface BacklogItemProps {
  item: BacklogItemType | BacklogItemNew; // Support both old and new types
  groupId: string; // Make groupId required
  isDragOverlay?: boolean;
  size?: 'small' | 'medium' | 'large';
  isAssignedToGrid?: boolean;
}

export function BacklogItem({
  item,
  groupId,
  isDragOverlay = false,
  size = 'medium',
  isAssignedToGrid = false
}: BacklogItemProps) {
  // Helper to get title from either type
  const getItemTitle = (item: BacklogItemType | BacklogItemNew): string => {
    if ('title' in item && item.title) return item.title;
    if ('name' in item && item.name) return item.name;
    return '';
  };

  // Debugging - log item data on mount
  useEffect(() => {
    const title = getItemTitle(item);
    console.log(`🔍 BacklogItem mounted:`, {
      id: item.id,
      title: title,
      hasImageUrl: !!item.image_url,
      imageUrl: item.image_url || 'NONE'
    });
  }, [item]);

  // Use itemStore for most operations
  const itemStore = useItemStore();

  // Get active item from itemStore
  const activeItem = itemStore.activeItem;

  // Use backlogStore with selectors
  const selectedItemId = useBacklogStore(state => state.selectedItemId);
  const selectItem = useBacklogStore(state => state.selectItem);

  // Use comparisonStore with selectors
  const isInComparison = useComparisonStore(state => state.isInComparison);
  const addToComparison = useComparisonStore(state => state.addToComparison);
  const removeFromComparison = useComparisonStore(state => state.removeFromComparison);

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({ isOpen: false, position: { x: 0, y: 0 } });

  // More robust normalization with debugging
  const normalizedItem = useMemo(() => {
    // First log the original item for debugging
    console.log(`🔍 Normalizing item ${item.id}:`, {
      hasTitle: 'title' in item,
      hasName: 'name' in item,
      hasImageUrl: 'image_url' in item,
      imageUrlValue: item.image_url || 'NONE',
      keys: Object.keys(item)
    });

    // Determine the title from either title or name property
    const title = getItemTitle(item);

    // Create normalized item - ensure it matches BacklogItemType
    const normalized: BacklogItemType = {
      id: item.id,
      title: title,
      name: ('name' in item && item.name) ? item.name : title,
      description: item.description || '',
      category: item.category,
      subcategory: item.subcategory,
      item_year: item.item_year,
      item_year_to: item.item_year_to,
      created_at: item.created_at,
      updated_at: 'updated_at' in item ? item.updated_at : undefined,
      matched: 'matched' in item ? item.matched : ('used' in item ? item.used : false),
      tags: item.tags || [],
      // Ensure image_url is properly passed through
      image_url: item.image_url || undefined
    };

    // Log the result
    console.log(`📋 Normalized item:`, {
      id: normalized.id,
      title: normalized.title,
      hasImageUrl: !!normalized.image_url,
      imageUrl: normalized.image_url || 'NONE'
    });

    return normalized;
  }, [item]);

  // Computed states
  const isEffectivelyMatched = useMemo(() =>
    normalizedItem.matched || isAssignedToGrid,
    [normalizedItem.matched, isAssignedToGrid]
  );

  const isSelected = useMemo(() =>
    selectedItemId === normalizedItem.id,
    [selectedItemId, normalizedItem.id]
  );

  // Check if item is in comparison list
  const isInCompareList = useMemo(() =>
    isInComparison(normalizedItem.id),
    [isInComparison, normalizedItem.id]
  );

  // Event handlers
  const handleClick = useCallback(() => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      if (isSelected) {
        selectItem(null);
      } else {
        selectItem(normalizedItem.id);
      }
    }
  }, [isEffectivelyMatched, isDragOverlay, isSelected, selectItem, normalizedItem.id]);

  const handleDoubleClick = useCallback(() => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      const nextPosition = itemStore.getNextAvailableGridPosition();
      if (nextPosition !== null) {
        // Use the normalized item which is already properly typed as BacklogItemType
        console.log(`📋 Double-clicked to assign item to grid:`, {
          id: normalizedItem.id,
          hasImageUrl: !!normalizedItem.image_url,
          position: nextPosition
        });

        itemStore.assignItemToGrid(normalizedItem, nextPosition);
      }
    }
  }, [
    isEffectivelyMatched,
    isDragOverlay,
    itemStore,
    normalizedItem
  ]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isEffectivelyMatched || isDragOverlay) return;

    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    });
  }, [isEffectivelyMatched, isDragOverlay]);

  const handleRemoveItem = useCallback(() => {
    console.log(`🗑️ Removing item ${normalizedItem.id} from group ${groupId}`);
    itemStore.removeItemFromGroup(groupId, normalizedItem.id);
    closeContextMenu();
  }, [groupId, normalizedItem.id, itemStore]);

  const handleToggleCompare = useCallback(() => {
    // Use the normalized item which is already properly typed as BacklogItemType
    if (isInCompareList) {
      removeFromComparison(normalizedItem.id);
    } else {
      addToComparison(normalizedItem);
    }

    closeContextMenu();
  }, [
    normalizedItem,
    isInCompareList,
    addToComparison,
    removeFromComparison
  ]);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  }, []);

  // Compute isDragging state - activeItem is string | null, so compare directly
  const isDragging = useMemo(() =>
    activeItem !== null && activeItem === normalizedItem.id,
    [activeItem, normalizedItem.id]
  );

  return (
    <>
      <BacklogItemWrapper
        item={normalizedItem}
        isDragOverlay={isDragOverlay}
        size={size}
        isAssignedToGrid={isAssignedToGrid}
        isSelected={isSelected}
        isInCompareList={isInCompareList}
        isEffectivelyMatched={isEffectivelyMatched}
        activeItem={activeItem}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <BacklogItemContent
          item={normalizedItem}
          size={size}
          isEffectivelyMatched={isEffectivelyMatched}
          isSelected={isSelected}
          isInCompareList={isInCompareList}
          isDragOverlay={isDragOverlay}
          isDragging={isDragging}
        />
      </BacklogItemWrapper>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
          onRemove={handleRemoveItem}
          onToggleCompare={handleToggleCompare}
          isInCompareList={isInCompareList}
        />
      )}
    </>
  );
}