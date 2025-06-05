"use client";

import { useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  DragStartEvent,
  DragMoveEvent 
} from '@dnd-kit/core';
import MatchContainerContent from './MatchContainerContent';
import { useItemStore } from '@/app/stores/item-store';
import { useMatchStore } from '@/app/stores/match-store';
import { useListStore } from '@/app/stores/use-list-store';
import { BacklogItem } from '../Backlog/BacklogItem';

export function MatchContainer() {
  const { 
    activeItem, 
    handleDragEnd, 
    setActiveItem,
    backlogGroups,
    selectedBacklogItem
  } = useItemStore();
  
  const { 
    initializeMatchSession, 
    keyboardMode, 
    setKeyboardMode,
    quickAssignToPosition 
  } = useMatchStore();
  
  const { currentList } = useListStore();
  
  // Enhanced sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Even more responsive
      },
    })
  );

  // Initialize match session when component mounts or list changes
  useEffect(() => {
    if (currentList) {
      initializeMatchSession();
    }
  }, [currentList, initializeMatchSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Enable keyboard mode when user starts using numbers
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(event.key)) {
        if (!keyboardMode) {
          setKeyboardMode(true);
        }
        
        // Only assign if there's a selected backlog item
        if (selectedBacklogItem) {
          event.preventDefault();
          const position = event.key === '0' ? 10 : parseInt(event.key);
          quickAssignToPosition(position);
        }
      }
      
      // Escape to exit keyboard mode
      if (event.key === 'Escape') {
        setKeyboardMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMode, setKeyboardMode, selectedBacklogItem, quickAssignToPosition]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.id.toString());
  };

  // Handle drag move for better feedback
  const handleDragMove = (event: DragMoveEvent) => {
    // This ensures smooth dragging outside containers
  };

  // Handle drag end
  const handleDragEndWrapper = (event: DragEndEvent) => {
    handleDragEnd(event);
    setActiveItem(null);
  };

  // Get the active dragged item for overlay
  const activeBacklogItem = activeItem 
    ? backlogGroups
        .flatMap(group => group.items)
        .find(item => item.id === activeItem)
    : null;

  if (!currentList) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">No List Selected</h2>
          <p className="text-slate-400">Please create or select a list to start ranking.</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEndWrapper}
    >
      <div className="min-h-screen relative"> {/* Add relative positioning */}
        {/* Keyboard Mode Indicator */}
        {keyboardMode && (
          <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="text-sm font-semibold">Keyboard Mode Active</div>
            <div className="text-xs opacity-90">
              Press 1-9 or 0 to assign to positions 1-10
            </div>
          </div>
        )}
        
        <MatchContainerContent />
      </div>
      
      {/* Enhanced Drag Overlay with Fixed Positioning */}
      <DragOverlay
        dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
        style={{
          cursor: 'grabbing',
          zIndex: 1000, // Ensure it's on top
        }}
      >
        {activeBacklogItem && (
          <div 
            className="rotate-6 scale-110"
            style={{
              filter: 'drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6))',
              transformOrigin: 'center',
              pointerEvents: 'none', // Prevent interference
            }}
          >
            <BacklogItem 
              item={activeBacklogItem} 
              isDragOverlay={true} 
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}