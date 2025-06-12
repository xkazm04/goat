"use client";

import { BacklogItemType } from "@/app/types/match";
import { BacklogItem as BacklogItemNew } from "@/app/types/backlog-groups";
import { useState } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { BacklogItemWrapper } from "./BacklogItemWrapper";
import { BacklogItemContent } from "./BacklogItemContent";
import { ContextMenu } from "./ContextMenu";

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

  // Event handlers
  const handleClick = () => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      if (isSelected) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(normalizedItem.id);
      }
    }
  };

  const handleDoubleClick = () => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      const nextPosition = getNextAvailableGridPosition();
      if (nextPosition !== null) {
        // Convert to BacklogItemType for grid assignment
        const gridItem: BacklogItemType = {
          id: normalizedItem.id,
          title: normalizedItem.title,
          description: normalizedItem.description,
          matched: false,
          tags: normalizedItem.tags
        };
        assignItemToGrid(gridItem, nextPosition);
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
    // Convert to BacklogItemType for compare list
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