"use client";

import { useState, useCallback, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Check, GitCompare } from "lucide-react";
import { CollectionItem } from "./types";
import { SimpleContextMenu } from "./SimpleContextMenu";
import { useBacklogStore } from "@/stores/backlog-store";
import { useGridStore } from "@/stores/grid-store";
import { useComparisonStore } from "@/stores/comparison-store";
import { BacklogItem } from "@/types/backlog-groups";

interface SimpleCollectionItemProps {
  item: CollectionItem;
  groupId: string;
}

/**
 * Draggable item with full feature set
 * Selection, double-click, context menu, visual indicators
 */
export function SimpleCollectionItem({ item, groupId }: SimpleCollectionItemProps) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({ isOpen: false, position: { x: 0, y: 0 } });

  // Store connections
  const selectedItemId = useBacklogStore(state => state.selectedItemId);
  const selectItem = useBacklogStore(state => state.selectItem);
  const removeItemFromGroup = useBacklogStore(state => state.removeItemFromGroup);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  const gridItems = useGridStore(state => state.gridItems);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const getNextAvailableGridPosition = useGridStore(state => state.getNextAvailableGridPosition);

  const isInComparison = useComparisonStore(state => state.isInComparison);
  const addToComparison = useComparisonStore(state => state.addToComparison);
  const removeFromComparison = useComparisonStore(state => state.removeFromComparison);

  // Computed states
  const isSelected = selectedItemId === item.id;
  const isInCompareList = isInComparison(item.id);

  // Check if item is already in grid (matched/used)
  const isMatched = useMemo(() => {
    return gridItems.some(gridItem => gridItem.backlogItemId === item.id && gridItem.matched);
  }, [gridItems, item.id]);

  // Draggable setup - only if not matched
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId
    },
    disabled: isMatched
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Event handlers
  const handleClick = useCallback(() => {
    if (!isMatched) {
      if (isSelected) {
        selectItem(null);
      } else {
        selectItem(item.id);
      }
    }
  }, [isMatched, isSelected, selectItem, item.id]);

  const handleDoubleClick = useCallback(() => {
    if (!isMatched) {
      const nextPosition = getNextAvailableGridPosition();
      if (nextPosition !== null) {
        console.log(`🎯 Double-click assign: ${item.id} to position ${nextPosition}`);
        assignItemToGrid(item as BacklogItem, nextPosition);
        markItemAsUsed(item.id, true);
      }
    }
  }, [isMatched, getNextAvailableGridPosition, assignItemToGrid, markItemAsUsed, item]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isMatched) return;

    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    });
  }, [isMatched]);

  const handleRemoveItem = useCallback(() => {
    console.log(`🗑️ Removing item ${item.id} from group ${groupId}`);
    removeItemFromGroup(groupId, item.id);
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  }, [groupId, item.id, removeItemFromGroup]);

  const handleToggleCompare = useCallback(() => {
    if (isInCompareList) {
      removeFromComparison(item.id);
    } else {
      addToComparison(item as any);
    }
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  }, [isInCompareList, addToComparison, removeFromComparison, item]);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
  }, []);

  // Get title
  const title = item.title || item.name || '';

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...(!isMatched ? listeners : {})}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={`
          relative aspect-square rounded-lg overflow-hidden
          bg-gray-800 border-2
          transition-all
          ${isMatched
            ? 'opacity-50 cursor-not-allowed border-green-500/50'
            : isDragging
              ? 'opacity-50 border-cyan-400'
              : isSelected
                ? 'border-cyan-500 shadow-lg shadow-cyan-500/50'
                : isInCompareList
                  ? 'border-purple-500'
                  : 'border-gray-700 cursor-grab active:cursor-grabbing hover:border-cyan-500'
          }
        `}
      >
        {/* Image */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <span className="text-xs text-gray-500">No Image</span>
          </div>
        )}

        {/* Status indicators */}
        <div className="absolute top-1 right-1 flex gap-1">
          {isMatched && (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          {isInCompareList && (
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
              <GitCompare className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
          <p className="text-[10px] font-semibold text-white truncate">
            {title}
          </p>
        </div>

        {/* Selected indicator */}
        {isSelected && !isMatched && (
          <div className="absolute inset-0 border-2 border-cyan-400 pointer-events-none" />
        )}
      </div>

      {/* Context Menu */}
      <SimpleContextMenu
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
