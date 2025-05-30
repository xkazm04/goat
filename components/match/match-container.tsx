"use client";

import { useMatchStore } from "@/stores/match-store";
import { MatchGrid } from "./match-grid";
import { BacklogGroups } from "./backlog-groups";
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { motion } from "framer-motion";

export function MatchContainer() {
  const { setActiveItem, handleDragEnd, selectedBacklogItem, setSelectedBacklogItem } = useMatchStore();
  const [isDragging, setIsDragging] = useState(false);
  
  // Configure sensors for mouse, touch, and keyboard interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        // Keyboard navigation logic
        return {
          x: 0,
          y: 0,
        };
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const { active } = event;
    setActiveItem(active.id.toString());
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const onDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    handleDragEnd(event);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Quick Tip</AlertTitle>
            <AlertDescription>
              You can match items by dragging them from the backlog to the grid, or by selecting a backlog item and then clicking on a grid item.
            </AlertDescription>
          </Alert>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 order-2 lg:order-1">
            <MatchGrid isDragging={isDragging} />
          </div>
          <div className="lg:col-span-4 order-1 lg:order-2">
            <BacklogGroups />
          </div>
        </div>
      </div>
    </DndContext>
  );
}