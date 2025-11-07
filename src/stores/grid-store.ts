import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GridItemType } from '@/types/match';
import { BacklogItem } from '@/types/backlog-groups';
import { DragEndEvent } from '@dnd-kit/core';
import { useSessionStore } from './session-store';

interface GridStoreState {
  // Core state
  gridItems: GridItemType[];
  maxGridSize: number;
  selectedGridItem: string | null;
  activeItem: string | null;
  isTutorialMode: boolean;

  // Actions - Grid setup
  initializeGrid: (size: number, listId?: string, category?: string) => void;
  syncWithSession: () => void;
  loadFromSession: (items: GridItemType[], size: number) => void;
  setTutorialMode: (enabled: boolean) => void;
  loadTutorialData: (items: GridItemType[]) => void;

  // Actions - Item placement
  assignItemToGrid: (item: BacklogItem | GridItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  removeItemByItemId: (itemId: string) => void;
  moveGridItem: (fromPosition: number, toPosition: number) => void;
  clearGrid: () => void;

  // Actions - Selection
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string | null) => void;

  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;

  // Utilities
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
}

export const useGridStore = create<GridStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      gridItems: [],
      maxGridSize: 50,
      selectedGridItem: null,
      activeItem: null,
      isTutorialMode: false,

      // Initialize a new grid
      initializeGrid: (size, listId, category) => {
        const emptyGridItems: GridItemType[] = Array.from({ length: size }, (_, i) => ({
          id: `grid-${i}`,
          title: '',
          description: '',
          position: i,
          matched: false,
          isDragPlaceholder: false,
          tags: []
        }));

        console.log(`🔄 GridStore: Initializing grid with ${size} positions`);

        set({
          gridItems: emptyGridItems,
          maxGridSize: size,
          selectedGridItem: null
        });

        // Save grid to session if listId provided
        if (listId) {
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(emptyGridItems);
          console.log(`🔄 GridStore: Grid initialized and saved to session ${listId}`);
        }
      },

      // Sync with session store
      syncWithSession: () => {
        const sessionStore = useSessionStore.getState();
        const activeSession = sessionStore.getActiveSession();

        if (activeSession && activeSession.gridItems) {
          set({
            gridItems: activeSession.gridItems,
            maxGridSize: activeSession.gridItems.length,
            selectedGridItem: null
          });
          console.log(`🔄 GridStore: Synced with session (${activeSession.gridItems.length} items)`);
        } else {
          console.log(`⚠️ GridStore: No session data found for sync`);
        }
      },

      // Load grid from session
      loadFromSession: (items, size) => {
        // Ensure items array has the right size
        const gridItems = [...items];
        if (gridItems.length < size) {
          // Add empty slots if needed
          const currentLength = gridItems.length;
          for (let i = currentLength; i < size; i++) {
            gridItems.push({
              id: `grid-${i}`,
              title: '',
              description: '',
              position: i,
              matched: false,
              isDragPlaceholder: false,
              tags: []
            });
          }
        } else if (gridItems.length > size) {
          // Trim if too large
          gridItems.length = size;
        }

        console.log(`🔄 GridStore: Loaded ${gridItems.length} items from session`);

        set({
          gridItems,
          maxGridSize: size,
          selectedGridItem: null
        });
      },

      // Place a backlog item in the grid
      assignItemToGrid: (item, position) => {
        set(state => {
          console.log(`🔄 GridStore: Assigning item to position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            console.warn(`⚠️ GridStore: Invalid position ${position}`);
            return state;
          }

          // Check if position is already filled
          if (newGridItems[position].matched) {
            console.warn(`⚠️ GridStore: Position ${position} already has an item`);
            return state;
          }

          // Convert item to GridItemType if it's a BacklogItem
          let gridItem: GridItemType;
          if ('matched' in item && 'position' in item) {
            // Item is already a GridItemType
            gridItem = {
              ...item as GridItemType,
              id: `grid-${position}`,
              position,
              matched: true,
              isDragPlaceholder: false
            };
          } else {
            // Item is a BacklogItem, convert it
            const backlogItem = item as BacklogItem;
            gridItem = {
              id: `grid-${position}`,
              title: backlogItem.name || backlogItem.title || '',
              description: backlogItem.description || '',
              position,
              matched: true,
              backlogItemId: backlogItem.id,
              tags: backlogItem.tags || [],
              isDragPlaceholder: false
            };
          }

          // Update the grid item at the specified position
          newGridItems[position] = gridItem;

          // Update session store if needed
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return { gridItems: newGridItems };
        });
      },
      // Remove an item from a grid position
      removeItemFromGrid: (position) => {
        set(state => {
          console.log(`🔄 GridStore: Removing item from position ${position}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if position is valid
          if (position < 0 || position >= newGridItems.length) {
            console.warn(`⚠️ GridStore: Invalid position ${position}`);
            return state;
          }

          // Reset the grid item at the specified position
          newGridItems[position] = {
            id: `grid-${position}`,
            title: '',
            description: '',
            position,
            matched: false,
            isDragPlaceholder: false,
            tags: []
          };

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            // Clear selection if the removed item was selected
            selectedGridItem: state.selectedGridItem === `grid-${position}` ? null : state.selectedGridItem
          };
        });
      },

      // Remove an item by the backlog item ID
      removeItemByItemId: (itemId) => {
        set(state => {
          console.log(`🔄 GridStore: Removing item by backlog ID ${itemId}`);

          const newGridItems = [...state.gridItems];
          let updated = false;

          // Find all grid items with this backlogItemId
          for (let i = 0; i < newGridItems.length; i++) {
            if (newGridItems[i].backlogItemId === itemId) {
              console.log(`✅ GridStore: Found item in position ${i}`);
              
              // Reset the grid item at the specified position
              newGridItems[i] = {
                id: `grid-${i}`,
                title: '',
                description: '',
                position: i,
                matched: false,
                isDragPlaceholder: false,
                tags: []
              };
              updated = true;
            }
          }

          if (!updated) {
            console.warn(`⚠️ GridStore: Item with ID ${itemId} not found in grid`);
            
            // Debug log to see what's in the grid
            console.log('Current grid items:', 
              state.gridItems
                .filter(item => item.matched)
                .map(item => ({ 
                  position: item.position, 
                  backlogItemId: item.backlogItemId,
                  title: item.title 
                }))
            );
            
            return state;
          }

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return {
            gridItems: newGridItems,
            // Clear selection if needed
            selectedGridItem: state.selectedGridItem && state.gridItems.find(
              item => item.id === state.selectedGridItem && item.backlogItemId === itemId
            ) ? null : state.selectedGridItem
          };
        });
      },

      // Move a grid item from one position to another
      moveGridItem: (fromPosition, toPosition) => {
        set(state => {
          console.log(`🔄 GridStore: Moving item from position ${fromPosition} to ${toPosition}`);

          // Create a copy of the grid items
          const newGridItems = [...state.gridItems];

          // Check if positions are valid
          if (
            fromPosition < 0 || fromPosition >= newGridItems.length ||
            toPosition < 0 || toPosition >= newGridItems.length
          ) {
            console.warn(`⚠️ GridStore: Invalid positions - from: ${fromPosition}, to: ${toPosition}`);
            return state;
          }

          // Check if source position has an item
          if (!newGridItems[fromPosition].matched) {
            console.warn(`⚠️ GridStore: No item at position ${fromPosition}`);
            return state;
          }

          // Get the item to move
          const itemToMove = { ...newGridItems[fromPosition] };

          // If target position already has an item, swap them
          if (newGridItems[toPosition].matched) {
            console.log(`🔄 GridStore: Swapping items at positions ${fromPosition} and ${toPosition}`);

            const targetItem = { ...newGridItems[toPosition] };

            // Update positions and IDs
            itemToMove.position = toPosition;
            itemToMove.id = `grid-${toPosition}`;
            targetItem.position = fromPosition;
            targetItem.id = `grid-${fromPosition}`;

            // Perform the swap
            newGridItems[fromPosition] = targetItem;
            newGridItems[toPosition] = itemToMove;
          } else {
            // Move the item to the empty target position
            itemToMove.position = toPosition;
            itemToMove.id = `grid-${toPosition}`;

            // Set the source position to empty
            newGridItems[fromPosition] = {
              id: `grid-${fromPosition}`,
              title: '',
              description: '',
              position: fromPosition,
              matched: false,
              isDragPlaceholder: false,
              tags: []
            };

            // Set the target position to the moved item
            newGridItems[toPosition] = itemToMove;
          }

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(newGridItems);

          return { gridItems: newGridItems };
        });
      },

      // Clear all items from the grid
      clearGrid: () => {
        set(state => {
          console.log(`🔄 GridStore: Clearing entire grid`);

          const emptyGridItems = state.gridItems.map((_, i) => ({
            id: `grid-${i}`,
            title: '',
            description: '',
            position: i,
            matched: false,
            isDragPlaceholder: false,
            tags: []
          }));

          // Update session store
          const sessionStore = useSessionStore.getState();
          sessionStore.updateSessionGridItems(emptyGridItems);

          return {
            gridItems: emptyGridItems,
            selectedGridItem: null
          };
        });
      },

      // Set the selected grid item
      setSelectedGridItem: (id) => set({ selectedGridItem: id }),

      // Set the active drag item
      setActiveItem: (id) => set({ activeItem: id }),

      // Handle drag end events
      handleDragEnd: (event) => {
        const { active, over } = event;
        
        if (!active || !over) {
          return;
        }
        
        const activeId = String(active.id);
        const overId = String(over.id);
        
        console.log(`🔄 GridStore: Drag end ${activeId} -> ${overId}`);
        
        // Grid item to grid position
        if (activeId.startsWith('grid-') && overId.startsWith('grid-')) {
          const fromPosition = parseInt(activeId.replace('grid-', ''));
          const toPosition = parseInt(overId.replace('grid-', ''));
          
          if (fromPosition !== toPosition) {
            get().moveGridItem(fromPosition, toPosition);
          }
          return;
        }
        
        // Backlog item to grid position
        if (!activeId.startsWith('grid-') && overId.startsWith('grid-')) {
          const toPosition = parseInt(overId.replace('grid-', ''));
          
          // Check if position is valid
          if (get().canAddAtPosition(toPosition)) {
            // Get the backlog item - use backlogStore to get item
            try {
              // Import on-demand to avoid circular dependencies
              const { useBacklogStore } = require('@/stores/backlog-store');
              const backlogStore = useBacklogStore.getState();
              const item = backlogStore.getItemById(activeId);
              
              if (item) {
                console.log(`🔄 GridStore: Found backlog item:`, {
                  id: item.id,
                  title: item.title || item.name,
                  hasImageUrl: !!item.image_url
                });
                
                // Create a grid item with all properties including image_url
                const gridItem: GridItemType = {
                  id: `grid-${toPosition}`,
                  title: item.title || item.name || '',
                  description: item.description || '',
                  position: toPosition,
                  matched: true,
                  backlogItemId: item.id,
                  tags: item.tags || [],
                  isDragPlaceholder: false,
                  image_url: item.image_url || null // Ensure image_url is preserved
                };
                
                // Assign the item to grid
                get().assignItemToGrid(gridItem, toPosition);
                
                // Mark item as used in backlog store
                backlogStore.markItemAsUsed(item.id, true);
              } else {
                console.warn(`⚠️ GridStore: Backlog item ${activeId} not found`);
              }
            } catch (error) {
              console.error(`❌ GridStore: Error adding backlog item to grid:`, error);
            }
          } else {
            console.warn(`⚠️ GridStore: Cannot add to position ${toPosition}`);
          }
        }
      },

      // Get all matched grid items
      getMatchedItems: () => {
        return get().gridItems.filter(item => item.matched);
      },

      // Find the next available grid position
      getNextAvailableGridPosition: () => {
        const { gridItems } = get();
        const emptyPosition = gridItems.findIndex(item => !item.matched);
        return emptyPosition !== -1 ? emptyPosition : null;
      },

      // Check if an item can be added at a specific position
      canAddAtPosition: (position) => {
        const { gridItems } = get();
        return (
          position >= 0 &&
          position < gridItems.length &&
          !gridItems[position].matched
        );
      },

      // Tutorial mode management
      setTutorialMode: (enabled) => {
        console.log(`🎓 GridStore: Tutorial mode ${enabled ? 'enabled' : 'disabled'}`);
        set({ isTutorialMode: enabled });
      },

      // Load tutorial demo data into grid
      loadTutorialData: (items) => {
        console.log(`🎓 GridStore: Loading ${items.length} tutorial items`);

        // Create a full grid with tutorial items at the start
        const tutorialGrid: GridItemType[] = Array.from({ length: 10 }, (_, i) => {
          const tutorialItem = items.find(item => item.position === i);
          if (tutorialItem) {
            return tutorialItem;
          }
          return {
            id: `grid-${i}`,
            title: '',
            description: '',
            position: i,
            matched: false,
            isDragPlaceholder: false,
            tags: []
          };
        });

        set({
          gridItems: tutorialGrid,
          maxGridSize: 10,
          isTutorialMode: true
        });
      }
    }),
    {
      name: 'grid-store',
      partialize: (state) => ({
        gridItems: state.gridItems,
        maxGridSize: state.maxGridSize
      })
    }
  )
);