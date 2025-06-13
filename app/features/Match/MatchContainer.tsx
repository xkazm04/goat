"use client";

import { useEffect, useMemo } from 'react';
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
import { useBacklogStore } from '@/app/stores/backlog-store';

export function MatchContainer() {
  // Use the store directly for activeItem to avoid recreating the object
  const activeItem = useItemStore(state => state.activeItem);
  const { handleDragEnd, setActiveItem } = useItemStore();
  const selectedBacklogItem = useBacklogStore(state => state.selectedItemId);
  
  // Get backlog groups directly from the backlog store
  const backlogGroups = useBacklogStore(state => state.groups);
  
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

  // Safely find the active dragged item for overlay
  const activeBacklogItem = useMemo(() => {
    if (!activeItem) return null;
    
    // First verify we have valid groups
    if (!backlogGroups || !Array.isArray(backlogGroups) || backlogGroups.length === 0) {
      return null;
    }
    
    // More robust flattening approach
    let allItems = [];
    
    // First try to collect items from all groups
    for (const group of backlogGroups) {
      if (Array.isArray(group.items)) {
        allItems.push(...group.items);
      }
    }
    
    // Filter out invalid items
    allItems = allItems.filter(item => item && item.id);
    
    // Find the active item
    const foundItem = allItems.find(item => item.id === activeItem);
    
    // Debug log for drag overlay
    if (foundItem) {
      console.log(`🔄 Found active item for drag overlay:`, {
        id: foundItem.id,
        title: foundItem.title || foundItem.name,
        hasImageUrl: !!foundItem.image_url,
        imageUrl: foundItem.image_url || 'NONE'
      });
      
      // Force image_url property if missing but found in item properties
      if (!foundItem.image_url && 'image_url' in foundItem) {
        console.log(`⚠️ image_url property exists but is null/undefined - item properties:`, 
          Object.keys(foundItem));
      }
    } else if (activeItem) {
      console.warn(`⚠️ Active item ${activeItem} not found in any group`);
    }
    
    return foundItem;
  }, [activeItem, backlogGroups]);

  // Find the backlog group ID for the active item (needed for BacklogItem component)
  const activeItemGroupId = useMemo(() => {
    if (!activeItem || !activeBacklogItem) return '';
    
    for (const group of backlogGroups || []) {
      if (Array.isArray(group.items) && group.items.some(item => item && item.id === activeItem)) {
        return group.id || '';
      }
    }
    return '';
  }, [activeItem, activeBacklogItem, backlogGroups]);

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
            
            <BacklogItem 
              item={{
                ...activeBacklogItem,
                // Ensure we have normalized properties for the BacklogItem
                id: activeBacklogItem.id,
                title: activeBacklogItem.title || activeBacklogItem.name || '',
                description: activeBacklogItem.description || '',
                matched: 'matched' in activeBacklogItem 
                  ? activeBacklogItem.matched 
                  : ('used' in activeBacklogItem ? activeBacklogItem.used : false),
                tags: activeBacklogItem.tags || [],
                // Force image_url to be passed properly
                image_url: activeBacklogItem.image_url || null
              }}
              groupId={activeItemGroupId}
              isDragOverlay={true} 
              size="medium"
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}