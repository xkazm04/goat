"use client";

import { useState, useCallback, useEffect } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CollectionPanel, backlogGroupsToCollectionGroups } from "../../Collection";
import { SimpleDropZone } from "./SimpleDropZone";
import { CollectionItem } from "../../Collection/types";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { useGridStore } from "@/stores/grid-store";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";
import { MatchGridTutorial, useTutorialState } from "./MatchGridTutorial";

/**
 * Integrated Match Grid + Collection with real data
 * Lightweight implementation with full feature set + swap functionality
 */
export function SimpleMatchGrid() {
  // Connect to stores
  const gridItems = useGridStore(state => state.gridItems);
  const maxGridSize = useGridStore(state => state.maxGridSize);
  const assignItemToGrid = useGridStore(state => state.assignItemToGrid);
  const removeItemFromGrid = useGridStore(state => state.removeItemFromGrid);
  const moveGridItem = useGridStore(state => state.moveGridItem);
  const initializeGrid = useGridStore(state => state.initializeGrid);
  const loadTutorialData = useGridStore(state => state.loadTutorialData);

  const groups = useBacklogStore(state => state.groups);
  const initializeGroups = useBacklogStore(state => state.initializeGroups);
  const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

  const currentList = useCurrentList();

  const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
  const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

  // Tutorial state
  const { showTutorial, completeTutorial } = useTutorialState();

  // Handle demo data from tutorial
  const handleDemoDataReady = useCallback((demoBacklog: BacklogItem[], demoGrid: GridItemType[]) => {
    console.log("🎓 Loading tutorial demo data", { demoBacklog, demoGrid });
    loadTutorialData(demoGrid);
  }, [loadTutorialData]);

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
      setActiveType('collection');
    } else if (itemData?.type === 'grid-item') {
      setActiveItem(itemData.item);
      setActiveType('grid');
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveItem(null);
    setActiveType(null);

    if (!over) return;

    const itemData = active.data.current;
    const dropData = over.data.current;

    // Case 1: Collection item dropped on grid slot
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item: BacklogItem = itemData.item;

      console.log(`🎯 Dropping collection item ${item.id} at position ${position}`);

      // Assign to grid (grid-store handles validation)
      assignItemToGrid(item, position);

      // Mark as used in backlog
      markItemAsUsed(item.id, true);
    }

    // Case 2: Grid item dropped on another grid slot (SWAP)
    if (itemData?.type === 'grid-item' && dropData?.type === 'grid-slot') {
      const fromPosition = itemData.position;
      const toPosition = dropData.position;

      // Don't do anything if dropping on same position
      if (fromPosition === toPosition) return;

      console.log(`🔄 Swapping items: position ${fromPosition} ↔ position ${toPosition}`);

      // Use the moveGridItem function which handles swapping
      moveGridItem(fromPosition, toPosition);
    }
  }, [assignItemToGrid, markItemAsUsed, moveGridItem]);

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

  return (
    <>
      {/* Tutorial Modal */}
      <MatchGridTutorial
        isOpen={showTutorial}
        onComplete={completeTutorial}
        onDemoDataReady={handleDemoDataReady}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-72" data-testid="match-grid-container">
        {/* Grid Area */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Match Grid (Simple Test)</h2>
          
          {/* Top 3 Podium */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Top 3</h3>
            <div className="flex justify-center gap-4">
              {[1, 0, 2].map(pos => {
                const item = gridItems[pos];
                const isOccupied = item && item.matched;
                return (
                  <div key={pos} className="w-32">
                    <SimpleDropZone
                      position={pos}
                      isOccupied={!!isOccupied}
                      occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                      imageUrl={isOccupied ? item.image_url : undefined}
                      gridItem={isOccupied ? item : undefined}
                      onRemove={() => handleRemove(pos)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Positions 4-10 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 4-10</h3>
            <div className="grid grid-cols-7 gap-3">
              {gridItems.slice(3, 10).map((item, idx) => {
                const position = 3 + idx;
                const isOccupied = item && item.matched;
                return (
                  <SimpleDropZone
                    key={position}
                    position={position}
                    isOccupied={!!isOccupied}
                    occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                    imageUrl={isOccupied ? item.image_url : undefined}
                    gridItem={isOccupied ? item : undefined}
                    onRemove={() => handleRemove(position)}
                  />
                );
              })}
            </div>
          </div>

          {/* Positions 11-20 */}
          {gridItems.length > 10 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 11-20</h3>
              <div className="grid grid-cols-10 gap-3">
                {gridItems.slice(10, 20).map((item, idx) => {
                  const position = 10 + idx;
                  const isOccupied = item && item.matched;
                  return (
                    <SimpleDropZone
                      key={position}
                      position={position}
                      isOccupied={!!isOccupied}
                      occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                      imageUrl={isOccupied ? item.image_url : undefined}
                      gridItem={isOccupied ? item : undefined}
                      onRemove={() => handleRemove(position)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Positions 21-30 */}
          {gridItems.length > 20 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 21-30</h3>
              <div className="grid grid-cols-10 gap-3">
                {gridItems.slice(20, 30).map((item, idx) => {
                  const position = 20 + idx;
                  const isOccupied = item && item.matched;
                  return (
                    <SimpleDropZone
                      key={position}
                      position={position}
                      isOccupied={!!isOccupied}
                      occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                      imageUrl={isOccupied ? item.image_url : undefined}
                      gridItem={isOccupied ? item : undefined}
                      onRemove={() => handleRemove(position)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Positions 31-40 */}
          {gridItems.length > 30 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 31-40</h3>
              <div className="grid grid-cols-10 gap-3">
                {gridItems.slice(30, 40).map((item, idx) => {
                  const position = 30 + idx;
                  const isOccupied = item && item.matched;
                  return (
                    <SimpleDropZone
                      key={position}
                      position={position}
                      isOccupied={!!isOccupied}
                      occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                      imageUrl={isOccupied ? item.image_url : undefined}
                      gridItem={isOccupied ? item : undefined}
                      onRemove={() => handleRemove(position)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Positions 41-50 */}
          {gridItems.length > 40 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 41-50</h3>
              <div className="grid grid-cols-10 gap-3">
                {gridItems.slice(40, 50).map((item, idx) => {
                  const position = 40 + idx;
                  const isOccupied = item && item.matched;
                  return (
                    <SimpleDropZone
                      key={position}
                      position={position}
                      isOccupied={!!isOccupied}
                      occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                      imageUrl={isOccupied ? item.image_url : undefined}
                      gridItem={isOccupied ? item : undefined}
                      onRemove={() => handleRemove(position)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Collection Panel - Fixed at bottom */}
        <CollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
      </div>

      {/* Drag Overlay - Minimal */}
      <DragOverlay>
        {activeItem && (
          <div className="w-24 h-24 rounded-lg overflow-hidden shadow-2xl opacity-90">
            {activeItem.image_url ? (
              <img
                src={activeItem.image_url}
                alt={activeItem.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-400">{activeItem.title}</span>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </>
  );
}
