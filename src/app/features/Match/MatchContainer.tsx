"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
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
import { magneticCollision } from './MatchGrid/lib/magneticCollision';
import { FeatureModuleIndicator } from './components/FeatureModuleIndicator';
import { DragDistanceIndicator } from './components/DragDistanceIndicator';
import { QuickAssignModal } from './components/QuickAssignModal';

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
    isDraggingBacklogItem,
    gridItems
  } = useMatchGridState();

  // Track active modules for the feature indicator
  const [activeModules, setActiveModules] = useState<string[]>([]);

  // State for drag distance tracking
  const [dragDistance, setDragDistance] = useState(0);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // State for quick assign modal
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);

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
      // Shift + Number opens quick assign modal
      if (event.shiftKey && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(event.key)) {
        event.preventDefault();
        setShowQuickAssignModal(true);
        return;
      }

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

      // 'q' to toggle quick assign modal
      if (event.key === 'q' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowQuickAssignModal(!showQuickAssignModal);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMode, setKeyboardMode, selectedItemId, quickAssignToPosition, showQuickAssignModal]);

  // Create drag handlers using utilities
  const handleDragStart = useMemo(
    () => createDragStartHandler(setActiveItem),
    [setActiveItem]
  );

  const handleDragMove = useMemo(
    () => createDragMoveHandler((distance, delta) => {
      setDragDistance(distance);
    }),
    []
  );

  const handleDragEndWrapper = useMemo(
    () => createDragEndHandler((event) => {
      handleDragEnd(event);
      // Reset distance tracking
      setDragDistance(0);
      setDragTarget(null);
      setDragOverTarget(null);
    }, setActiveItem),
    [handleDragEnd, setActiveItem]
  );

  // Track which position is being hovered over
  const handleDragOver = (event: any) => {
    if (event.over && event.over.id) {
      setDragOverTarget(String(event.over.id));

      // Extract position number if it's a grid position
      const overId = String(event.over.id);
      if (overId.startsWith('grid-')) {
        const position = parseInt(overId.replace('grid-', ''));
        setDragTarget(position);
      }
    } else {
      setDragOverTarget(null);
      setDragTarget(null);
    }
  };

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
      collisionDetection={magneticCollision} // Use magnetic collision for snap behavior
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEndWrapper}
    >
      <div className="min-h-screen relative"> {/* Add relative positioning */}
        {/* Feature Module Indicator - Shows active components during operations */}
        <FeatureModuleIndicator activeModules={activeModules} />

        {/* Drag Distance Indicator */}
        <DragDistanceIndicator
          distance={dragDistance}
          isActive={!!activeItem}
          targetPosition={dragTarget}
        />

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

        {/* Quick Assign Modal */}
        <QuickAssignModal
          isOpen={showQuickAssignModal}
          onClose={() => setShowQuickAssignModal(false)}
          onAssign={(position) => {
            if (selectedItemId) {
              quickAssignToPosition(position + 1); // Convert 0-based to 1-based
            }
          }}
          maxPosition={currentList?.size || 50}
          currentFilledPositions={new Set(
            gridItems
              .map((item, index) => item.matched ? index : -1)
              .filter(index => index !== -1)
          )}
        />
      </div>

      {/* Enhanced Drag Overlay with Action Preview */}
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
          <div className="relative">
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

            {/* Action Preview Badge - PR#5 enhancement */}
            {dragTarget !== null && dragOverTarget && (
              <div
                className="absolute -bottom-2 -right-2 px-3 py-1.5 rounded-full shadow-lg"
                style={{
                  background: (() => {
                    // Determine action type and color
                    const targetItem = gridItems[dragTarget];
                    if (activeItem && typeof activeItem === 'string' && activeItem.startsWith('grid-')) {
                      // Grid to grid - moving or swapping
                      return targetItem?.matched
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' // Orange - swap
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; // Blue - move
                    } else {
                      // Backlog to grid - adding
                      return targetItem?.matched
                        ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' // Orange - swap
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green - add
                    }
                  })(),
                  pointerEvents: 'none',
                }}
              >
                <div className="flex items-center gap-1.5 text-white">
                  {/* Icon */}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {(() => {
                      const targetItem = gridItems[dragTarget];
                      const isSwap = targetItem?.matched;

                      if (activeItem && typeof activeItem === 'string' && activeItem.startsWith('grid-')) {
                        return isSwap ? (
                          // Swap icon
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        ) : (
                          // Move icon
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        );
                      } else {
                        return isSwap ? (
                          // Swap icon
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        ) : (
                          // Add icon
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        );
                      }
                    })()}
                  </svg>

                  {/* Text */}
                  <span className="text-xs font-bold">
                    {(() => {
                      const targetItem = gridItems[dragTarget];
                      const isSwap = targetItem?.matched;

                      if (activeItem && typeof activeItem === 'string' && activeItem.startsWith('grid-')) {
                        return isSwap ? `Swap → #${dragTarget + 1}` : `Move → #${dragTarget + 1}`;
                      } else {
                        return isSwap ? `Swap → #${dragTarget + 1}` : `Add → #${dragTarget + 1}`;
                      }
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}