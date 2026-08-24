/**
 * Drop Zone Highlight Store
 *
 * Zustand store for drag state and drop zone position tracking.
 * Migrated from DropZoneHighlightContext to eliminate the React Context
 * performance anti-pattern where a single useState object caused all 50+
 * consumers to re-render on every state change.
 *
 * With Zustand, each consumer selects only the slice it needs:
 * - SimpleDropZone (×50): isDragging, dragError
 * - TierRow/TierListView: isDragging only
 * - DropZoneConnectors: isDragging (reads other state via refs/rAF)
 * - PortalDragOverlay: actions only (no state subscription)
 */

import { create } from "zustand";

export interface DropZonePosition {
  position: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MagneticState {
  targetId: string | null;
  strength: number; // 0-1 value representing magnetic pull intensity
}

export interface ActiveItemData {
  id: string;
  title?: string;
  image_url?: string;
}

export interface DragError {
  /** The grid position where the error occurred (null for general errors) */
  position: number | null;
  /** Human-readable error message */
  message: string;
  /** Timestamp to uniquely identify each error event */
  timestamp: number;
}

interface DropZoneHighlightState {
  // --- State slices (each can be selected independently) ---
  isDragging: boolean;
  activeItemId: string | null;
  activeItemData: ActiveItemData | null;
  hoveredPosition: number | null;
  dropZonePositions: Map<number, DropZonePosition>;
  magneticState: MagneticState;
  dragError: DragError | null;

  // --- Refs (never trigger re-renders) ---
  /** Cursor position stored in a ref-like object to avoid re-rendering consumers on every mouse move */
  cursorPositionRef: { current: { x: number; y: number } };

  // --- Actions ---
  setIsDragging: (isDragging: boolean, itemId?: string | null, itemData?: ActiveItemData | null) => void;
  setHoveredPosition: (position: number | null) => void;
  registerDropZone: (position: number, element: HTMLElement) => void;
  unregisterDropZone: (position: number) => void;
  updateCursorPosition: (x: number, y: number) => void;
  updateMagneticState: (targetId: string | null, strength: number) => void;
  getClosestDropZones: (count?: number) => DropZonePosition[];
  emitDragError: (position: number | null, message: string) => void;
  /** Reset all state (called on provider unmount) */
  reset: () => void;
}

// Plain mutable ref object (not React.createRef) to avoid SSR issues
const cursorPositionRef = { current: { x: 0, y: 0 } };

const dropZoneRefs = new Map<number, HTMLElement>();
const registeredPositionsRef = new Map<number, string>();
let dragErrorTimeoutId: ReturnType<typeof setTimeout> | null = null;

export const useDropZoneHighlightStore = create<DropZoneHighlightState>((set, get) => ({
  // --- Initial state ---
  isDragging: false,
  activeItemId: null,
  activeItemData: null,
  hoveredPosition: null,
  dropZonePositions: new Map(),
  magneticState: { targetId: null, strength: 0 },
  dragError: null,
  cursorPositionRef,

  // --- Actions ---
  setIsDragging: (isDragging, itemId, itemData) => {
    set({
      isDragging,
      activeItemId: isDragging ? (itemId ?? null) : null,
      activeItemData: isDragging ? (itemData ?? null) : null,
      hoveredPosition: isDragging ? get().hoveredPosition : null,
      magneticState: isDragging ? get().magneticState : { targetId: null, strength: 0 },
    });
  },

  setHoveredPosition: (position) => {
    if (get().hoveredPosition === position) return;
    set({ hoveredPosition: position });
  },

  updateCursorPosition: (x, y) => {
    cursorPositionRef.current.x = x;
    cursorPositionRef.current.y = y;
  },

  updateMagneticState: (targetId, strength) => {
    const prev = get().magneticState;
    if (prev.targetId === targetId && prev.strength === strength) return;
    set({ magneticState: { targetId, strength } });
  },

  emitDragError: (position, message) => {
    if (dragErrorTimeoutId) {
      clearTimeout(dragErrorTimeoutId);
    }

    const error: DragError = { position, message, timestamp: Date.now() };
    set({ dragError: error });

    // Auto-clear after 600ms (matches animation duration)
    dragErrorTimeoutId = setTimeout(() => {
      set({ dragError: null });
    }, 600);
  },

  registerDropZone: (position, element) => {
    dropZoneRefs.set(position, element);

    const rect = element.getBoundingClientRect();
    const posKey = `${rect.left},${rect.top},${rect.width},${rect.height}`;
    const existingKey = registeredPositionsRef.get(position);

    // Skip state update if position hasn't actually changed
    if (existingKey === posKey) return;

    registeredPositionsRef.set(position, posKey);

    set((state) => {
      const newPositions = new Map(state.dropZonePositions);
      newPositions.set(position, {
        position,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
      return { dropZonePositions: newPositions };
    });
  },

  unregisterDropZone: (position) => {
    dropZoneRefs.delete(position);
    registeredPositionsRef.delete(position);
    const state = get();
    if (!state.dropZonePositions.has(position)) return;
    set(() => {
      const newPositions = new Map(get().dropZonePositions);
      newPositions.delete(position);
      return { dropZonePositions: newPositions };
    });
  },

  getClosestDropZones: (count = 3) => {
    const cursor = cursorPositionRef.current;
    const { dropZonePositions } = get();

    // Partial sort: only find the N closest instead of sorting all 50
    const zones = Array.from(dropZonePositions.values());
    const result: (DropZonePosition & { distance: number })[] = [];

    for (const zone of zones) {
      const distance = Math.hypot(zone.x - cursor.x, zone.y - cursor.y);
      if (result.length < count) {
        result.push({ ...zone, distance });
        for (let i = result.length - 1; i > 0 && result[i].distance < result[i - 1].distance; i--) {
          [result[i], result[i - 1]] = [result[i - 1], result[i]];
        }
      } else if (distance < result[result.length - 1].distance) {
        result[result.length - 1] = { ...zone, distance };
        for (let i = result.length - 1; i > 0 && result[i].distance < result[i - 1].distance; i--) {
          [result[i], result[i - 1]] = [result[i - 1], result[i]];
        }
      }
    }

    return result;
  },

  reset: () => {
    if (dragErrorTimeoutId) {
      clearTimeout(dragErrorTimeoutId);
      dragErrorTimeoutId = null;
    }
    dropZoneRefs.clear();
    registeredPositionsRef.clear();
    set({
      isDragging: false,
      activeItemId: null,
      activeItemData: null,
      hoveredPosition: null,
      dropZonePositions: new Map(),
      magneticState: { targetId: null, strength: 0 },
      dragError: null,
    });
  },
}));
