import { create } from 'zustand';

/**
 * Inspector Store
 *
 * Manages the global state for the ItemInspector component.
 * Allows opening/closing the inspector from any component.
 */
export interface InspectorState {
  /** Currently inspected item ID */
  itemId: string | null;
  /** Whether the inspector is open */
  isOpen: boolean;
  /** Open the inspector for a specific item */
  openInspector: (itemId: string) => void;
  /** Close the inspector */
  closeInspector: () => void;
  /** Toggle the inspector for an item */
  toggleInspector: (itemId: string) => void;
}

export const useInspectorStore = create<InspectorState>((set, get) => ({
  itemId: null,
  isOpen: false,

  openInspector: (itemId: string) => {
    set({ itemId, isOpen: true });
  },

  closeInspector: () => {
    set({ isOpen: false });
    // Clear itemId after animation completes
    setTimeout(() => {
      set({ itemId: null });
    }, 300);
  },

  toggleInspector: (itemId: string) => {
    const state = get();
    if (state.isOpen && state.itemId === itemId) {
      state.closeInspector();
    } else {
      state.openInspector(itemId);
    }
  },
}));

// Selectors
export const useInspectorIsOpen = () => useInspectorStore((state) => state.isOpen);
export const useInspectorItemId = () => useInspectorStore((state) => state.itemId);
