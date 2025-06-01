"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Trophy, Grid3X3, LayoutGrid, ChevronDown } from "lucide-react";
import { useState } from "react";
import MatchGridPodium from "./MatchGridPodium";
import MatchGridStandard from "./MatchGridStandard";

interface MatchGridProps {
  isDragging: boolean;
}

type AddingMode = 'start' | 'anywhere' | 'end';

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
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number>(-1);
  
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
    return gridItems.slice(0, maxItems);
  };

  const canAddAtPosition = (position: number): boolean => {
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

  // Create filtered grid items with placeholder for dragged item
  const getDisplayGridItems = () => {
    let items = getFilteredGridItems();
    
    // If we're dragging an item from the grid, show a placeholder
    if (draggedItem && draggedFromIndex !== -1) {
      items = [...items];
      items[draggedFromIndex] = {
        ...items[draggedFromIndex],
        isDragPlaceholder: true
      };
    }
    
    return items;
  };

  const filteredGridItems = getDisplayGridItems();

  return (
    <div 
      className="rounded-2xl overflow-hidden w-full max-w-none"
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
        border: '2px solid rgba(71, 85, 105, 0.3)',
        boxShadow: `
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 20px 25px -5px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(148, 163, 184, 0.1)
        `
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4 border-b"
        style={{
          borderColor: 'rgba(71, 85, 105, 0.5)',
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 100%
            )
          `
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `
                  linear-gradient(135deg, 
                    #4c1d95 0%, 
                    #7c3aed 50%,
                    #3b82f6 100%
                  )
                `,
                boxShadow: `
                  0 4px 14px 0 rgba(124, 58, 237, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `
              }}
            >
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 
                className="text-xl font-black tracking-tight"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      #f1f5f9 0%, 
                      #cbd5e1 50%, 
                      #f8fafc 100%
                    )
                  `,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Top {maxItems} Rankings
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                {selectedBacklogItem ? 'Click a position to assign' : 'Drag to reorder or click to remove'}
              </p>
            </div>
          </div>

          {/* Center - Adding Mode Controls */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-medium mr-2 uppercase tracking-wider">
              Adding Mode
            </span>
            {(['start', 'anywhere', 'end'] as AddingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAddingMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  addingMode === mode 
                    ? 'text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={addingMode === mode ? {
                  background: `
                    linear-gradient(135deg, 
                      rgba(59, 130, 246, 0.8) 0%,
                      rgba(147, 51, 234, 0.8) 100%
                    )
                  `,
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                } : {
                  background: 'rgba(51, 65, 85, 0.3)',
                  border: '1px solid rgba(71, 85, 105, 0.3)'
                }}
              >
                {mode === 'start' && 'From Start'}
                {mode === 'anywhere' && 'Anywhere'}
                {mode === 'end' && 'From End'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Items Count Selector */}
            <div className="relative">
              <select
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
                className="appearance-none pr-8 pl-3 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all duration-200 focus:outline-none text-slate-200"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(30, 41, 59, 0.9) 0%,
                      rgba(51, 65, 85, 0.95) 100%
                    )
                  `,
                  border: '1.5px solid rgba(71, 85, 105, 0.4)',
                  boxShadow: `
                    0 2px 4px rgba(0, 0, 0, 0.2),
                    inset 0 1px 0 rgba(148, 163, 184, 0.1)
                  `
                }}
              >
                <option value={10} className="bg-slate-800 text-slate-200">Top 10</option>
                <option value={20} className="bg-slate-800 text-slate-200">Top 20</option>
                <option value={50} className="bg-slate-800 text-slate-200">Top 50</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div 
              className="flex items-center rounded-lg overflow-hidden"
              style={{
                border: '1px solid rgba(71, 85, 105, 0.4)',
                background: 'rgba(30, 41, 59, 0.5)'
              }}
            >
              <button
                onClick={() => setViewMode('standard')}
                className={`p-2 transition-all duration-200 ${
                  viewMode === 'standard' 
                    ? 'text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={viewMode === 'standard' ? {
                  background: `
                    linear-gradient(135deg, 
                      rgba(59, 130, 246, 0.8) 0%,
                      rgba(147, 51, 234, 0.8) 100%
                    )
                  `
                } : {}}
                title="Standard Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('podium')}
                className={`p-2 transition-all duration-200 ${
                  viewMode === 'podium' 
                    ? 'text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={viewMode === 'podium' ? {
                  background: `
                    linear-gradient(135deg, 
                      rgba(59, 130, 246, 0.8) 0%,
                      rgba(147, 51, 234, 0.8) 100%
                    )
                  `
                } : {}}
                title="Podium View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Items Count Badge */}
            <div 
              className="px-4 py-2 rounded-full text-sm font-bold tracking-wide"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(59, 130, 246, 0.2) 0%,
                    rgba(147, 51, 234, 0.2) 100%
                  )
                `,
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd'
              }}
            >
              <span className="relative z-10">{filteredGridItems.filter(item => item.matched).length}</span>
              <span className="opacity-60 mx-1">/</span>
              <span className="opacity-80">{maxItems}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid */}
      <div 
        ref={setNodeRef}
        className="p-4 lg:p-6 3xl:p-8 min-h-[600px] transition-all duration-300"
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
            maxItems={maxItems}
            canAddAtPosition={canAddAtPosition}
            /> : 
          <MatchGridPodium
            gridItems={filteredGridItems}
            selectedBacklogItem={selectedBacklogItem}
            selectedGridItem={selectedGridItem}
            handleGridItemClick={handleGridItemClick}
            maxItems={maxItems}
            canAddAtPosition={canAddAtPosition}
          />}
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
                `
              }}
            >
              <Trophy className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-200">
              Start Building Your Rankings
            </h3>
            <p className="text-sm max-w-md text-slate-400">
              Drag legendary items from the collection to create your ultimate top {maxItems} greatest of all time list
            </p>
          </div>
        )}
      </div>
    </div>
  );
}