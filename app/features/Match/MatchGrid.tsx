"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Trophy, Grid3X3, LayoutGrid } from "lucide-react";
import { useState } from "react";
import MatchGridPodium from "./MatchGridPodium";
import MatchGridStandard from "./MatchGridStandard";

interface MatchGridProps {
  isDragging: boolean;
}

export function MatchGrid({ isDragging }: MatchGridProps) {
  const { 
    gridItems, 
    setSelectedGridItem, 
    selectedBacklogItem, 
    selectedGridItem 
  } = useMatchStore();
  
  const [viewMode, setViewMode] = useState<'standard' | 'podium'>('standard');
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'grid-droppable',
  });

  const handleGridItemClick = (id: string) => {
    if (selectedBacklogItem) {
      setSelectedGridItem(id);
    } else {
      // If no backlog item selected, allow unassigning
      setSelectedGridItem(id);
    }
  };

 

  return (
    <div 
      className="rounded-2xl overflow-hidden w-full max-w-none"
    >
      {/* Header */}
      <div 
        className="px-6 py-4 border-b"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy 
              className="w-6 h-6" 
            />
            <div>
              <h2 
                className="text-xl font-bold"
              >
                Top 50 Rankings
              </h2>
              <p 
                className="text-sm"
              >
                {selectedBacklogItem ? 'Click a position to assign' : 'Click filled positions to remove'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('standard')}
                className={`p-2 transition-colors ${
                  viewMode === 'standard' 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-100'
                }`}
                title="Standard Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('podium')}
                className={`p-2 transition-colors ${
                  viewMode === 'podium' 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-gray-100'
                }`}
                title="Podium View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div 
              className="px-3 py-1 rounded-full text-sm font-medium"
            >
              {gridItems.filter(item => item.matched).length}/50
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div 
        ref={setNodeRef}
        className="p-4 lg:p-6 3xl:p-8 min-h-[600px] transition-all duration-300"
      >
        <SortableContext 
          items={gridItems.map(item => item.id)} 
          strategy={rectSortingStrategy}
        >
          {viewMode === 'standard' ? 
          <MatchGridStandard
            gridItems={gridItems}
            selectedBacklogItem={selectedBacklogItem}
            selectedGridItem={selectedGridItem}
            handleGridItemClick={handleGridItemClick}/> : 
          <MatchGridPodium
            gridItems={gridItems}
            selectedBacklogItem={selectedBacklogItem}
            selectedGridItem={selectedGridItem}
            handleGridItemClick={handleGridItemClick}
          />}
        </SortableContext>
        
        {gridItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Trophy 
              className="w-16 h-16 mb-4 opacity-20" 
            />
            <h3 
              className="text-xl font-semibold mb-2"
            >
              Start Building Your Rankings
            </h3>
            <p 
              className="text-sm max-w-md"
            >
              Drag legendary items from the collection to create your ultimate top 50 greatest of all time list
            </p>
          </div>
        )}
      </div>
    </div>
  );
}