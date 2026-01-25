import { create } from 'zustand';

/**
 * Item Detail Popup Store
 *
 * Manages multiple floating item detail popups for side-by-side comparison.
 * Each popup tracks its own position, z-index, and item data.
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
}

interface ItemPopupState {
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
  /** Check if item is already open */
  isItemOpen: (itemId: string) => boolean;
  /** Get popup by item ID */
  getPopupByItem: (itemId: string) => PopupInstance | undefined;
}

const BASE_Z_INDEX = 100;
const MAX_POPUPS = 4;

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
  popups: [],
  topZIndex: BASE_Z_INDEX,
  maxPopups: MAX_POPUPS,

  openPopup: (itemId: string, position: { x: number; y: number }) => {
    const state = get();

    // If item is already open, bring to front
    const existing = state.popups.find(p => p.itemId === itemId);
    if (existing) {
      state.bringToFront(existing.id);
      return;
    }

    // Calculate smart position
    const smartPosition = calculateSmartPosition(position, state.popups);

    // Create new popup
    const newPopup: PopupInstance = {
      id: generateId(),
      itemId,
      position: smartPosition,
      zIndex: state.topZIndex + 1,
      openedAt: Date.now(),
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
    set(prev => ({
      popups: prev.popups.filter(p => p.id !== popupId),
    }));
  },

  closeAllPopups: () => {
    set({ popups: [] });
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

  isItemOpen: (itemId: string) => {
    return get().popups.some(p => p.itemId === itemId);
  },

  getPopupByItem: (itemId: string) => {
    return get().popups.find(p => p.itemId === itemId);
  },
}));

// Selectors
export const usePopups = () => useItemPopupStore(state => state.popups);
export const usePopupCount = () => useItemPopupStore(state => state.popups.length);
