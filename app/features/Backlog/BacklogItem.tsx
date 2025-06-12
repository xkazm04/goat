"use client";

import { BacklogItemType } from "@/app/types/match";
import { BacklogItem as BacklogItemNew } from "@/app/types/backlog-groups";
import { useState } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { BacklogItemWrapper } from "./BacklogItemWrapper";
import { BacklogItemContent } from "./BacklogItemContent";
import { ContextMenu } from "./ContextMenu";

interface BacklogItemProps {
  item: BacklogItemType | BacklogItemNew;
  groupId: string;
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
  const { 
    selectedBacklogItem, 
    setSelectedBacklogItem,
    removeItemFromGroup,
    toggleCompareItem,
    compareList,
    getNextAvailableGridPosition,
    assignItemToGrid,
    activeItem
  } = useItemStore();
  
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({ isOpen: false, position: { x: 0, y: 0 } });
  
  // Normalize item data for compatibility
  const normalizedItem = {
    id: item.id,
    title: 'title' in item ? item.title : item.name || '',
    description: item.description || '',
    matched: 'matched' in item ? item.matched : false,
    tags: item.tags || []
  };
  
  // Computed states
  const isEffectivelyMatched = normalizedItem.matched || isAssignedToGrid;
  const isSelected = selectedBacklogItem === normalizedItem.id;
  const isInCompareList = compareList.some(compareItem => compareItem.id === normalizedItem.id);

  // FIXED: Event handlers - prevent bubbling but don't prevent drag
  const handleClick = (e: React.MouseEvent) => {
    // Only stop propagation if we're handling the click
    if (!isEffectivelyMatched && !isDragOverlay) {
      e.stopPropagation();
      
      if (isSelected) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(normalizedItem.id);
      }
    }
  };

  // FIXED: Double-click assignment
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    console.log(`🎯 Double-click assignment for item: ${normalizedItem.title}`);
    
    if (!isEffectivelyMatched && !isDragOverlay) {
      const nextPosition = getNextAvailableGridPosition();
      
      if (nextPosition !== null) {
        console.log(`📍 Assigning item to grid position: ${nextPosition}`);
        
        const gridItem: BacklogItemType = {
          id: normalizedItem.id,
          title: normalizedItem.title,
          description: normalizedItem.description,
          matched: false,
          tags: normalizedItem.tags
        };
        
        try {
          assignItemToGrid(gridItem, nextPosition);
          console.log(`✅ Successfully assigned item ${normalizedItem.title} to position ${nextPosition}`);
        } catch (error) {
          console.error(`❌ Failed to assign item to grid:`, error);
        }
      } else {
        console.warn(`⚠️ No available grid positions for item: ${normalizedItem.title}`);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isEffectivelyMatched || isDragOverlay) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleRemoveItem = () => {
    console.log(`🗑️ Removing item ${normalizedItem.id} from group ${groupId}`);
    removeItemFromGroup(groupId, normalizedItem.id);
    closeContextMenu();
  };

  const handleToggleCompare = () => {
    const compareItem: BacklogItemType = {
      id: normalizedItem.id,
      title: normalizedItem.title,
      description: normalizedItem.description,
      matched: normalizedItem.matched,
      tags: normalizedItem.tags
    };
    toggleCompareItem(compareItem);
    closeContextMenu();
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  };

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
          isDragging={activeItem === normalizedItem.id}
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