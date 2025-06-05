import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ListConfiguration {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  user_id: string;
  predefined: boolean;
  size: number;
  time_period: string;
  created_at?: string;

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

interface ListStoreState {
  // Current active list configuration
  currentList: ListConfiguration | null;
  currentUser: UserInfo | null;
  
  // List creation state
  isCreating: boolean;
  creationError: string | null;
  
  // Navigation state
  shouldRedirectToMatch: boolean;
  
  // Actions
  setCurrentList: (list: ListConfiguration) => void;
  setCurrentUser: (user: UserInfo) => void;
  setCreationResult: (result: ListCreationResult) => void;
  setIsCreating: (creating: boolean) => void;
  setCreationError: (error: string | null) => void;
  setShouldRedirectToMatch: (redirect: boolean) => void;
  clearCurrentList: () => void;
  reset: () => void;
  
  // Computed values
  hasActiveList: () => boolean;
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
      currentList: null,
      currentUser: null,
      isCreating: false,
      creationError: null,
      shouldRedirectToMatch: false,
      
      // Actions
      setCurrentList: (list) => set({ currentList: list }),
      setCurrentUser: (user) => set({ currentUser: user }),
      
      setCreationResult: (result) => set({
        currentList: result.list,
        currentUser: result.user,
        isCreating: false,
        creationError: null,
        shouldRedirectToMatch: true
      }),
      
      setIsCreating: (creating) => set({ isCreating: creating }),
      setCreationError: (error) => set({ creationError: error, isCreating: false }),
      setShouldRedirectToMatch: (redirect) => set({ shouldRedirectToMatch: redirect }),
      
      clearCurrentList: () => set({ 
        currentList: null, 
        shouldRedirectToMatch: false 
      }),
      
      reset: () => set({
        currentList: null,
        currentUser: null,
        isCreating: false,
        creationError: null,
        shouldRedirectToMatch: false
      }),
      
      // Computed values
      hasActiveList: () => {
        const state = get();
        return state.currentList !== null;
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
        currentList: state.currentList,
        currentUser: state.currentUser,
        shouldRedirectToMatch: state.shouldRedirectToMatch
      })
    }
  )
);

// Selector hooks for better performance
export const useCurrentList = () => useListStore((state) => state.currentList);
export const useCurrentUser = () => useListStore((state) => state.currentUser);
export const useListCreationState = () => useListStore((state) => ({
  isCreating: state.isCreating,
  creationError: state.creationError,
  shouldRedirectToMatch: state.shouldRedirectToMatch
}));
export const useMatchingContext = () => useListStore((state) => state.getMatchingContext());