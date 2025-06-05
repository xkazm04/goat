import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DragEndEvent } from '@dnd-kit/core';
import { GridItemType, BacklogItemType, BacklogGroupType } from '@/app/types/match';
import { useListStore } from './use-list-store';

interface ItemStoreState {
  // Grid state
  gridItems: GridItemType[];
  maxGridSize: number;
  
  // Backlog state
  backlogGroups: BacklogGroupType[];
  
  // Selection state
  selectedBacklogItem: string | null;
  selectedGridItem: string | null;
  
  // Interaction state
  activeItem: string | null;
  compareList: BacklogItemType[];
  
  // List context
  currentListId: string | null;
  
  // Actions - Grid Management
  initializeGrid: (size: number, listId: string) => void;
  assignItemToGrid: (item: BacklogItemType, position: number) => void;
  removeItemFromGrid: (position: number) => void;
  moveGridItem: (fromIndex: number, toIndex: number) => void;
  clearGrid: () => void;
  
  // Actions - Backlog Management
  setBacklogGroups: (groups: BacklogGroupType[]) => void;
  toggleBacklogGroup: (groupId: string) => void;
  addItemToGroup: (groupId: string, title: string, description?: string) => Promise<void>;
  removeItemFromGroup: (itemId: string) => void;
  
  // Actions - Selection
  setSelectedBacklogItem: (id: string | null) => void;
  setSelectedGridItem: (id: string | null) => void;
  setActiveItem: (id: string | null) => void;
  
  // Actions - Compare List
  toggleCompareItem: (item: BacklogItemType) => void;
  clearCompareList: () => void;
  
  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Utilities
  getAvailableBacklogItems: () => BacklogItemType[];
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
  
  // Reset and sync
  resetStore: () => void;
  syncWithList: (listId: string) => void;
}

// Default backlog groups for different categories
const getDefaultBacklogGroups = (category: string): BacklogGroupType[] => {
  switch (category.toLowerCase()) {
    case 'sports':
      return [
        {
          id: 'basketball-legends',
          title: 'Basketball Legends',
          isOpen: true,
          items: [
            { id: 'mj-23', title: 'Michael Jordan', matched: false, tags: ['nba', 'chicago-bulls'] },
            { id: 'lebron-6', title: 'LeBron James', matched: false, tags: ['nba', 'cleveland', 'miami', 'lakers'] },
            { id: 'kobe-24', title: 'Kobe Bryant', matched: false, tags: ['nba', 'lakers'] },
            { id: 'magic-32', title: 'Magic Johnson', matched: false, tags: ['nba', 'lakers'] },
            { id: 'bird-33', title: 'Larry Bird', matched: false, tags: ['nba', 'celtics'] },
            { id: 'kareem-33', title: 'Kareem Abdul-Jabbar', matched: false, tags: ['nba', 'lakers', 'bucks'] },
          ]
        },
        {
          id: 'football-legends',
          title: 'Football Legends',
          isOpen: false,
          items: [
            { id: 'brady-12', title: 'Tom Brady', matched: false, tags: ['nfl', 'patriots', 'buccaneers'] },
            { id: 'montana-16', title: 'Joe Montana', matched: false, tags: ['nfl', '49ers'] },
            { id: 'manning-18', title: 'Peyton Manning', matched: false, tags: ['nfl', 'colts', 'broncos'] },
          ]
        }
      ];
    
    case 'games':
      return [
        {
          id: 'classic-games',
          title: 'Classic Video Games',
          isOpen: true,
          items: [
            { id: 'mario-bros', title: 'Super Mario Bros', matched: false, tags: ['nintendo', 'platformer'] },
            { id: 'zelda-1', title: 'The Legend of Zelda', matched: false, tags: ['nintendo', 'adventure'] },
            { id: 'tetris', title: 'Tetris', matched: false, tags: ['puzzle', 'classic'] },
            { id: 'pac-man', title: 'Pac-Man', matched: false, tags: ['arcade', 'classic'] },
            { id: 'space-invaders', title: 'Space Invaders', matched: false, tags: ['arcade', 'shooter'] },
          ]
        },
        {
          id: 'modern-games',
          title: 'Modern Masterpieces',
          isOpen: false,
          items: [
            { id: 'gta-5', title: 'Grand Theft Auto V', matched: false, tags: ['rockstar', 'open-world'] },
            { id: 'witcher-3', title: 'The Witcher 3', matched: false, tags: ['rpg', 'cd-projekt'] },
            { id: 'minecraft', title: 'Minecraft', matched: false, tags: ['sandbox', 'survival'] },
          ]
        }
      ];
    
    case 'music':
      return [
        {
          id: 'hip-hop-legends',
          title: 'Hip-Hop Legends',
          isOpen: true,
          items: [
            { id: 'tupac', title: '2Pac', matched: false, tags: ['west-coast', 'rap'] },
            { id: 'biggie', title: 'The Notorious B.I.G.', matched: false, tags: ['east-coast', 'rap'] },
            { id: 'jay-z', title: 'Jay-Z', matched: false, tags: ['east-coast', 'business'] },
            { id: 'eminem', title: 'Eminem', matched: false, tags: ['detroit', 'technical'] },
            { id: 'nas', title: 'Nas', matched: false, tags: ['queens', 'lyrical'] },
          ]
        },
        {
          id: 'rock-legends',
          title: 'Rock Legends',
          isOpen: false,
          items: [
            { id: 'beatles', title: 'The Beatles', matched: false, tags: ['british', '60s'] },
            { id: 'led-zeppelin', title: 'Led Zeppelin', matched: false, tags: ['hard-rock', '70s'] },
            { id: 'queen', title: 'Queen', matched: false, tags: ['arena-rock', 'freddie'] },
          ]
        }
      ];
    
    default:
      return [
        {
          id: 'general-items',
          title: 'Items',
          isOpen: true,
          items: []
        }
      ];
  }
};

export const useItemStore = create<ItemStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      gridItems: [],
      maxGridSize: 50,
      backlogGroups: [],
      selectedBacklogItem: null,
      selectedGridItem: null,
      activeItem: null,
      compareList: [],
      currentListId: null,

      // Grid Management
      initializeGrid: (size, listId) => {
        const gridItems = Array.from({ length: size }, (_, index) => ({
          id: `grid-${index}`,
          title: '',
          tags: [],
          matched: false,
        }));
        
        set({ 
          gridItems, 
          maxGridSize: size, 
          currentListId: listId,
          // Clear selections when initializing new grid
          selectedBacklogItem: null,
          selectedGridItem: null,
          activeItem: null
        });
      },

      assignItemToGrid: (item, position) => {
        const state = get();
        
        // Validate position
        if (position < 0 || position >= state.gridItems.length) {
          console.warn(`Invalid grid position: ${position}`);
          return;
        }
        
        // Check if position is already occupied
        if (state.gridItems[position].matched) {
          console.warn(`Grid position ${position} is already occupied`);
          return;
        }
        
        // Check if item is already matched
        if (item.matched) {
          console.warn(`Item ${item.id} is already matched`);
          return;
        }

        set((state) => {
          // Update backlog groups - mark item as matched
          const updatedBacklogGroups = state.backlogGroups.map(group => ({
            ...group,
            items: group.items.map(backlogItem =>
              backlogItem.id === item.id 
                ? { ...backlogItem, matched: true, matchedWith: `grid-${position}` }
                : backlogItem
            )
          }));

          // Update grid items
          const updatedGridItems = [...state.gridItems];
          updatedGridItems[position] = {
            id: `grid-${position}`,
            title: item.title,
            tags: item.tags || [],
            matched: true,
            matchedWith: item.id
          };

          return {
            backlogGroups: updatedBacklogGroups,
            gridItems: updatedGridItems,
            selectedBacklogItem: null, // Clear selection after assignment
            // Remove from compare list if it was there
            compareList: state.compareList.filter(compareItem => compareItem.id !== item.id)
          };
        });
      },

      removeItemFromGrid: (position) => {
        const state = get();
        
        if (position < 0 || position >= state.gridItems.length) {
          console.warn(`Invalid grid position: ${position}`);
          return;
        }
        
        const gridItem = state.gridItems[position];
        if (!gridItem?.matched || !gridItem.matchedWith) {
          console.warn(`No matched item at position ${position}`);
          return;
        }

        set((state) => {
          // Update backlog groups - unmark item
          const updatedBacklogGroups = state.backlogGroups.map(group => ({
            ...group,
            items: group.items.map(backlogItem =>
              backlogItem.id === gridItem.matchedWith
                ? { ...backlogItem, matched: false, matchedWith: undefined }
                : backlogItem
            )
          }));

          // Clear grid item
          const updatedGridItems = [...state.gridItems];
          updatedGridItems[position] = {
            id: `grid-${position}`,
            title: '',
            tags: [],
            matched: false,
            matchedWith: undefined
          };

          return {
            backlogGroups: updatedBacklogGroups,
            gridItems: updatedGridItems
          };
        });
      },

      moveGridItem: (fromIndex, toIndex) => {
        const state = get();
        
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= state.gridItems.length) return;
        if (toIndex < 0 || toIndex >= state.gridItems.length) return;
        
        // Don't allow moving to occupied positions
        if (state.gridItems[toIndex].matched) return;
        
        set((state) => {
          const updatedGridItems = [...state.gridItems];
          const movedItem = { ...updatedGridItems[fromIndex] };
          
          // Clear the source position
          updatedGridItems[fromIndex] = {
            id: `grid-${fromIndex}`,
            title: '',
            tags: [],
            matched: false,
            matchedWith: undefined
          };
          
          // Place item at target position
          updatedGridItems[toIndex] = {
            ...movedItem,
            id: `grid-${toIndex}`
          };
          
          // Update the matched backlog item's matchedWith reference
          const updatedBacklogGroups = state.backlogGroups.map(group => ({
            ...group,
            items: group.items.map(item =>
              item.id === movedItem.matchedWith
                ? { ...item, matchedWith: `grid-${toIndex}` }
                : item
            )
          }));

          return {
            gridItems: updatedGridItems,
            backlogGroups: updatedBacklogGroups
          };
        });
      },

      clearGrid: () => {
        const state = get();
        
        set((state) => {
          // Unmark all matched items in backlog
          const updatedBacklogGroups = state.backlogGroups.map(group => ({
            ...group,
            items: group.items.map(item => ({
              ...item,
              matched: false,
              matchedWith: undefined
            }))
          }));

          // Reset grid
          const clearedGridItems = state.gridItems.map((_, index) => ({
            id: `grid-${index}`,
            title: '',
            tags: [],
            matched: false,
            matchedWith: undefined
          }));

          return {
            gridItems: clearedGridItems,
            backlogGroups: updatedBacklogGroups,
            selectedBacklogItem: null,
            selectedGridItem: null,
            compareList: []
          };
        });
      },

      // Backlog Management
      setBacklogGroups: (groups) => set({ backlogGroups: groups }),

      toggleBacklogGroup: (groupId) => set((state) => ({
        backlogGroups: state.backlogGroups.map(group =>
          group.id === groupId ? { ...group, isOpen: !group.isOpen } : group
        )
      })),

      addItemToGroup: async (groupId, title, description) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        set((state) => ({
          backlogGroups: state.backlogGroups.map(group =>
            group.id === groupId 
              ? {
                  ...group,
                  items: [
                    ...group.items,
                    {
                      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      title,
                      description,
                      matched: false,
                      tags: []
                    }
                  ]
                }
              : group
          )
        }));
      },

      removeItemFromGroup: (itemId) => set((state) => {
        // First, remove from grid if it's matched there
        const itemToRemove = state.backlogGroups
          .flatMap(group => group.items)
          .find(item => item.id === itemId);
        
        let updatedGridItems = state.gridItems;
        
        if (itemToRemove?.matched && itemToRemove.matchedWith) {
          const gridPosition = parseInt(itemToRemove.matchedWith.replace('grid-', ''));
          updatedGridItems = [...state.gridItems];
          updatedGridItems[gridPosition] = {
            id: `grid-${gridPosition}`,
            title: '',
            tags: [],
            matched: false,
            matchedWith: undefined
          };
        }

        return {
          backlogGroups: state.backlogGroups.map(group => ({
            ...group,
            items: group.items.filter(item => item.id !== itemId)
          })),
          gridItems: updatedGridItems,
          compareList: state.compareList.filter(item => item.id !== itemId),
          selectedBacklogItem: state.selectedBacklogItem === itemId ? null : state.selectedBacklogItem
        };
      }),

      // Selection Management
      setSelectedBacklogItem: (id) => set({ selectedBacklogItem: id }),
      setSelectedGridItem: (id) => set({ selectedGridItem: id }),
      setActiveItem: (id) => set({ activeItem: id }),

      // Compare List Management
      toggleCompareItem: (item) => set((state) => {
        const isInList = state.compareList.some(compareItem => compareItem.id === item.id);
        
        if (isInList) {
          return {
            compareList: state.compareList.filter(compareItem => compareItem.id !== item.id)
          };
        } else {
          return {
            compareList: [...state.compareList, item]
          };
        }
      }),

      clearCompareList: () => set({ compareList: [] }),

      // Drag & Drop Handler
      handleDragEnd: (event) => {
        const { active, over } = event;
        
        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();
        
        // Handle backlog item being dropped on grid
        if (overId.startsWith('grid-')) {
          const position = parseInt(overId.replace('grid-', ''));
          const state = get();
          
          // Find the backlog item being dragged
          const backlogItem = state.backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === activeId);
          
          if (backlogItem && state.canAddAtPosition(position)) {
            state.assignItemToGrid(backlogItem, position);
          }
        }
        
        // Handle dragging from backlog to grid
        if (active.id.toString().startsWith('item-') && over.id.toString().startsWith('grid-')) {
          const draggedItem = state.backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === active.id);
          
          if (!draggedItem || draggedItem.matched) return;
          
          const targetPosition = parseInt(over.id.toString().replace('grid-', ''));
          const targetGridItem = state.gridItems[targetPosition];
          
          // Only assign if target position is empty
          if (!targetGridItem?.matched) {
            get().assignItemToGrid(draggedItem, targetPosition);
          }
        }
        
        // Handle reordering within grid
        if (active.id.toString().startsWith('grid-') && over.id.toString().startsWith('grid-')) {
          const fromIndex = parseInt(active.id.toString().replace('grid-', ''));
          const toIndex = parseInt(over.id.toString().replace('grid-', ''));
          
          if (fromIndex !== toIndex && state.gridItems[fromIndex].matched) {
            get().moveGridItem(fromIndex, toIndex);
          }
        }
      },

      // Utilities
      getAvailableBacklogItems: () => {
        const state = get();
        return state.backlogGroups.flatMap(group => 
          group.items.filter(item => !item.matched)
        );
      },

      getMatchedItems: () => {
        const state = get();
        return state.gridItems.filter(item => item.matched);
      },

      getNextAvailableGridPosition: () => {
        const state = get();
        const availableIndex = state.gridItems.findIndex(item => !item.matched);
        return availableIndex !== -1 ? availableIndex : null;
      },

      canAddAtPosition: (position) => {
        const state = get();
        return position >= 0 && 
               position < state.gridItems.length && 
               !state.gridItems[position].matched;
      },

      // Reset and Sync
      resetStore: () => set({
        gridItems: [],
        backlogGroups: [],
        selectedBacklogItem: null,
        selectedGridItem: null,
        activeItem: null,
        compareList: [],
        currentListId: null
      }),

      syncWithList: (listId) => {
        const state = get();
        
        // If it's a new list, initialize with default data
        if (state.currentListId !== listId) {
          // Get list info from list store
          const listStore = useListStore.getState();
          const currentList = listStore.currentList;
          
          if (currentList) {
            const defaultGroups = getDefaultBacklogGroups(currentList.category);
            
            set({
              currentListId: listId,
              backlogGroups: defaultGroups,
              // Initialize grid if not already done
              gridItems: state.gridItems.length === 0 ? 
                Array.from({ length: currentList.size }, (_, index) => ({
                  id: `grid-${index}`,
                  title: '',
                  tags: [],
                  matched: false,
                })) : state.gridItems,
              maxGridSize: currentList.size
            });
          }
        }
      }
    }),
    {
      name: 'item-store',
      partialize: (state) => ({
        gridItems: state.gridItems,
        backlogGroups: state.backlogGroups,
        maxGridSize: state.maxGridSize,
        currentListId: state.currentListId,
        compareList: state.compareList
        // Don't persist activeItem - it's transient
      })
    }
  )
);

// Selector hooks for better performance
export const useGridItems = () => useItemStore((state) => state.gridItems);
export const useBacklogGroups = () => useItemStore((state) => state.backlogGroups);
export const useSelection = () => useItemStore((state) => ({
  selectedBacklogItem: state.selectedBacklogItem,
  selectedGridItem: state.selectedGridItem,
  activeItem: state.activeItem
}));
export const useCompareList = () => useItemStore((state) => state.compareList);
export const useGridUtilities = () => useItemStore((state) => ({
  getAvailableBacklogItems: state.getAvailableBacklogItems,
  getMatchedItems: state.getMatchedItems,
  getNextAvailableGridPosition: state.getNextAvailableGridPosition,
  canAddAtPosition: state.canAddAtPosition
}));