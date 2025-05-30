"use client";

import { useMatchStore } from "@/stores/match-store";
import { GridItem } from "./grid-item";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'grid-droppable',
  });

  const handleGridItemClick = (id: string) => {
    if (selectedBacklogItem) {
      setSelectedGridItem(id);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Top 50 Ranked Items</h2>
        <span className="text-sm text-muted-foreground">
          {gridItems.length} of 50 items
        </span>
      </div>
      
      <div 
        ref={setNodeRef}
        className={cn(
          "min-h-[400px] p-4 rounded-md transition-colors",
          isOver && "bg-muted/50",
          isDragging && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <SortableContext 
          items={gridItems.map(item => item.id)} 
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gridItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                layout
              >
                <GridItem 
                  item={item} 
                  index={index} 
                  onClick={() => handleGridItemClick(item.id)}
                  isSelected={selectedGridItem === item.id}
                />
              </motion.div>
            ))}
            
            {gridItems.length === 0 && (
              <div className="col-span-full flex items-center justify-center h-60 text-muted-foreground italic">
                Drag items here to rank them
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}