"use client";

import { useEffect, useState, useCallback } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SimpleCollectionPanel } from "./SimpleCollectionPanel";
import { SimpleDropZone } from "./SimpleDropZone";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";
import { CollectionItem } from "./types";
import { BacklogItem } from "@/types/backlog-groups";

/**
 * Integrated Match Grid + Collection with real data
 * Lightweight implementation with full feature set
 */
export function SimpleMatchGrid() {
  // Connect to stores
  const gridItems = useGridStore(state => state.gridItems);
  const maxGridSize = useGridStore(state => state.maxGridSize);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const removeItemFromGrid = useGridStore(state => state.removeItemFromGrid);
  const initializeGrid = useGridStore(state => state.initializeGrid);

  const groups = useBacklogStore(state => state.groups);
  const initializeGroups = useBacklogStore(state => state.initializeGroups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  const currentList = useCurrentList();

  const [activeItem, setActiveItem] = useState<CollectionItem | null>(null);

  // Initialize grid and backlog on mount
  useEffect(() => {
    if (currentList?.category) {
      // Initialize grid with 50 slots (or use existing size)
      if (gridItems.length === 0) {
        initializeGrid(50, currentList.id, currentList.category);
      }

      // Initialize backlog groups
      initializeGroups(currentList.category, currentList.subcategory);
    }
  }, [currentList?.category, currentList?.subcategory, currentList?.id]);

  // Simple sensor - just pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Very responsive
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const itemData = active.data.current;

    if (itemData?.type === 'collection-item') {
      setActiveItem(itemData.item);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveItem(null);

    if (!over) return;

    const itemData = active.data.current;
    const dropData = over.data.current;

    // Collection item dropped on grid slot
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item: BacklogItem = itemData.item;

      console.log(`🎯 Dropping item ${item.id} at position ${position}`);

      // Assign to grid (grid-store handles validation)
      assignItemToGrid(item, position);

      // Mark as used in backlog
      markItemAsUsed(item.id, true);
    }
  }, [assignItemToGrid, markItemAsUsed]);

  const handleRemove = useCallback((position: number) => {
    const item = gridItems[position];

    if (item && item.backlogItemId) {
      console.log(`🗑️ Removing item from position ${position}`);

      // Remove from grid
      removeItemFromGrid(position);

      // Mark as unused in backlog
      markItemAsUsed(item.backlogItemId, false);
    }
  }, [gridItems, removeItemFromGrid, markItemAsUsed]);

  // Get the display title for a grid item
  const getItemTitle = (item: any) => {
    return item.title || item.name || '';
  };

  // Render grid in sections
  const renderTopPodium = () => {
    const positions = [1, 0, 2]; // 2nd, 1st, 3rd place
    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Top 3</h3>
        <div className="flex justify-center gap-4">
          {positions.map(pos => {
            const item = gridItems[pos];
            const isOccupied = item && item.matched;
            return (
              <div key={pos} className="w-32">
                <SimpleDropZone
                  position={pos}
                  isOccupied={!!isOccupied}
                  occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                  imageUrl={isOccupied ? item.image_url : undefined}
                  onRemove={() => handleRemove(pos)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGrid = (startPos: number, endPos: number, cols: number, title: string) => {
    const items = gridItems.slice(startPos, endPos);
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">{title}</h3>
        <div className={`grid grid-cols-${cols} gap-3`}>
          {items.map((item, idx) => {
            const position = startPos + idx;
            const isOccupied = item && item.matched;
            return (
              <SimpleDropZone
                key={position}
                position={position}
                isOccupied={!!isOccupied}
                occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                imageUrl={isOccupied ? item.image_url : undefined}
                onRemove={() => handleRemove(position)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Grid Area */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {currentList?.name || 'Match Grid'}
          </h2>

          {/* Top 3 Podium */}
          {renderTopPodium()}

          {/* Positions 4-10 */}
          {renderGrid(3, 10, 7, 'Positions 4-10')}

          {/* Positions 11-20 */}
          {gridItems.length > 10 && renderGrid(10, 20, 10, 'Positions 11-20')}

          {/* Positions 21+ */}
          {gridItems.length > 20 && renderGrid(20, Math.min(gridItems.length, 50), 10, 'Positions 21+')}
        </div>

        {/* Collection Panel - Directly below grid */}
        <SimpleCollectionPanel groups={groups} />
      </div>

      {/* Drag Overlay - Minimal */}
      <DragOverlay>
        {activeItem && (
          <div className="w-24 h-24 rounded-lg overflow-hidden shadow-2xl opacity-90">
            {activeItem.image_url ? (
              <img
                src={activeItem.image_url}
                alt={activeItem.title || activeItem.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-400">{activeItem.title || activeItem.name}</span>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
