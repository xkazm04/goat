"use client";

import { useState } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SimpleCollectionPanel } from "./SimpleCollectionPanel";
import { SimpleDropZone } from "./SimpleDropZone";
import { MOCK_COLLECTIONS } from "./mockData";
import { CollectionItem } from "./types";

interface GridSlot {
  position: number;
  item: CollectionItem | null;
}

/**
 * Minimal integrated Match Grid + Collection
 * Pure drag and drop functionality - no complexity
 */
export function SimpleMatchGrid() {
  // Simple state: 10 grid slots
  const [gridSlots, setGridSlots] = useState<GridSlot[]>(
    Array.from({ length: 10 }, (_, i) => ({ position: i, item: null }))
  );

  const [activeItem, setActiveItem] = useState<CollectionItem | null>(null);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveItem(null);

    if (!over) return;

    const itemData = active.data.current;
    const dropData = over.data.current;

    // Collection item dropped on grid slot
    if (itemData?.type === 'collection-item' && dropData?.type === 'grid-slot') {
      const position = dropData.position;
      const item = itemData.item;

      setGridSlots(prev => 
        prev.map(slot => 
          slot.position === position 
            ? { ...slot, item }
            : slot
        )
      );
    }
  };

  const handleRemove = (position: number) => {
    setGridSlots(prev =>
      prev.map(slot =>
        slot.position === position
          ? { ...slot, item: null }
          : slot
      )
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
          <h2 className="text-2xl font-bold text-white mb-6">Match Grid (Simple Test)</h2>
          
          {/* Top 3 Podium */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Top 3</h3>
            <div className="flex justify-center gap-4">
              {[1, 0, 2].map(pos => {
                const slot = gridSlots[pos];
                return (
                  <div key={pos} className="w-32">
                    <SimpleDropZone
                      position={pos}
                      isOccupied={!!slot.item}
                      occupiedBy={slot.item?.title}
                      onRemove={() => handleRemove(pos)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Positions 4-10 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Positions 4-10</h3>
            <div className="grid grid-cols-7 gap-3">
              {gridSlots.slice(3, 10).map(slot => (
                <SimpleDropZone
                  key={slot.position}
                  position={slot.position}
                  isOccupied={!!slot.item}
                  occupiedBy={slot.item?.title}
                  onRemove={() => handleRemove(slot.position)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Collection Panel - Directly below grid */}
        <SimpleCollectionPanel groups={MOCK_COLLECTIONS} />
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
  );
}
