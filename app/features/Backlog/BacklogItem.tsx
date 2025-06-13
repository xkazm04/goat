"use client";

import { BacklogItemType } from "@/app/types/match";
import { BacklogItem as BacklogItemNew } from "@/app/types/backlog-groups";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { BacklogItemWrapper } from "./BacklogItemWrapper";
import { BacklogItemContent } from "./BacklogItemContent";
import { ContextMenu } from "./ContextMenu";
import { useComparisonStore } from "@/app/stores/comparison-store";
import { useBacklogStore } from "@/app/stores/backlog-store";

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
  // Debugging - log item data on mount
  useEffect(() => {
    console.log(`🔍 BacklogItem mounted:`, {
      id: item.id,
      title: 'title' in item ? item.title : item.name || '',
      hasImageUrl: !!item.image_url,
      imageUrl: item.image_url || 'NONE'
    });
  }, [item]);
  
  // Use itemStore for most operations
  const itemStore = useItemStore();
  
  // Get active item with direct selector
  const activeItem = useItemStore(state => state.activeItem);
  
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
    
    // Create normalized item
    const normalized = {
      id: item.id,
      title: 'title' in item ? item.title : item.name || '',
      description: item.description || '',
      matched: 'matched' in item ? item.matched : ('used' in item ? item.used : false),
      tags: item.tags || [],
      // Ensure image_url is properly passed through
      image_url: item.image_url || null
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
        // Convert to BacklogItemType for grid assignment with image_url preserved
        const gridItem = {
          id: normalizedItem.id,
          title: normalizedItem.title,
          description: normalizedItem.description,
          matched: false,
          tags: normalizedItem.tags,
          image_url: normalizedItem.image_url // Make sure to include image_url
        };
        
        console.log(`📋 Double-clicked to assign item to grid:`, {
          id: gridItem.id,
          hasImageUrl: !!gridItem.image_url,
          position: nextPosition
        });
        
        itemStore.assignItemToGrid(gridItem, nextPosition);
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
    // Convert to BacklogItemType for compare list, preserving image_url
    const compareItem = {
      id: normalizedItem.id,
      title: normalizedItem.title,
      description: normalizedItem.description,
      matched: normalizedItem.matched,
      tags: normalizedItem.tags,
      image_url: normalizedItem.image_url // Make sure to include image_url
    };
    
    if (isInCompareList) {
      removeFromComparison(normalizedItem.id);
    } else {
      addToComparison(compareItem);
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

  // Compute isDragging state
  const isDragging = useMemo(() => 
    activeItem === normalizedItem.id,
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