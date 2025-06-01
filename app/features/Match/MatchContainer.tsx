"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { MatchGrid } from "./MatchGrid";
import { BacklogGroups } from "./BacklogGroups";
import { DndContext, DragEndEvent, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from "react";
import { Crown, Target } from "lucide-react";
import { motion } from "framer-motion";

export function MatchContainer() {
  const { setActiveItem, handleDragEnd } = useMatchStore();
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const { active } = event;
    setActiveItem(active.id.toString());
  };

  const onDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    handleDragEnd(event);
  };

  return (
    <div
      className="min-h-screen p-6 bg-gray-700/30 border border-gray-300/40 rounded-xl"
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-row justify-between items-center gap-4 mb-2">
            <div>
              <h1
                className="text-4xl font-black tracking-tight"
              >
                G.O.A.T. Ranking
              </h1>
              <p
                className="text-lg text-yellow-100"
              >
                Build your ultimate top 50 greatest of all time
              </p>
            </div>
            <div
              className="flex items-center text-gray-400 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
            >
              <Target className="w-4 h-4" />
              <span>Drag items to the ranking grid or select and click to match</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <motion.div
            className="xl:col-span-9 order-2 xl:order-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MatchGrid isDragging={isDragging} />
          </motion.div>

          <motion.div
            className="xl:col-span-3 order-1 xl:order-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <BacklogGroups />
          </motion.div>
        </div>
      </DndContext>
    </div>
  );
}