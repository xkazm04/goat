/**
 * DropZoneHighlightContext
 *
 * Provides drag state and drop zone position tracking for visual feedback during DnD.
 *
 * Performance Optimizations:
 * - Uses refs (registeredPositionsRef) to track registered positions without state updates
 * - Early returns in callbacks when values haven't changed (prevents unnecessary re-renders)
 * - Stable callback references via callbacksRef pattern
 * - Single state object to batch related updates
 *
 * Note (H6): registerDropZone is called during drag but optimized to skip updates
 * when position data hasn't changed (posKey comparison).
 */
"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

interface DropZonePosition {
  position: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MagneticState {
  targetId: string | null;
  strength: number; // 0-1 value representing magnetic pull intensity
}

export interface ActiveItemData {
  id: string;
  title?: string;
  image_url?: string;
}

interface DragState {
  isDragging: boolean;
  activeItemId: string | null;
  activeItemData: ActiveItemData | null;
  hoveredPosition: number | null;
  dropZonePositions: Map<number, DropZonePosition>;
  cursorPosition: { x: number; y: number };
  magneticState: MagneticState;
}

interface DropZoneHighlightContextValue {
  dragState: DragState;
  setIsDragging: (isDragging: boolean, itemId?: string | null, itemData?: ActiveItemData | null) => void;
  setHoveredPosition: (position: number | null) => void;
  registerDropZone: (position: number, element: HTMLElement) => void;
  unregisterDropZone: (position: number) => void;
  updateCursorPosition: (x: number, y: number) => void;
  updateMagneticState: (targetId: string | null, strength: number) => void;
  getClosestDropZones: (count?: number) => DropZonePosition[];
}

const DropZoneHighlightContext = createContext<DropZoneHighlightContextValue | null>(null);

export function DropZoneHighlightProvider({ children }: { children: ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    activeItemId: null,
    activeItemData: null,
    hoveredPosition: null,
    dropZonePositions: new Map(),
    cursorPosition: { x: 0, y: 0 },
    magneticState: { targetId: null, strength: 0 },
  });

  const dropZoneRefs = useRef<Map<number, HTMLElement>>(new Map());
  // Use ref to track registered positions to avoid unnecessary state updates
  const registeredPositionsRef = useRef<Map<number, string>>(new Map());

  const setIsDragging = useCallback((isDragging: boolean, itemId?: string | null, itemData?: ActiveItemData | null) => {
    setDragState((prev) => ({
      ...prev,
      isDragging,
      activeItemId: isDragging ? (itemId ?? null) : null,
      activeItemData: isDragging ? (itemData ?? null) : null,
      hoveredPosition: isDragging ? prev.hoveredPosition : null,
      magneticState: isDragging ? prev.magneticState : { targetId: null, strength: 0 },
    }));
  }, []);

  const setHoveredPosition = useCallback((position: number | null) => {
    setDragState((prev) => {
      if (prev.hoveredPosition === position) return prev;
      return { ...prev, hoveredPosition: position };
    });
  }, []);

  const updateCursorPosition = useCallback((x: number, y: number) => {
    setDragState((prev) => {
      if (prev.cursorPosition.x === x && prev.cursorPosition.y === y) return prev;
      return { ...prev, cursorPosition: { x, y } };
    });
  }, []);

  const updateMagneticState = useCallback((targetId: string | null, strength: number) => {
    setDragState((prev) => {
      if (prev.magneticState.targetId === targetId && prev.magneticState.strength === strength) return prev;
      return { ...prev, magneticState: { targetId, strength } };
    });
  }, []);

  const registerDropZone = useCallback((position: number, element: HTMLElement) => {
    dropZoneRefs.current.set(position, element);

    const rect = element.getBoundingClientRect();
    // Create a key based on position values to detect actual changes
    const posKey = `${rect.left},${rect.top},${rect.width},${rect.height}`;
    const existingKey = registeredPositionsRef.current.get(position);

    // Skip state update if position hasn't actually changed
    if (existingKey === posKey) return;

    registeredPositionsRef.current.set(position, posKey);

    setDragState((prev) => {
      const newPositions = new Map(prev.dropZonePositions);
      newPositions.set(position, {
        position,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
      return { ...prev, dropZonePositions: newPositions };
    });
  }, []);

  const unregisterDropZone = useCallback((position: number) => {
    dropZoneRefs.current.delete(position);
    registeredPositionsRef.current.delete(position);
    setDragState((prev) => {
      if (!prev.dropZonePositions.has(position)) return prev;
      const newPositions = new Map(prev.dropZonePositions);
      newPositions.delete(position);
      return { ...prev, dropZonePositions: newPositions };
    });
  }, []);

  const getClosestDropZones = useCallback((count = 3): DropZonePosition[] => {
    const { cursorPosition, dropZonePositions } = dragState;

    const sortedByDistance = Array.from(dropZonePositions.values())
      .map((zone) => ({
        ...zone,
        distance: Math.hypot(zone.x - cursorPosition.x, zone.y - cursorPosition.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    return sortedByDistance.slice(0, count);
  }, [dragState]);

  // Store callbacks in a ref to provide stable references
  const callbacksRef = useRef({
    setIsDragging,
    setHoveredPosition,
    registerDropZone,
    unregisterDropZone,
    updateCursorPosition,
    updateMagneticState,
    getClosestDropZones,
  });
  callbacksRef.current = {
    setIsDragging,
    setHoveredPosition,
    registerDropZone,
    unregisterDropZone,
    updateCursorPosition,
    updateMagneticState,
    getClosestDropZones,
  };

  // Create stable context value - only dragState changes trigger re-renders
  const valueRef = useRef<DropZoneHighlightContextValue | null>(null);
  if (!valueRef.current) {
    valueRef.current = {
      dragState,
      setIsDragging: (...args) => callbacksRef.current.setIsDragging(...args),
      setHoveredPosition: (...args) => callbacksRef.current.setHoveredPosition(...args),
      registerDropZone: (...args) => callbacksRef.current.registerDropZone(...args),
      unregisterDropZone: (...args) => callbacksRef.current.unregisterDropZone(...args),
      updateCursorPosition: (...args) => callbacksRef.current.updateCursorPosition(...args),
      updateMagneticState: (...args) => callbacksRef.current.updateMagneticState(...args),
      getClosestDropZones: (...args) => callbacksRef.current.getClosestDropZones(...args),
    };
  }
  // Update dragState in the value
  valueRef.current.dragState = dragState;

  return (
    <DropZoneHighlightContext.Provider value={valueRef.current}>
      {children}
    </DropZoneHighlightContext.Provider>
  );
}

export function useDropZoneHighlight() {
  const context = useContext(DropZoneHighlightContext);
  if (!context) {
    throw new Error("useDropZoneHighlight must be used within a DropZoneHighlightProvider");
  }
  return context;
}

export function useOptionalDropZoneHighlight() {
  return useContext(DropZoneHighlightContext);
}
