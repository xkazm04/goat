"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import MatchContainerContent from './components/MatchContainerContent';
import { SimpleCollectionItem } from '../Collection/SimpleCollectionItem';
import { useMatchGridState } from './lib/useMatchGridState';
import {
  createDragStartHandler,
  createDragMoveHandler,
  createDragEndHandler,
  findActiveBacklogItem,
  findActiveItemGroupId
} from './MatchGrid/lib';
import { FeatureModuleIndicator } from './components/FeatureModuleIndicator';

export function MatchContainer() {
  // Use centralized state management hook
  const {
    activeItem,
    handleDragEnd,
    setActiveItem,
    selectedItemId,
    backlogGroups,
    initializeMatchSession,
    keyboardMode,
    setKeyboardMode,
    quickAssignToPosition,
    currentList,
    isDraggingBacklogItem
  } = useMatchGridState();

  // Track active modules for the feature indicator
  const [activeModules, setActiveModules] = useState<string[]>([]);

  // Update active modules based on current operations
  useEffect(() => {
    const modules = ['MatchContainer'];

    if (activeItem) {
      modules.push('MatchState', 'dragHandlers');

      if (isDraggingBacklogItem) {
        modules.push('MatchGrid', 'MatchControls', 'MatchEmptySlot');
      } else if (typeof activeItem === 'string' && activeItem.startsWith('grid-')) {
        modules.push('MatchGrid', 'MatchControls', 'MatchGridItem', 'sizeMapping');
      }

      modules.push('gridCalculations');
    }

    if (currentList) {
      modules.push('MatchGrid', 'MatchPodium', 'MatchGridSlot');
    }

    setActiveModules(modules);
  }, [activeItem, isDraggingBacklogItem, currentList]);
  
  // Optimized sensors for better drag experience and mobile support
  const sensors = useSensors(
    // Mouse sensor with delay to prevent accidental drags
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag (prevents accidental drags)
      },
    }),
    // Touch sensor for mobile with delay
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms delay for touch to differentiate from scrolling
        tolerance: 8, // 8px tolerance during delay
      },
    }),
    // Pointer sensor as fallback
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
        if (selectedItemId) {
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
  }, [keyboardMode, setKeyboardMode, selectedItemId, quickAssignToPosition]);

  // Create drag handlers using utilities
  const handleDragStart = useMemo(
    () => createDragStartHandler(setActiveItem),
    [setActiveItem]
  );

  const handleDragMove = useMemo(
    () => createDragMoveHandler(),
    []
  );

  const handleDragEndWrapper = useMemo(
    () => createDragEndHandler(handleDragEnd, setActiveItem),
    [handleDragEnd, setActiveItem]
  );

  // Use utility functions for finding active items
  const activeBacklogItem = useMemo(
    () => findActiveBacklogItem(activeItem, backlogGroups),
    [activeItem, backlogGroups]
  );

  const activeItemGroupId = useMemo(
    () => findActiveItemGroupId(activeItem, activeBacklogItem, backlogGroups),
    [activeItem, activeBacklogItem, backlogGroups]
  );

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
      collisionDetection={closestCenter} // Use closestCenter for better accuracy
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEndWrapper}
    >
      <div className="min-h-screen relative"> {/* Add relative positioning */}
        {/* Feature Module Indicator - Shows active components during operations */}
        <FeatureModuleIndicator activeModules={activeModules} />

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
          zIndex: 1000,
        }}
      >
        {activeBacklogItem && (
          <div
            className="rotate-6 scale-110"
            style={{
              filter: 'drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6))',
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          >

            <SimpleCollectionItem
              item={{
                ...activeBacklogItem,
                // Ensure we have normalized properties for the CollectionItem
                id: activeBacklogItem.id,
                title: activeBacklogItem.title || activeBacklogItem.name || '',
                description: activeBacklogItem.description || '',
                image_url: activeBacklogItem.image_url || null
              }}
              groupId={activeItemGroupId}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}