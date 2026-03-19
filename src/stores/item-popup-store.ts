import { create } from 'zustand';
import { UI_TIMING } from '@/lib/timing';

/**
 * Item Popup Store (unified)
 *
 * Manages two mutually-exclusive detail UIs:
 *
 * 1. **Inspector** — a single full-detail side panel (desktop) / bottom sheet
 *    (mobile), opened via an explicit "inspect" action.
 * 2. **Floating popups** — up to 4 lightweight cards for quick side-by-side
 *    comparison, opened via right-click context menu.
 *
 * **Mutual exclusion**: Opening the inspector closes all popups, and opening
 * a popup closes the inspector. This is enforced internally so consumers
 * never have to worry about it.
 */

export interface PopupInstance {
  /** Unique popup ID */
  id: string;
  /** Item being displayed */
  itemId: string;
  /** Position on screen */
  position: { x: number; y: number };
  /** Z-index for stacking */
  zIndex: number;
  /** Timestamp for ordering */
  openedAt: number;
  /** Whether the popup is locked to the top row */
  locked: boolean;
}

interface ItemPopupState {
  // ── Floating popups ──────────────────────────────────────────────────
  /** All open popups */
  popups: PopupInstance[];
  /** Counter for z-index */
  topZIndex: number;
  /** Maximum allowed popups */
  maxPopups: number;

  /** Open a new popup at position */
  openPopup: (itemId: string, position: { x: number; y: number }) => void;
  /** Close a specific popup */
  closePopup: (popupId: string) => void;
  /** Close all popups */
  closeAllPopups: () => void;
  /** Bring a popup to front */
  bringToFront: (popupId: string) => void;
  /** Update popup position (for dragging) */
  updatePosition: (popupId: string, position: { x: number; y: number }) => void;
  /** Lock a popup to the top row */
  lockPopup: (popupId: string) => void;
  /** Unlock a popup so it can be freely moved */
  unlockPopup: (popupId: string) => void;
  /** Toggle lock state */
  toggleLock: (popupId: string) => void;
  /** Check if item is already open */
  isItemOpen: (itemId: string) => boolean;
  /** Get popup by item ID */
  getPopupByItem: (itemId: string) => PopupInstance | undefined;

  // ── Inspector (single-item deep-dive) ────────────────────────────────
  /** Currently inspected item ID */
  inspectorItemId: string | null;
  /** Whether the inspector is open */
  inspectorIsOpen: boolean;
  /** Open the inspector for a specific item */
  openInspector: (itemId: string) => void;
  /** Close the inspector */
  closeInspector: () => void;
  /** Toggle the inspector for an item */
  toggleInspector: (itemId: string) => void;
}

const BASE_Z_INDEX = 100;
const MAX_POPUPS = 4;
const LOCKED_TOP_Y = 12;
const LOCKED_CARD_WIDTH = 240;
const LOCKED_GAP = 12;

// Generate unique ID
const generateId = () => `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Calculate smart position to avoid overlap
const calculateSmartPosition = (
  basePosition: { x: number; y: number },
  existingPopups: PopupInstance[],
  popupWidth = 420,
  popupHeight = 500
): { x: number; y: number } => {
  const { innerWidth, innerHeight } = typeof window !== 'undefined'
    ? window
    : { innerWidth: 1200, innerHeight: 800 };

  let { x, y } = basePosition;

  // Ensure popup stays within viewport
  x = Math.max(20, Math.min(x, innerWidth - popupWidth - 20));
  y = Math.max(20, Math.min(y, innerHeight - popupHeight - 20));

  // Offset if overlapping with existing popups
  const offset = 30;
  let attempts = 0;
  while (attempts < 10) {
    const overlaps = existingPopups.some(popup =>
      Math.abs(popup.position.x - x) < 50 && Math.abs(popup.position.y - y) < 50
    );
    if (!overlaps) break;
    x += offset;
    y += offset;
    // Wrap around if going off screen
    if (x > innerWidth - popupWidth - 20) x = 40 + (attempts * 20);
    if (y > innerHeight - popupHeight - 20) y = 40 + (attempts * 20);
    attempts++;
  }

  return { x, y };
};

export const useItemPopupStore = create<ItemPopupState>((set, get) => ({
  // ── Floating popups ────────────────────────────────────────────────────
  popups: [],
  topZIndex: BASE_Z_INDEX,
  maxPopups: MAX_POPUPS,

  openPopup: (itemId: string, position: { x: number; y: number }) => {
    const state = get();

    // Mutual exclusion: close inspector when a popup opens
    if (state.inspectorIsOpen) {
      state.closeInspector();
    }

    // If item is already open, bring to front
    const existing = state.popups.find(p => p.itemId === itemId);
    if (existing) {
      state.bringToFront(existing.id);
      return;
    }

    // Default to locked at top row
    const lockedCount = state.popups.filter(p => p.locked).length;
    const lockedPosition = {
      x: LOCKED_GAP + lockedCount * (LOCKED_CARD_WIDTH + LOCKED_GAP),
      y: LOCKED_TOP_Y,
    };

    // Create new popup — locked by default (sticky note at top)
    const newPopup: PopupInstance = {
      id: generateId(),
      itemId,
      position: lockedPosition,
      zIndex: state.topZIndex + 1,
      openedAt: Date.now(),
      locked: true,
    };

    set(prev => {
      let newPopups = [...prev.popups, newPopup];

      // Remove oldest if exceeding max
      if (newPopups.length > prev.maxPopups) {
        newPopups = newPopups
          .sort((a, b) => a.openedAt - b.openedAt)
          .slice(-prev.maxPopups);
      }

      return {
        popups: newPopups,
        topZIndex: prev.topZIndex + 1,
      };
    });
  },

  closePopup: (popupId: string) => {
    set(prev => {
      const remaining = prev.popups.filter(p => p.id !== popupId);
      // Recompute locked positions to fill gaps
      let lockedIdx = 0;
      const repositioned = remaining.map(p => {
        if (p.locked) {
          const pos = { x: LOCKED_GAP + lockedIdx * (LOCKED_CARD_WIDTH + LOCKED_GAP), y: LOCKED_TOP_Y };
          lockedIdx++;
          return { ...p, position: pos };
        }
        return p;
      });
      return {
        popups: repositioned,
        topZIndex: repositioned.length === 0 ? 100 : prev.topZIndex,
      };
    });
  },

  closeAllPopups: () => {
    set({ popups: [], topZIndex: 100 });
  },

  bringToFront: (popupId: string) => {
    set(prev => {
      const popup = prev.popups.find(p => p.id === popupId);
      if (!popup) return prev;

      const newZIndex = prev.topZIndex + 1;
      return {
        popups: prev.popups.map(p =>
          p.id === popupId ? { ...p, zIndex: newZIndex } : p
        ),
        topZIndex: newZIndex,
      };
    });
  },

  updatePosition: (popupId: string, position: { x: number; y: number }) => {
    set(prev => ({
      popups: prev.popups.map(p =>
        p.id === popupId ? { ...p, position } : p
      ),
    }));
  },

  lockPopup: (popupId: string) => {
    set(prev => {
      // Count already-locked popups to determine slot index
      const lockedCount = prev.popups.filter(p => p.locked && p.id !== popupId).length;
      const lockedX = LOCKED_GAP + lockedCount * (LOCKED_CARD_WIDTH + LOCKED_GAP);
      return {
        popups: prev.popups.map(p =>
          p.id === popupId
            ? { ...p, locked: true, position: { x: lockedX, y: LOCKED_TOP_Y } }
            : p
        ),
      };
    });
  },

  unlockPopup: (popupId: string) => {
    set(prev => {
      // Offset slightly from top-left so the card doesn't sit right at the edge
      const popup = prev.popups.find(p => p.id === popupId);
      if (!popup) return prev;
      return {
        popups: prev.popups.map(p =>
          p.id === popupId
            ? { ...p, locked: false, position: { x: p.position.x + 40, y: p.position.y + 60 } }
            : p
        ),
      };
    });
  },

  toggleLock: (popupId: string) => {
    const state = get();
    const popup = state.popups.find(p => p.id === popupId);
    if (!popup) return;
    if (popup.locked) {
      state.unlockPopup(popupId);
    } else {
      state.lockPopup(popupId);
    }
  },

  isItemOpen: (itemId: string) => {
    return get().popups.some(p => p.itemId === itemId);
  },

  getPopupByItem: (itemId: string) => {
    return get().popups.find(p => p.itemId === itemId);
  },

  // ── Inspector ──────────────────────────────────────────────────────────
  inspectorItemId: null,
  inspectorIsOpen: false,

  openInspector: (itemId: string) => {
    // Mutual exclusion: close all floating popups when inspector opens
    set({ popups: [], inspectorItemId: itemId, inspectorIsOpen: true });
  },

  closeInspector: () => {
    set({ inspectorIsOpen: false });
    // Clear itemId after animation completes
    setTimeout(() => {
      set({ inspectorItemId: null });
    }, UI_TIMING.PANEL_TRANSITION);
  },

  toggleInspector: (itemId: string) => {
    const state = get();
    if (state.inspectorIsOpen && state.inspectorItemId === itemId) {
      state.closeInspector();
    } else {
      state.openInspector(itemId);
    }
  },
}));

// ── Selectors ──────────────────────────────────────────────────────────────
export const usePopups = () => useItemPopupStore(state => state.popups);
export const usePopupCount = () => useItemPopupStore(state => state.popups.length);
export const useInspectorIsOpen = () => useItemPopupStore(state => state.inspectorIsOpen);
export const useInspectorItemId = () => useItemPopupStore(state => state.inspectorItemId);
