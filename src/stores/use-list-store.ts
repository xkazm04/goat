import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TopList } from '@/types/top-lists';
import { listLogger } from '@/lib/logger';

export interface ListConfiguration extends TopList {
  metadata?: {
    size: number;
    selectedCategory: string;
    selectedSubcategory?: string;
    timePeriod: "all-time" | "decade" | "year";
    selectedDecade?: number;
    selectedYear?: number;
    color: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

export interface UserInfo {
  id: string;
  is_temporary: boolean;
  display_name?: string;
  email?: string;
  username?: string;
}

export interface ListCreationResult {
  list: ListConfiguration;
  user: UserInfo;
  is_new_user: boolean;
  success: boolean;
}

export interface MatchingContext {
  listId: string;
  title: string;
  category: string;
  subcategory?: string;
  metadata?: ListConfiguration['metadata'];
}

export interface ListStoreState {
  // Multi-list support
  availableLists: TopList[];
  currentList: ListConfiguration | null;
  currentUser: UserInfo | null;
  
  // List creation state
  isCreating: boolean;
  isLoading: boolean;
  creationError: string | null;
  
  // Navigation state
  shouldRedirectToMatch: boolean;
  
  // Cached matching context
  _matchingContext: MatchingContext | null;
  
  // Actions - List Management
  setAvailableLists: (lists: TopList[]) => void;
  addListToAvailable: (list: TopList) => void;
  removeListFromAvailable: (listId: string) => void;
  
  // Actions - Current List
  setCurrentList: (list: ListConfiguration) => void;
  loadListById: (listId: string) => Promise<void>;
  switchToList: (listId: string) => Promise<void>;
  
  // Actions - User Management
  setCurrentUser: (user: UserInfo) => void;
  
  // Actions - Creation Flow
  setCreationResult: (result: ListCreationResult) => void;
  setIsCreating: (creating: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setCreationError: (error: string | null) => void;
  setShouldRedirectToMatch: (redirect: boolean) => void;
  
  // Actions - Cleanup
  clearCurrentList: () => void;
  reset: () => void;
  
  // Internal action to update cached context
  _updateMatchingContext: () => void;
  
  // Computed values
  hasActiveList: () => boolean;
  getListById: (listId: string) => TopList | null;
  getUserLists: () => TopList[];
}

export const useListStore = create<ListStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      availableLists: [],
      currentList: null,
      currentUser: null,
      isCreating: false,
      isLoading: false,
      creationError: null,
      shouldRedirectToMatch: false,
      _matchingContext: null,
      
      // Internal helper to update cached matching context
      _updateMatchingContext: () => {
        const state = get();
        const newContext = state.currentList ? {
          listId: state.currentList.id,
          title: state.currentList.title,
          category: state.currentList.category,
          subcategory: state.currentList.subcategory,
          metadata: state.currentList.metadata
        } : null;
        
        // Only update if changed
        if (JSON.stringify(state._matchingContext) !== JSON.stringify(newContext)) {
          set({ _matchingContext: newContext });
        }
      },
      
      // List Management Actions
      setAvailableLists: (lists) => set({ availableLists: lists }),
      
      addListToAvailable: (list) => set((state) => ({
        availableLists: [list, ...state.availableLists.filter(l => l.id !== list.id)]
      })),
      
      removeListFromAvailable: (listId) => set((state) => ({
        availableLists: state.availableLists.filter(l => l.id !== listId)
      })),
      
      // Current List Actions
      setCurrentList: (list) => {
        set({ 
          currentList: list,
          isLoading: false 
        });
        // Update cached context after setting current list
        setTimeout(() => get()._updateMatchingContext(), 0);
      },
      
      loadListById: async (listId: string) => {
        set({ isLoading: true });
        try {
          const { useTopList } = await import('@/hooks/use-top-lists');
          
          // This would typically be handled by React Query in the component
          // For now, we'll set loading and let the component handle the actual loading
          listLogger.debug(`Loading list ${listId}...`);
        } catch (error) {
          listLogger.error('Failed to load list:', error);
          set({ isLoading: false });
        }
      },
      
      switchToList: async (listId: string) => {
        const state = get();
        
        // Check if list is already current
        if (state.currentList?.id === listId) {
          return;
        }
        
        // Find list in available lists
        const targetList = state.availableLists.find(l => l.id === listId);
        
        if (targetList) {
          // Convert to ListConfiguration format
          const listConfig: ListConfiguration = {
            ...targetList,
            metadata: {
              size: targetList.size,
              selectedCategory: targetList.category,
              selectedSubcategory: targetList.subcategory,
              timePeriod: "all-time",
              color: {
                primary: "#3b82f6",
                secondary: "#1e40af", 
                accent: "#60a5fa"
              }
            }
          };
          
          set({ 
            currentList: listConfig,
            shouldRedirectToMatch: true,
            isLoading: false 
          });
          
          // Update cached context
          setTimeout(() => get()._updateMatchingContext(), 0);
        } else {
          // Load from backend
          await get().loadListById(listId);
        }
      },
      
      // User Management
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Creation Flow
      setCreationResult: (result) => {
        set({
          currentList: result.list,
          currentUser: result.user,
          isCreating: false,
          creationError: null,
          shouldRedirectToMatch: true
        });
        // Update cached context
        setTimeout(() => get()._updateMatchingContext(), 0);
      },
      
      setIsCreating: (creating) => set({ isCreating: creating }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setCreationError: (error) => set({ creationError: error, isCreating: false }),
      setShouldRedirectToMatch: (redirect) => set({ shouldRedirectToMatch: redirect }),
      
      // Cleanup
      clearCurrentList: () => {
        set({ 
          currentList: null, 
          shouldRedirectToMatch: false,
          _matchingContext: null
        });
      },
      
      reset: () => set({
        currentList: null,
        currentUser: null,
        isCreating: false,
        isLoading: false,
        creationError: null,
        shouldRedirectToMatch: false,
        _matchingContext: null
      }),
      
      // Computed values
      hasActiveList: () => {
        const state = get();
        return state.currentList !== null;
      },
      
      getListById: (listId: string) => {
        const state = get();
        return state.availableLists.find(l => l.id === listId) || null;
      },
      
      getUserLists: () => {
        const state = get();
        if (!state.currentUser) return [];
        return state.availableLists.filter(l => l.user_id === state.currentUser?.id);
      }
    }),
    {
      name: 'list-store',
      partialize: (state) => ({
        availableLists: state.availableLists,
        currentList: state.currentList,
        currentUser: state.currentUser,
        shouldRedirectToMatch: state.shouldRedirectToMatch
      })
    }
  )
);

// Enhanced selector hooks with proper caching
export const useCurrentList = () => useListStore((state) => state.currentList);
export const useCurrentUser = () => useListStore((state) => state.currentUser);
export const useAvailableLists = () => useListStore((state) => state.availableLists);
export const useUserLists = () => useListStore((state) => state.getUserLists());

export const useListCreationState = () => useListStore((state) => ({
  isCreating: state.isCreating,
  isLoading: state.isLoading,
  creationError: state.creationError,
  shouldRedirectToMatch: state.shouldRedirectToMatch
}));

// Fixed: Use cached matching context to prevent infinite loops
export const useMatchingContext = () => useListStore((state) => state._matchingContext);

// Additional selector hooks for specific data
export const useCurrentListMetadata = () => useListStore((state) => state.currentList?.metadata);
export const useCurrentListInfo = () => useListStore((state) => state.currentList ? {
  id: state.currentList.id,
  title: state.currentList.title,
  category: state.currentList.category,
  subcategory: state.currentList.subcategory,
  size: state.currentList.size
} : null);