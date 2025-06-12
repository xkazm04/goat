import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DragEndEvent } from '@dnd-kit/core';
import { BacklogGroup, BacklogItem } from '@/app/types/backlog-groups';
import { GridItemType } from '@/app/types/match';

// Enhanced interfaces for hierarchical structure
export interface HierarchicalGroup extends BacklogGroup {
  parentId?: string;
  level: number; // 0=category, 1=subcategory, 2=group
  expanded: boolean;
  gridPositions?: number[];
  isLoaded: boolean;
  lastLoaded?: string;
}

export interface GridSection {
  id: string;
  category: string;
  positions: number[];
  reserved: boolean;
  priority: number;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface SessionData {
  id: string;
  listId: string;
  category: string;
  gridItems: GridItemType[];
  groups: HierarchicalGroup[];
  selectedBacklogItem: string | null;
  compareList: string[];
  lastUpdated: string;
  progress: {
    matched: number;
    total: number;
    percentage: number;
  };
}

interface HierarchyStoreState {
  // Core Data
  sessions: Record<string, SessionData>;
  activeSessionId: string | null;
  
  // Cache Layer
  cache: Record<string, CachedData<any>>;
  
  // UI State
  selectedGridItem: string | null;
  activeItem: string | null;
  keyboardMode: boolean;
  isLoading: boolean;
  
  // Comparison State
  comparison: {
    isOpen: boolean;
    items: BacklogItem[];
    selectedForComparison: string[];
    mode: 'side-by-side' | 'overlay';
  };
  
  // Actions - Session Management
  createSession: (listId: string, size: number, category?: string) => SessionData;
  switchToSession: (listId: string) => void;
  getActiveSession: () => SessionData | null;
  updateSession: (listId: string, updates: Partial<SessionData>) => void;
  deleteSession: (listId: string) => void;
  
  // Actions - Group Management
  setGroups: (groups: HierarchicalGroup[]) => void;
  toggleGroup: (groupId: string) => void;
  loadGroupItems: (groupId: string, items: BacklogItem[]) => void;
  addItemToGroup: (groupId: string, item: BacklogItem) => void;
  removeItemFromGroup: (groupId: string, itemId: string) => void;
  
  // Actions - Grid Management
  initializeGrid: (size: number, listId: string, category?: string) => void;
  assignItemToGrid: (item: BacklogItem, position: number) => boolean;
  removeItemFromGrid: (position: number) => void;
  moveGridItem: (fromIndex: number, toIndex: number) => void;
  clearGrid: () => void;
  
  // Actions - Selection & UI
  setSelectedBacklogItem: (itemId: string | null) => void;
  setSelectedGridItem: (itemId: string | null) => void;
  setActiveItem: (itemId: string | null) => void;
  setKeyboardMode: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  // Actions - Comparison
  toggleComparison: () => void;
  addToComparison: (item: BacklogItem) => void;
  removeFromComparison: (itemId: string) => void;
  clearComparison: () => void;
  
  // Actions - Drag & Drop
  handleDragEnd: (event: DragEndEvent) => void;
  
  // Actions - Cache Management
  setCache: <T>(key: string, data: T, ttl?: number) => void;
  getCache: <T>(key: string) => T | null;
  clearCache: (pattern?: string) => void;
  
  // Getters
  getAvailableBacklogItems: () => BacklogItem[];
  getMatchedItems: () => GridItemType[];
  getNextAvailableGridPosition: () => number | null;
  canAddAtPosition: (position: number) => boolean;
  getSessionProgress: () => { matched: number; total: number; percentage: number };
}

export const useHierarchyStore = create<HierarchyStoreState>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        sessions: {},
        activeSessionId: null,
        cache: {},
        selectedGridItem: null,
        activeItem: null,
        keyboardMode: false,
        isLoading: false,
        comparison: {
          isOpen: false,
          items: [],
          selectedForComparison: [],
          mode: 'side-by-side'
        },

        // Session Management
        createSession: (listId: string, size: number, category = 'general') => {
          const session: SessionData = {
            id: listId,
            listId,
            category,
            gridItems: Array.from({ length: size }, (_, index) => ({
              id: `grid-${index}`,
              title: '',
              tags: [],
              matched: false,
            })),
            groups: [],
            selectedBacklogItem: null,
            compareList: [],
            lastUpdated: new Date().toISOString(),
            progress: {
              matched: 0,
              total: size,
              percentage: 0
            }
          };

          set((state) => {
            state.sessions[listId] = session;
            state.activeSessionId = listId;
          });

          return session;
        },

        switchToSession: (listId: string) => {
          set((state) => {
            if (!state.sessions[listId]) {
              state.sessions[listId] = get().createSession(listId, 50);
            }
            state.activeSessionId = listId;
            state.selectedBacklogItem = null;
            state.selectedGridItem = null;
            state.activeItem = null;
          });
        },

        getActiveSession: () => {
          const state = get();
          return state.activeSessionId ? state.sessions[state.activeSessionId] || null : null;
        },

        updateSession: (listId: string, updates: Partial<SessionData>) => {
          set((state) => {
            if (state.sessions[listId]) {
              Object.assign(state.sessions[listId], updates, {
                lastUpdated: new Date().toISOString()
              });
            }
          });
        },

        deleteSession: (listId: string) => {
          set((state) => {
            delete state.sessions[listId];
            if (state.activeSessionId === listId) {
              state.activeSessionId = null;
            }
          });
        },

        // Group Management
        setGroups: (groups: HierarchicalGroup[]) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              activeSession.groups = groups;
              activeSession.lastUpdated = new Date().toISOString();
            }
          });
        },

        toggleGroup: (groupId: string) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const group = activeSession.groups.find(g => g.id === groupId);
              if (group) {
                group.expanded = !group.expanded;
                activeSession.lastUpdated = new Date().toISOString();
              }
            }
          });
        },

        loadGroupItems: (groupId: string, items: BacklogItem[]) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const group = activeSession.groups.find(g => g.id === groupId);
              if (group) {
                group.items = items;
                group.isLoaded = true;
                group.lastLoaded = new Date().toISOString();
                activeSession.lastUpdated = new Date().toISOString();
              }
            }
          });
        },

        addItemToGroup: (groupId: string, item: BacklogItem) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const group = activeSession.groups.find(g => g.id === groupId);
              if (group) {
                group.items.push(item);
                group.item_count = group.items.length;
                activeSession.lastUpdated = new Date().toISOString();
              }
            }
          });
        },

        removeItemFromGroup: (groupId: string, itemId: string) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const group = activeSession.groups.find(g => g.id === groupId);
              if (group) {
                group.items = group.items.filter(item => item.id !== itemId);
                group.item_count = group.items.length;
                activeSession.lastUpdated = new Date().toISOString();
              }
              
              // Remove from compare list if present
              activeSession.compareList = activeSession.compareList.filter(id => id !== itemId);
              
              // Clear selection if it was this item
              if (activeSession.selectedBacklogItem === itemId) {
                activeSession.selectedBacklogItem = null;
              }
              
              // Remove from grid if present
              activeSession.gridItems = activeSession.gridItems.map(gridItem => {
                if (gridItem.matched && gridItem.matchedWith === itemId) {
                  return {
                    id: gridItem.id,
                    title: '',
                    tags: [],
                    matched: false,
                    matchedWith: undefined
                  };
                }
                return gridItem;
              });
              
              // Recalculate progress
              const matched = activeSession.gridItems.filter(item => item.matched).length;
              activeSession.progress = {
                matched,
                total: activeSession.gridItems.length,
                percentage: Math.round((matched / activeSession.gridItems.length) * 100)
              };
            }
          });
        },

        // Grid Management
        initializeGrid: (size: number, listId: string, category = 'general') => {
          set((state) => {
            if (!state.sessions[listId]) {
              get().createSession(listId, size, category);
            } else {
              const session = state.sessions[listId];
              session.gridItems = Array.from({ length: size }, (_, index) => ({
                id: `grid-${index}`,
                title: '',
                tags: [],
                matched: false,
              }));
              session.progress = {
                matched: 0,
                total: size,
                percentage: 0
              };
              session.lastUpdated = new Date().toISOString();
            }
            state.activeSessionId = listId;
          });
        },

        assignItemToGrid: (item: BacklogItem, position: number) => {
          const session = get().getActiveSession();
          if (!session || !get().canAddAtPosition(position)) return false;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession && position < activeSession.gridItems.length) {
              const gridItem = activeSession.gridItems[position];
              
              // Update grid item
              gridItem.title = item.name || item.title || '';
              gridItem.tags = item.tags || [];
              gridItem.matched = true;
              gridItem.matchedWith = item.id;
              
              // Mark item as matched in groups
              activeSession.groups.forEach(group => {
                const groupItem = group.items.find(i => i.id === item.id);
                if (groupItem) {
                  groupItem.matched = true;
                }
              });
              
              // Remove from compare list
              activeSession.compareList = activeSession.compareList.filter(id => id !== item.id);
              
              // Recalculate progress
              const matched = activeSession.gridItems.filter(item => item.matched).length;
              activeSession.progress = {
                matched,
                total: activeSession.gridItems.length,
                percentage: Math.round((matched / activeSession.gridItems.length) * 100)
              };
              
              activeSession.lastUpdated = new Date().toISOString();
            }
          });

          return true;
        },

        removeItemFromGrid: (position: number) => {
          const session = get().getActiveSession();
          if (!session || position >= session.gridItems.length) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const gridItem = activeSession.gridItems[position];
              const itemId = gridItem.matchedWith;
              
              // Clear grid item
              gridItem.title = '';
              gridItem.tags = [];
              gridItem.matched = false;
              gridItem.matchedWith = undefined;
              
              // Unmark item in groups
              if (itemId) {
                activeSession.groups.forEach(group => {
                  const groupItem = group.items.find(i => i.id === itemId);
                  if (groupItem) {
                    groupItem.matched = false;
                  }
                });
              }
              
              // Recalculate progress
              const matched = activeSession.gridItems.filter(item => item.matched).length;
              activeSession.progress = {
                matched,
                total: activeSession.gridItems.length,
                percentage: Math.round((matched / activeSession.gridItems.length) * 100)
              };
              
              activeSession.lastUpdated = new Date().toISOString();
            }
          });
        },

        moveGridItem: (fromIndex: number, toIndex: number) => {
          const session = get().getActiveSession();
          if (!session || fromIndex === toIndex) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              const gridItems = activeSession.gridItems;
              const fromItem = { ...gridItems[fromIndex] };
              const toItem = { ...gridItems[toIndex] };
              
              // Swap items
              gridItems[fromIndex] = toItem;
              gridItems[toIndex] = fromItem;
              
              activeSession.lastUpdated = new Date().toISOString();
            }
          });
        },

        clearGrid: () => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              // Clear all grid items
              activeSession.gridItems.forEach(item => {
                item.title = '';
                item.tags = [];
                item.matched = false;
                item.matchedWith = undefined;
              });
              
              // Unmark all items in groups
              activeSession.groups.forEach(group => {
                group.items.forEach(item => {
                  item.matched = false;
                });
              });
              
              // Clear compare list
              activeSession.compareList = [];
              
              // Reset progress
              activeSession.progress = {
                matched: 0,
                total: activeSession.gridItems.length,
                percentage: 0
              };
              
              activeSession.lastUpdated = new Date().toISOString();
            }
          });
        },

        // Selection & UI
        setSelectedBacklogItem: (itemId: string | null) => {
          const session = get().getActiveSession();
          if (!session) return;

          set((state) => {
            const activeSession = state.sessions[session.id];
            if (activeSession) {
              activeSession.selectedBacklogItem = itemId;
            }
          });
        },

        setSelectedGridItem: (itemId: string | null) => {
          set((state) => {
            state.selectedGridItem = itemId;
          });
        },

        setActiveItem: (itemId: string | null) => {
          set((state) => {
            state.activeItem = itemId;
          });
        },

        setKeyboardMode: (enabled: boolean) => {
          set((state) => {
            state.keyboardMode = enabled;
          });
        },

        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        // Comparison
        toggleComparison: () => {
          set((state) => {
            state.comparison.isOpen = !state.comparison.isOpen;
          });
        },

        addToComparison: (item: BacklogItem) => {
          set((state) => {
            if (!state.comparison.items.find(i => i.id === item.id)) {
              state.comparison.items.push(item);
              state.comparison.selectedForComparison.push(item.id);
            }
          });
        },

        removeFromComparison: (itemId: string) => {
          set((state) => {
            state.comparison.items = state.comparison.items.filter(i => i.id !== itemId);
            state.comparison.selectedForComparison = state.comparison.selectedForComparison.filter(id => id !== itemId);
          });
        },

        clearComparison: () => {
          set((state) => {
            state.comparison.items = [];
            state.comparison.selectedForComparison = [];
          });
        },

        // Drag & Drop
        handleDragEnd: (event: DragEndEvent) => {
          const { active, over } = event;
          
          if (!over) return;

          const activeId = active.id.toString();
          const overId = over.id.toString();
          const session = get().getActiveSession();
          
          if (!session) return;

          // Handle backlog item to grid assignment
          if (overId.startsWith('grid-')) {
            const position = parseInt(overId.replace('grid-', ''));
            
            // Find the backlog item being dragged
            const backlogItem = session.groups
              .flatMap(group => group.items)
              .find(item => item.id === activeId);
            
            if (backlogItem && get().canAddAtPosition(position)) {
              get().assignItemToGrid(backlogItem, position);
              return;
            }
          }
          
          // Handle grid-to-grid movement (swapping)
          if (activeId.startsWith('grid-') && overId.startsWith('grid-')) {
            const fromIndex = parseInt(activeId.replace('grid-', ''));
            const toIndex = parseInt(overId.replace('grid-', ''));
            
            if (fromIndex !== toIndex) {
              get().moveGridItem(fromIndex, toIndex);
            }
          }
        },

        // Cache Management
        setCache: <T>(key: string, data: T, ttl = 5 * 60 * 1000) => { // 5 minutes default
          set((state) => {
            const now = Date.now();
            state.cache[key] = {
              data,
              timestamp: now,
              expiresAt: now + ttl
            };
          });
        },

        getCache: <T>(key: string): T | null => {
          const state = get();
          const cached = state.cache[key];
          
          if (!cached) return null;
          
          if (Date.now() > cached.expiresAt) {
            // Cache expired, remove it
            set((state) => {
              delete state.cache[key];
            });
            return null;
          }
          
          return cached.data as T;
        },

        clearCache: (pattern?: string) => {
          set((state) => {
            if (pattern) {
              Object.keys(state.cache).forEach(key => {
                if (key.includes(pattern)) {
                  delete state.cache[key];
                }
              });
            } else {
              state.cache = {};
            }
          });
        },

        // Getters
        getAvailableBacklogItems: () => {
          const session = get().getActiveSession();
          if (!session) return [];
          
          return session.groups
            .flatMap(group => group.items)
            .filter(item => !item.matched);
        },

        getMatchedItems: () => {
          const session = get().getActiveSession();
          if (!session) return [];
          
          return session.gridItems.filter(item => item.matched);
        },

        getNextAvailableGridPosition: () => {
          const session = get().getActiveSession();
          if (!session) return null;
          
          const emptyIndex = session.gridItems.findIndex(item => !item.matched);
          return emptyIndex !== -1 ? emptyIndex : null;
        },

        canAddAtPosition: (position: number) => {
          const session = get().getActiveSession();
          if (!session || position < 0 || position >= session.gridItems.length) return false;
          
          return !session.gridItems[position].matched;
        },

        getSessionProgress: () => {
          const session = get().getActiveSession();
          if (!session) return { matched: 0, total: 50, percentage: 0 };
          
          return session.progress;
        },
      }))
    ),
    {
      name: 'hierarchy-store',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        cache: state.cache,
      }),
    }
  )
);

// Selector hooks for performance
export const useActiveSession = () => useHierarchyStore((state) => state.getActiveSession());
export const useBacklogGroups = () => useHierarchyStore((state) => state.getActiveSession()?.groups || []);
export const useGridItems = () => useHierarchyStore((state) => state.getActiveSession()?.gridItems || []);
export const useSelectedBacklogItem = () => useHierarchyStore((state) => state.getActiveSession()?.selectedBacklogItem);
export const useSessionProgress = () => useHierarchyStore((state) => state.getSessionProgress());
export const useAvailableBacklogItems = () => useHierarchyStore((state) => state.getAvailableBacklogItems());