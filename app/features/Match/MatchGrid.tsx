"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Trophy } from "lucide-react";
import { useState } from "react";
import MatchGridPodium from "./MatchGridPodium";
import MatchGridStandard from "./MatchGridStandard";
import MatchGridHeader from "./MatchGridHeader";

interface MatchGridProps {
  isDragging: boolean;
}

export type AddingMode = 'start' | 'anywhere' | 'end';

export function MatchGrid({ isDragging }: MatchGridProps) {
  const { 
    gridItems, 
    setSelectedGridItem, 
    selectedBacklogItem, 
    selectedGridItem,
    moveGridItem,
    removeItemFromGrid,
    assignItemToGrid,
    backlogGroups
  } = useMatchStore();
  
  const [viewMode, setViewMode] = useState<'standard' | 'podium'>('standard');
  const [maxItems, setMaxItems] = useState<number>(50);
  const [addingMode, setAddingMode] = useState<AddingMode>('anywhere');
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'grid-droppable',
  });

  const handleGridItemClick = (id: string) => {
    const position = parseInt(id.replace('grid-', ''));
    const gridItem = gridItems[position];
    
    if (selectedBacklogItem) {
      // Assign mode - assign backlog item to this position
      const selectedItem = backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === selectedBacklogItem);
      
      if (selectedItem && !selectedItem.matched) {
        assignItemToGrid(selectedItem, position);
      }
    } else if (gridItem?.matched) {
      // Remove mode - remove this item from grid
      removeItemFromGrid(position);
    }
  };

  const getFilteredGridItems = () => {
    // Ensure we never show more than 50 items, but respect the maxItems setting
    const actualMaxItems = Math.min(maxItems, 50);
    return gridItems.slice(0, actualMaxItems);
  };

  const canAddAtPosition = (position: number): boolean => {
    const actualMaxItems = Math.min(maxItems, 50);
    if (position >= actualMaxItems) return false;
    
    const matchedItems = gridItems.filter(item => item.matched).length;
    
    switch (addingMode) {
      case 'start':
        return position <= matchedItems;
      case 'end':
        return position >= matchedItems;
      case 'anywhere':
      default:
        return true;
    }
  };

  const filteredGridItems = getFilteredGridItems();

  return (
    <div 
      className="rounded-3xl border-2 overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95) 0%,
            rgba(30, 41, 59, 0.98) 25%,
            rgba(51, 65, 85, 0.95) 50%,
            rgba(30, 41, 59, 0.98) 75%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        borderColor: 'rgba(71, 85, 105, 0.5)',
        boxShadow: `
          0 0 0 1px rgba(71, 85, 105, 0.3),
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 20px 25px -5px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(148, 163, 184, 0.1)
        `
      }}
    >
      {/* Header */}
      <MatchGridHeader
        addingMode={addingMode}
        setAddingMode={setAddingMode}
        maxItems={Math.min(maxItems, 50)}
        setMaxItems={(count) => setMaxItems(Math.min(count, 50))}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filteredGridItems={filteredGridItems}
      />
      
      {/* Grid */}
      <div 
        ref={setNodeRef}
        className="p-4 lg:p-6 xl:p-8 2xl:p-10 min-h-[600px] transition-all duration-300"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(15, 23, 42, 0.7) 0%,
              rgba(30, 41, 59, 0.8) 100%
            )
          `
        }}
      >
        <SortableContext 
          items={filteredGridItems.map(item => item.id)} 
          strategy={rectSortingStrategy}
        >
          {viewMode === 'standard' ? 
            <MatchGridStandard
              gridItems={filteredGridItems}
              selectedBacklogItem={selectedBacklogItem}
              selectedGridItem={selectedGridItem}
              handleGridItemClick={handleGridItemClick}
              maxItems={Math.min(maxItems, 50)}
              canAddAtPosition={canAddAtPosition}
            /> : 
            <MatchGridPodium
              gridItems={filteredGridItems}
              selectedBacklogItem={selectedBacklogItem}
              selectedGridItem={selectedGridItem}
              handleGridItemClick={handleGridItemClick}
              maxItems={Math.min(maxItems, 50)}
              canAddAtPosition={canAddAtPosition}
            />
          }
        </SortableContext>
        
        {filteredGridItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(71, 85, 105, 0.2) 0%,
                    rgba(100, 116, 139, 0.2) 100%
                  )
                `,
                border: '2px dashed rgba(71, 85, 105, 0.5)'
              }}
            >
              <Trophy className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-200">
              Start Building Your Rankings
            </h3>
            <p className="text-sm max-w-md text-slate-400">
              Drag legendary items from the collection to create your ultimate top {Math.min(maxItems, 50)} greatest of all time list
            </p>
          </div>
        )}
      </div>
    </div>
  );
}