import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TopList, ListWithItems } from '@/app/types/top-lists';

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
  
  // Computed values
  hasActiveList: () => boolean;
  getListById: (listId: string) => TopList | null;
  getUserLists: () => TopList[];
  getMatchingContext: () => {
    listId: string;
    title: string;
    category: string;
    subcategory?: string;
    metadata?: ListConfiguration['metadata'];
  } | null;
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
      
      // List Management Actions
      setAvailableLists: (lists) => set({ availableLists: lists }),
      
      addListToAvailable: (list) => set((state) => ({
        availableLists: [list, ...state.availableLists.filter(l => l.id !== list.id)]
      })),
      
      removeListFromAvailable: (listId) => set((state) => ({
        availableLists: state.availableLists.filter(l => l.id !== listId)
      })),
      
      // Current List Actions
      setCurrentList: (list) => set({ 
        currentList: list,
        isLoading: false 
      }),
      
      loadListById: async (listId: string) => {
        set({ isLoading: true });
        try {
          const { useTopList } = await import('@/app/hooks/use-top-lists');
          
          // This would typically be handled by React Query in the component
          // For now, we'll set loading and let the component handle the actual loading
          console.log(`Loading list ${listId}...`);
        } catch (error) {
          console.error('Failed to load list:', error);
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
        } else {
          // Load from backend
          await get().loadListById(listId);
        }
      },
      
      // User Management
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Creation Flow
      setCreationResult: (result) => set({
        currentList: result.list,
        currentUser: result.user,
        isCreating: false,
        creationError: null,
        shouldRedirectToMatch: true
      }),
      
      setIsCreating: (creating) => set({ isCreating: creating }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setCreationError: (error) => set({ creationError: error, isCreating: false }),
      setShouldRedirectToMatch: (redirect) => set({ shouldRedirectToMatch: redirect }),
      
      // Cleanup
      clearCurrentList: () => set({ 
        currentList: null, 
        shouldRedirectToMatch: false 
      }),
      
      reset: () => set({
        currentList: null,
        currentUser: null,
        isCreating: false,
        isLoading: false,
        creationError: null,
        shouldRedirectToMatch: false
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
      },
      
      getMatchingContext: () => {
        const state = get();
        if (!state.currentList) return null;
        
        return {
          listId: state.currentList.id,
          title: state.currentList.title,
          category: state.currentList.category,
          subcategory: state.currentList.subcategory,
          metadata: state.currentList.metadata
        };
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

// Enhanced selector hooks
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
export const useMatchingContext = () => useListStore((state) => state.getMatchingContext());