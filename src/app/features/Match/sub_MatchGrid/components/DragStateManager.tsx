"use client";

/**
 * DragStateManager
 * Manages all drag-related state including active item, cursor position, and drop validation
 * Provides context for child components to access drag state without prop drilling
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { DragStartEvent, DragMoveEvent, DragEndEvent } from "@dnd-kit/core";
import { CollectionItem } from "../../../Collection/types";
import { GridItemType } from "@/types/match";
import { BacklogItem } from "@/types/backlog-groups";
import { TIMING } from "../../lib/PhysicsConfig";

/**
 * Velocity state
 */
export interface Velocity {
  x: number;
  y: number;
}

/**
 * Cursor position
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Active item preview data for optimistic UI
 */
export interface ActiveItemPreview {
  id: string;
  title?: string;
  image_url?: string | null;
}

/**
 * Drag state
 */
export interface DragState {
  /** Whether drag is in progress */
  isDragging: boolean;
  /** Active item being dragged */
  activeItem: CollectionItem | GridItemType | null;
  /** Type of active item */
  activeType: "collection" | "grid" | null;
  /** Active item ID */
  activeId: string | null;
  /** Preview data for optimistic UI */
  activePreview: ActiveItemPreview | null;
  /** Current preview/target position */
  previewPosition: number | null;
  /** Whether snap animation is active */
  isSnapping: boolean;
  /** Current velocity */
  velocity: Velocity;
  /** Current cursor position */
  cursorPosition: CursorPosition;
  /** Position being dragged from (for grid items) */
  sourcePosition: number | null;
}

/**
 * Drag actions
 */
export interface DragActions {
  /** Handle drag start */
  handleDragStart: (event: DragStartEvent) => void;
  /** Handle drag move */
  handleDragMove: (event: DragMoveEvent) => void;
  /** Handle drag end */
  handleDragEnd: (event: DragEndEvent) => void;
  /** Update cursor position */
  updateCursor: (x: number, y: number) => void;
  /** Set preview position */
  setPreviewPosition: (position: number | null) => void;
  /** Get current velocity */
  getVelocity: () => Velocity;
  /** Reset drag state */
  resetDragState: () => void;
}

/**
 * Drag context value
 */
export interface DragContextValue {
  state: DragState;
  actions: DragActions;
}

/**
 * Drag context
 */
const DragContext = createContext<DragContextValue | null>(null);

/**
 * Hook to access drag context
 */
export function useDragState(): DragContextValue {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDragState must be used within a DragStateManager");
  }
  return context;
}

/**
 * Optional hook that returns null if outside context
 */
export function useOptionalDragState(): DragContextValue | null {
  return useContext(DragContext);
}

/**
 * DragStateManager props
 */
interface DragStateManagerProps {
  children: ReactNode;
  /** Callback when drag starts */
  onDragStart?: (state: DragState) => void;
  /** Callback when drag moves */
  onDragMove?: (state: DragState) => void;
  /** Callback when drag ends */
  onDragEnd?: (state: DragState, event: DragEndEvent) => void;
  /** Callback when preview position changes */
  onPreviewChange?: (position: number | null) => void;
}

/**
 * Initial drag state
 */
const initialDragState: DragState = {
  isDragging: false,
  activeItem: null,
  activeType: null,
  activeId: null,
  activePreview: null,
  previewPosition: null,
  isSnapping: false,
  velocity: { x: 0, y: 0 },
  cursorPosition: { x: 0, y: 0 },
  sourcePosition: null,
};

/**
 * DragStateManager Component
 */
export function DragStateManager({
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPreviewChange,
}: DragStateManagerProps) {
  // Core drag state
  const [state, setState] = useState<DragState>(initialDragState);

  // Refs for real-time tracking (not triggering re-renders)
  const velocityRef = useRef<Velocity>({ x: 0, y: 0 });
  const lastPositionRef = useRef<{ x: number; y: number; time: number }>({
    x: 0,
    y: 0,
    time: Date.now(),
  });
  const snapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Extract item preview data
   */
  const extractPreviewData = useCallback(
    (itemData: any): ActiveItemPreview | null => {
      if (!itemData?.item) return null;

      return {
        id: itemData.item.id,
        title: itemData.item.title || itemData.item.name,
        image_url: itemData.item.image_url,
      };
    },
    []
  );

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const itemData = active.data.current;

      // Reset velocity tracking
      velocityRef.current = { x: 0, y: 0 };
      lastPositionRef.current = { x: 0, y: 0, time: Date.now() };

      // Determine active item and type
      let activeItem: CollectionItem | GridItemType | null = null;
      let activeType: "collection" | "grid" | null = null;
      let sourcePosition: number | null = null;

      if (itemData?.type === "collection-item" && itemData.item) {
        activeItem = itemData.item;
        activeType = "collection";
      } else if (itemData?.type === "grid-item" && itemData.item) {
        activeItem = itemData.item;
        activeType = "grid";
        sourcePosition = itemData.position ?? null;
      }

      const newState: DragState = {
        isDragging: true,
        activeItem,
        activeType,
        activeId: String(active.id),
        activePreview: extractPreviewData(itemData),
        previewPosition: null,
        isSnapping: false,
        velocity: { x: 0, y: 0 },
        cursorPosition: { x: 0, y: 0 },
        sourcePosition,
      };

      setState(newState);
      onDragStart?.(newState);
    },
    [extractPreviewData, onDragStart]
  );

  /**
   * Handle drag move
   */
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      // Calculate velocity
      const now = Date.now();
      const rect = event.active.rect.current.translated;

      if (rect) {
        const cursorX = rect.left + rect.width / 2;
        const cursorY = rect.top + rect.height / 2;
        const deltaTime = (now - lastPositionRef.current.time) / 1000;

        if (deltaTime > 0) {
          velocityRef.current = {
            x: (cursorX - lastPositionRef.current.x) / deltaTime,
            y: (cursorY - lastPositionRef.current.y) / deltaTime,
          };
        }

        lastPositionRef.current = { x: cursorX, y: cursorY, time: now };

        // Update cursor position in state
        setState((prev) => ({
          ...prev,
          cursorPosition: { x: cursorX, y: cursorY },
          velocity: velocityRef.current,
        }));
      }

      // Calculate preview position
      let newPreviewPosition: number | null = null;
      if (event.over?.data?.current?.type === "grid-slot") {
        newPreviewPosition = event.over.data.current.position;
      }

      setState((prev) => {
        if (prev.previewPosition !== newPreviewPosition) {
          onPreviewChange?.(newPreviewPosition);
          return { ...prev, previewPosition: newPreviewPosition };
        }
        return prev;
      });

      onDragMove?.(state);
    },
    [onDragMove, onPreviewChange, state]
  );

  /**
   * Handle drag end
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { over } = event;

      // Trigger snap animation if dropping on valid target
      if (over?.data?.current?.type === "grid-slot") {
        setState((prev) => ({ ...prev, isSnapping: true }));

        // Clear snap state after animation
        if (snapTimeoutRef.current) {
          clearTimeout(snapTimeoutRef.current);
        }
        snapTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, isSnapping: false }));
        }, TIMING.SNAP_DURATION);
      }

      // Capture final state before reset
      const finalState = { ...state, velocity: velocityRef.current };

      // Reset drag state
      setState((prev) => ({
        ...initialDragState,
        isSnapping: prev.isSnapping, // Keep snap state for animation
      }));

      onDragEnd?.(finalState, event);
    },
    [onDragEnd, state]
  );

  /**
   * Update cursor position
   */
  const updateCursor = useCallback((x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      cursorPosition: { x, y },
    }));
  }, []);

  /**
   * Set preview position
   */
  const setPreviewPosition = useCallback(
    (position: number | null) => {
      setState((prev) => {
        if (prev.previewPosition !== position) {
          onPreviewChange?.(position);
          return { ...prev, previewPosition: position };
        }
        return prev;
      });
    },
    [onPreviewChange]
  );

  /**
   * Get current velocity (for non-state access)
   */
  const getVelocity = useCallback(() => velocityRef.current, []);

  /**
   * Reset drag state
   */
  const resetDragState = useCallback(() => {
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
    }
    setState(initialDragState);
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<DragContextValue>(
    () => ({
      state,
      actions: {
        handleDragStart,
        handleDragMove,
        handleDragEnd,
        updateCursor,
        setPreviewPosition,
        getVelocity,
        resetDragState,
      },
    }),
    [
      state,
      handleDragStart,
      handleDragMove,
      handleDragEnd,
      updateCursor,
      setPreviewPosition,
      getVelocity,
      resetDragState,
    ]
  );

  return (
    <DragContext.Provider value={contextValue}>{children}</DragContext.Provider>
  );
}

/**
 * Hook to get just the velocity (for performance-critical components)
 */
export function useDragVelocity(): Velocity {
  const context = useDragState();
  return context.state.velocity;
}

/**
 * Hook to check if a specific position is the preview target
 */
export function useIsPreviewTarget(position: number): boolean {
  const context = useDragState();
  return context.state.previewPosition === position;
}

/**
 * Hook to check if dragging is active
 */
export function useIsDragging(): boolean {
  const context = useDragState();
  return context.state.isDragging;
}

export default DragStateManager;
