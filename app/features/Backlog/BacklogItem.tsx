"use client";

import { BacklogItemType } from "@/app/types/match";
import { useState } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { BacklogItemWrapper } from "./BacklogItemWrapper";
import { BacklogItemContent } from "./BacklogItemContent";
import { ContextMenu } from "./ContextMenu";

interface BacklogItemProps {
  item: BacklogItemType;
  isDragOverlay?: boolean;
  size?: 'small' | 'medium' | 'large';
  isAssignedToGrid?: boolean;
}

export function BacklogItem({ 
  item, 
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
  
  // Computed states
  const isEffectivelyMatched = item.matched || isAssignedToGrid;
  const isSelected = selectedBacklogItem === item.id;
  const isInCompareList = compareList.some(compareItem => compareItem.id === item.id);

  // Event handlers
  const handleClick = () => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      if (isSelected) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(item.id);
      }
    }
  };

  const handleDoubleClick = () => {
    if (!isEffectivelyMatched && !isDragOverlay) {
      const nextPosition = getNextAvailableGridPosition();
      if (nextPosition !== null) {
        assignItemToGrid(item, nextPosition);
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
    removeItemFromGroup(item.id);
  };

  const handleToggleCompare = () => {
    toggleCompareItem(item);
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  };

  return (
    <>
      <BacklogItemWrapper
        item={item}
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
          item={item}
          size={size}
          isEffectivelyMatched={isEffectivelyMatched}
          isSelected={isSelected}
          isInCompareList={isInCompareList}
          isDragOverlay={isDragOverlay}
          isDragging={activeItem === item.id}
        />
      </BacklogItemWrapper>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onRemove={handleRemoveItem}
        onToggleCompare={handleToggleCompare}
        isInCompareList={isInCompareList}
      />
    </>
  );
}