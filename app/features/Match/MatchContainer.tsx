"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { MatchGrid } from "./MatchGrid";
import { BacklogGroups } from "./BacklogGroups";
import { ComparisonModal } from "./ComparisonModal";
import { DndContext, DragEndEvent, DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useEffect, useState } from "react";
import { Crown, Target, Keyboard, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { BacklogItem } from "./BacklogItem";

export function MatchContainer() {
  const { 
    setActiveItem, 
    handleDragEnd, 
    selectedBacklogItem, 
    backlogGroups,
    gridItems,
    assignItemToGrid,
    maxItems = 50,
    activeItem,
    compareList
  } = useMatchStore();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Keyboard shortcuts for quick assignment
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle number keys 1-9 and 0 (for position 10)
      const keyNumber = parseInt(event.key);
      
      if (isNaN(keyNumber) || keyNumber < 0 || keyNumber > 9) return;
      
      // Convert key to position (1-9 maps to 0-8, 0 maps to 9)
      const position = keyNumber === 0 ? 9 : keyNumber - 1;
      
      // Only proceed if we have a selected backlog item and position is valid
      if (!selectedBacklogItem || position >= maxItems) return;
      
      // Find the selected backlog item
      const selectedItem = backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === selectedBacklogItem);
      
      if (!selectedItem || selectedItem.matched) return;
      
      // Check if target position is empty or can be replaced
      const targetGridItem = gridItems[position];
      if (!targetGridItem || !targetGridItem.matched) {
        assignItemToGrid(selectedItem, position);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedBacklogItem, backlogGroups, gridItems, assignItemToGrid, maxItems]);

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const { active } = event;
    setActiveItem(active.id.toString());
    
    // Find the dragged item
    const item = backlogGroups
      .flatMap(group => group.items)
      .find(item => item.id === active.id);
    
    setDraggedItem(item);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setDraggedItem(null);
    handleDragEnd(event);
  };

  const getSelectedItemName = () => {
    if (!selectedBacklogItem) return null;
    const selectedItem = backlogGroups
      .flatMap(group => group.items)
      .find(item => item.id === selectedBacklogItem);
    return selectedItem?.title;
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
                className="text-4xl font-black tracking-tight text-white"
              >
                G.O.A.T. Ranking
              </h1>
              <p
                className="text-lg text-yellow-100"
              >
                Build your ultimate top 50 greatest of all time
              </p>
            </div>
            
            {/* Center - VS Button */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsComparisonModalOpen(true)}
                className="relative px-6 py-3 rounded-xl font-bold text-white transition-all duration-200 flex items-center gap-3"
                style={{
                  background: compareList.length > 0
                    ? `linear-gradient(135deg, 
                        rgba(59, 130, 246, 0.8) 0%,
                        rgba(147, 51, 234, 0.8) 100%
                      )`
                    : 'rgba(71, 85, 105, 0.5)',
                  border: compareList.length > 0
                    ? '2px solid rgba(59, 130, 246, 0.4)'
                    : '2px solid rgba(71, 85, 105, 0.4)',
                  boxShadow: compareList.length > 0
                    ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                    : 'none'
                }}
              >
                <Zap className="w-5 h-5" />
                <span className="text-lg">VS</span>
                {compareList.length > 0 && (
                  <div 
                    className="w-6 h-6 rounded-full bg-white text-blue-600 text-xs font-bold flex items-center justify-center"
                  >
                    {compareList.length}
                  </div>
                )}
              </motion.button>
            </div>
            
            {/* Instructions */}
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center text-gray-400 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.3)'
                }}
              >
                <Target className="w-4 h-4" />
                <span>Drag items to the ranking grid or select and click to match</span>
              </div>
              
              {selectedBacklogItem && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center text-blue-300 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <Keyboard className="w-4 h-4" />
                  <span>
                    Press <strong>1-9</strong> or <strong>0</strong> to assign "{getSelectedItemName()}" to positions 1-10
                  </span>
                </motion.div>
              )}
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

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {draggedItem ? (
            <div 
              className="transform rotate-3 scale-110"
              style={{
                filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5))'
              }}
            >
              <BacklogItem 
                item={draggedItem} 
                isDragOverlay={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        items={compareList}
      />
    </div>
  );
}