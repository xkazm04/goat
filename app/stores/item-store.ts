import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';
import { useBacklogStore } from './backlog-store';
import { BacklogItem } from '@/app/types/backlog-groups';
import { GridItemType } from '@/app/types/match';

export const useItemStore = () => {
  const sessionStore = useSessionStore();
  const gridStore = useGridStore();
  const comparisonStore = useComparisonStore();
  const backlogStore = useBacklogStore();

  // Function to convert BacklogItem to GridItemType
  const convertToGridItem = (item: BacklogItem | any, position: number): GridItemType => {
    return {
      id: `grid-${position}`,
      title: item.name || item.title || '',
      description: item.description || '',
      position: position,
      matched: true,
      backlogItemId: item.id,
      tags: item.tags || [],
      isDragPlaceholder: false,
      image_url: item.image_url || null
    };
  };

  // Function to safely assign item to grid with proper error handling
  const assignItemToGrid = (item: BacklogItem | any, position: number) => {
    try {
      // First check if the position is valid
      if (!gridStore.canAddAtPosition(position)) {
        console.error(`Cannot add item to position ${position} - position not available`);
        return;
      }

      // Convert item to grid format
      const gridItem = convertToGridItem(item, position);
      
      console.log(`🔄 ItemStore: Assigning item to grid`, {
        itemId: item.id,
        position,
        hasImageUrl: !!item.image_url
      });

      // Assign to grid
      gridStore.assignItemToGrid(gridItem, position);
      
      // Mark the item as used in backlog
      backlogStore.markItemAsUsed(item.id, true);
      
      // Clear selection after assignment
      backlogStore.selectItem(null);
    } catch (error) {
      console.error('Error assigning item to grid:', error);
    }
  };

  return {
    // Backlog data (now from backlog store)
    backlogGroups: backlogStore.groups,
    selectedBacklogItem: backlogStore.selectedItemId,

    // Grid data
    gridItems: gridStore.gridItems,
    maxGridSize: gridStore.maxGridSize,
    selectedGridItem: gridStore.selectedGridItem,
    activeItem: gridStore.activeItem || backlogStore.activeItemId,

    // Comparison data
    comparison: {
      isOpen: comparisonStore.isComparisonOpen,
      items: comparisonStore.items,
      selectedForComparison: comparisonStore.selectedForComparison,
      comparisonMode: comparisonStore.comparisonMode
    },

    // Session actions
    createSession: sessionStore.createSession,
    switchToSession: sessionStore.switchToSession,
    saveCurrentSession: sessionStore.saveCurrentSession,
    loadSession: sessionStore.loadSession,
    deleteSession: sessionStore.deleteSession,
    syncWithList: sessionStore.syncWithList,

    // Enhanced backlog actions - use backlog store
    initializeBacklogData: (category: string, subcategory?: string) =>
      backlogStore.initializeGroups(category, subcategory),
    toggleBacklogGroup: (groupId: string) => backlogStore.selectGroup(
      backlogStore.selectedGroupId === groupId ? null : groupId
    ),
    addItemToGroup: backlogStore.addItemToGroup,
    removeItemFromGroup: (groupId: string, itemId: string) => {
      try {
        // Log item ID for debugging
        console.log(`🗑️ ItemStore: Removing item ${itemId} from group ${groupId}`);
        
        // First check if this item is in the grid
        const gridItems = gridStore.gridItems;
        const gridItemIndex = gridItems.findIndex(item => item.backlogItemId === itemId);
        
        // If found in grid, remove it from there first
        if (gridItemIndex !== -1) {
          console.log(`🗑️ ItemStore: Item ${itemId} found in grid at position ${gridItemIndex}, removing...`);
          gridStore.removeItemFromGrid(gridItemIndex);
        } else {
          console.log(`🗑️ ItemStore: Item ${itemId} not found in grid`);
        }
        
        // Now remove from backlog
        backlogStore.removeItemFromGroup(groupId, itemId);
      } catch (error) {
        console.error(`Error removing item ${itemId} from group ${groupId}:`, error);
      }
    },
    loadGroupItems: backlogStore.loadGroupItems,
    getGroupItems: backlogStore.getGroupItems,
    searchGroups: backlogStore.searchGroups,
    filterGroupsByCategory: backlogStore.filterGroupsByCategory,

    // Grid actions
    initializeGrid: gridStore.initializeGrid,
    assignItemToGrid,
    removeItemFromGrid: (position: number) => {
      // Get the item before removing it
      const item = gridStore.gridItems[position];
      if (item && item.backlogItemId) {
        // First remove from grid
        gridStore.removeItemFromGrid(position);
        
        // Then mark as unused in backlog
        backlogStore.markItemAsUsed(item.backlogItemId, false);
      } else {
        gridStore.removeItemFromGrid(position);
      }
    },
    moveGridItem: gridStore.moveGridItem,
    clearGrid: () => {
      // Get all matched items before clearing
      const matchedItems = gridStore.getMatchedItems();
      
      // Clear the grid
      gridStore.clearGrid();
      
      // Mark all items as unused in backlog
      matchedItems.forEach(item => {
        if (item.backlogItemId) {
          backlogStore.markItemAsUsed(item.backlogItemId, false);
        }
      });
    },

    // Selection actions
    setSelectedBacklogItem: (id: string | null) => backlogStore.selectItem(id),
    setSelectedGridItem: gridStore.setSelectedGridItem,
    setActiveItem: (id: string | null) => {
      if (id && id.startsWith('grid-')) {
        gridStore.setActiveItem(id);
        backlogStore.setActiveItem(null);
      } else {
        gridStore.setActiveItem(null);
        backlogStore.setActiveItem(id);
      }
    },

    // Compare actions
    toggleCompareItem: comparisonStore.toggleComparisonSelection,
    clearCompareList: comparisonStore.clearComparison,

    // Comparison actions
    openComparison: comparisonStore.openComparison,
    closeComparison: comparisonStore.closeComparison,
    addToComparison: comparisonStore.addToComparison,
    removeFromComparison: comparisonStore.removeFromComparison,
    toggleComparisonSelection: comparisonStore.toggleComparisonSelection,
    clearComparison: comparisonStore.clearComparison,
    setComparisonMode: comparisonStore.setComparisonMode,

    // FIXED: Drag & Drop with proper error handling
    handleDragEnd: (event: any) => {
      const { active, over } = event;

      if (!active || !over) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);

      console.log(`🔄 DragEnd: ${activeId} -> ${overId}`);

      // Grid item to grid position
      if (activeId.startsWith('grid-') && overId.startsWith('grid-')) {
        const fromPosition = parseInt(activeId.replace('grid-', ''));
        const toPosition = parseInt(overId.replace('grid-', ''));

        if (fromPosition !== toPosition) {
          gridStore.moveGridItem(fromPosition, toPosition);
        }
        return;
      }

      // Backlog item to grid position
      if (!activeId.startsWith('grid-') && overId.startsWith('grid-')) {
        const toPosition = parseInt(overId.replace('grid-', ''));

        // Verify the target position is valid and empty
        if (gridStore.canAddAtPosition(toPosition)) {
          // FIXED: Use backlog store's getItemById method
          const item = backlogStore.getItemById(activeId);

          if (item) {
            console.log(`🔄 ItemStore: Assigning backlog item ${activeId} to position ${toPosition}`, {
              id: item.id,
              title: item.name || item.title,
              hasImageUrl: !!item.image_url
            });

            // Use our assignItemToGrid method with proper tracking
            assignItemToGrid(item, toPosition);
            
            // Clear active item and selection
            gridStore.setActiveItem(null);
            backlogStore.setActiveItem(null);
            backlogStore.selectItem(null);
          } else {
            console.error(`❌ ItemStore: Could not find backlog item with ID ${activeId}`);
            
            // Try alternative approach - look through all available items
            const availableItems = getAvailableBacklogItems();
            const fallbackItem = availableItems.find(item => item.id === activeId);
            
            if (fallbackItem) {
              console.log(`🔄 ItemStore: Found item via fallback search, assigning to grid`);
              assignItemToGrid(fallbackItem, toPosition);
              
              // Clear active states
              gridStore.setActiveItem(null);
              backlogStore.setActiveItem(null);
              backlogStore.selectItem(null);
            } else {
              console.error(`❌ ItemStore: Item ${activeId} not found in available items either`);
            }
          }
        } else {
          console.log(`❌ ItemStore: Cannot add at position ${toPosition} - position not available`);
        }
      }
    },

    getAvailableBacklogItems: (): BacklogItem[] => {
      const allItems = backlogStore.groups
        .flatMap(group => Array.isArray(group.items) ? group.items : [])
        .filter(item => item && !item.used);
      
      console.log(`📋 ItemStore: Found ${allItems.length} available backlog items`);
      return allItems;
    },

    // Utilities
    getMatchedItems: gridStore.getMatchedItems,
    getNextAvailableGridPosition: gridStore.getNextAvailableGridPosition,
    canAddAtPosition: gridStore.canAddAtPosition,

    // Session utilities
    getSessionProgress: sessionStore.getSessionProgress,
    getAllSessions: sessionStore.getAllSessions,
    hasUnsavedChanges: sessionStore.hasUnsavedChanges,
    getSessionMetadata: sessionStore.getSessionMetadata,

    // Reset
    resetStore: () => {
      sessionStore.resetStore();
      gridStore.syncWithSession();
      comparisonStore.clearComparison();
      backlogStore.clearCache();
    },

    syncWithBackend: sessionStore.syncWithBackend
  };
};