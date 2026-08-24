import { create } from 'zustand';

/**
 * SelectionCursor — single authoritative source for "which backlog item is selected".
 *
 * All selection state is owned here. Other stores (session-store, match-store,
 * backlog-store) derive their selection views from this cursor, making
 * selection changes atomic and impossible to desync.
 *
 * Keyboard navigation computes the index on-demand from the current available
 * items list rather than storing a stale index.
 */

export type SelectionSource = 'keyboard' | 'click' | 'auto' | 'smart-fill';

export interface SelectionCursor {
  /** The selected item's ID, or null when nothing is selected */
  itemId: string | null;
  /** How the selection was triggered */
  source: SelectionSource;
}

/** Minimal item shape needed for navigation */
interface Identifiable {
  id: string;
}

interface SelectionCursorState extends SelectionCursor {
  /** Set the cursor atomically */
  select: (itemId: string | null, source?: SelectionSource) => void;
  /** Clear selection */
  clear: () => void;
  /** Select the next item in the given list, wrapping around */
  selectNext: (items: Identifiable[], source?: SelectionSource) => void;
  /** Select the previous item in the given list, wrapping around */
  selectPrev: (items: Identifiable[], source?: SelectionSource) => void;
  /** Compute current index within a list (returns -1 if not found) */
  indexIn: (items: Identifiable[]) => number;
}

export const useSelectionCursor = create<SelectionCursorState>((set, get) => ({
  itemId: null,
  source: 'auto',

  select: (itemId, source = 'auto') => set({ itemId, source }),
  clear: () => set({ itemId: null, source: 'auto' }),

  selectNext: (items, source = 'keyboard') => {
    if (items.length === 0) return;
    const { itemId } = get();
    const currentIndex = itemId ? items.findIndex((i) => i.id === itemId) : -1;
    const nextIndex = (currentIndex + 1) % items.length;
    set({ itemId: items[nextIndex].id, source });
  },

  selectPrev: (items, source = 'keyboard') => {
    if (items.length === 0) return;
    const { itemId } = get();
    const currentIndex = itemId ? items.findIndex((i) => i.id === itemId) : 0;
    const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    set({ itemId: items[prevIndex].id, source });
  },

  indexIn: (items) => {
    const { itemId } = get();
    if (!itemId) return -1;
    return items.findIndex((i) => i.id === itemId);
  },
}));

// ── Derived selectors ──────────────────────────────────────────────

/** Read just the selected item ID (most common need) */
export const useSelectedItemId = () => useSelectionCursor((s) => s.itemId);

/** Check if a specific item is selected (for highlight state) */
export const useIsItemSelected = (itemId: string) =>
  useSelectionCursor((s) => s.itemId === itemId);
