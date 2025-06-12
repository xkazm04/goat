import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ListMetadata {
  size: number;
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: 'all-time' | 'recent' | 'classic';
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface List {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  size: number;
  metadata: ListMetadata;
  createdAt?: string;
  updatedAt?: string;
}

interface ListStore {
  currentList: List | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentList: (list: List | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentList: () => void;
}

export const useListStore = create<ListStore>()(
  persist(
    (set, get) => ({
      currentList: null,
      isLoading: false,
      error: null,

      setCurrentList: (list) => set({ currentList: list, error: null }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearCurrentList: () => set({ currentList: null, error: null }),
    }),
    {
      name: 'list-store',
      partialize: (state) => ({
        currentList: state.currentList,
        // Don't persist loading states
      })
    }
  )
);

// Selector hooks for better performance
export const useCurrentList = () => useListStore((state) => state.currentList);
export const useListLoading = () => useListStore((state) => state.isLoading);
export const useListError = () => useListStore((state) => state.error);