"use client";

/**
 * useTouchGestures
 * React hook for touch gesture integration in the Match feature
 * Combines GestureRecognizer, SwipeActionHandler, and haptic feedback
 */

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import {
  GestureRecognizer,
  GestureData,
  GestureConfig,
  GestureCallbacks,
  createGestureRecognizer,
  DEFAULT_GESTURE_CONFIG,
} from "@/lib/gestures/GestureRecognizer";
import {
  SwipeActionHandler,
  SwipeActionBinding,
  ActionContext,
  ActionResult,
  createSwipeActionHandler,
} from "@/lib/gestures/SwipeActionHandler";
import { PreviewItem } from "../components/LongPressPreview";

/**
 * Haptic feedback utilities
 */
function triggerHaptic(intensity: "light" | "medium" | "heavy"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30, 10, 30],
  };

  try {
    navigator.vibrate(patterns[intensity]);
  } catch {
    // Haptics not supported
  }
}

/**
 * Touch gesture configuration
 */
export interface TouchGestureConfig {
  /** Enable gesture recognition */
  enabled?: boolean;
  /** Enable haptic feedback */
  hapticEnabled?: boolean;
  /** Enable swipe shortcuts */
  swipeShortcutsEnabled?: boolean;
  /** Enable long press preview */
  longPressPreviewEnabled?: boolean;
  /** Gesture recognizer config overrides */
  gestureConfig?: Partial<GestureConfig>;
  /** Context type for action mappings */
  contextType?: "backlog" | "grid";
}

/**
 * Item data for gesture context
 */
export interface GestureItemData {
  id: string;
  title?: string;
  imageUrl?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
  position?: number;
}

/**
 * Gesture event handlers
 */
export interface GestureEventHandlers {
  /** Called on swipe gesture */
  onSwipe?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on long press */
  onLongPress?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on tap */
  onTap?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on double tap */
  onDoubleTap?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on flick */
  onFlick?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on drag start */
  onDragStart?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on drag move */
  onDragMove?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called on drag end */
  onDragEnd?: (gesture: GestureData, item: GestureItemData) => void;
  /** Called when action is executed */
  onAction?: (result: ActionResult) => void;
  /** Called when preview should show */
  onShowPreview?: (item: PreviewItem, position: { x: number; y: number }) => void;
  /** Called when preview should hide */
  onHidePreview?: () => void;
}

/**
 * Swipe action handlers
 */
export interface SwipeActionHandlers {
  onQuickAssign?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
  onRemove?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
  onPreview?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
  onCompare?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
  onFavorite?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
  onDismiss?: (context: ActionContext) => ActionResult | Promise<ActionResult>;
}

/**
 * Hook return value
 */
export interface UseTouchGesturesReturn {
  /** Touch event handlers to attach to element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  /** Whether gesture is in progress */
  isGesturing: boolean;
  /** Current gesture type */
  currentGesture: GestureData["type"] | null;
  /** Swipe indicator data for UI */
  swipeIndicator: {
    direction: "left" | "right" | "up" | "down" | null;
    progress: number;
    action: string | null;
    color: string | null;
  };
  /** Update item data for context */
  setItemData: (data: GestureItemData | null) => void;
  /** Get available bindings for UI */
  getBindings: () => SwipeActionBinding[];
  /** Update binding configuration */
  updateBinding: (
    direction: SwipeActionBinding["direction"],
    updates: Partial<SwipeActionBinding>
  ) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<TouchGestureConfig> = {
  enabled: true,
  hapticEnabled: true,
  swipeShortcutsEnabled: true,
  longPressPreviewEnabled: true,
  gestureConfig: {},
  contextType: "backlog",
};

/**
 * useTouchGestures Hook
 */
export function useTouchGestures(
  config: TouchGestureConfig = {},
  eventHandlers: GestureEventHandlers = {},
  actionHandlers: SwipeActionHandlers = {}
): UseTouchGesturesReturn {
  // Merge config with defaults
  const finalConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  // State
  const [isGesturing, setIsGesturing] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureData["type"] | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "up" | "down" | null>(null);

  // Refs
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const swipeHandlerRef = useRef<SwipeActionHandler | null>(null);
  const itemDataRef = useRef<GestureItemData | null>(null);
  const eventHandlersRef = useRef(eventHandlers);
  const actionHandlersRef = useRef(actionHandlers);

  // Keep refs updated
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    actionHandlersRef.current = actionHandlers;
  }, [actionHandlers]);

  // Initialize gesture recognizer
  useEffect(() => {
    if (!finalConfig.enabled) return;

    const callbacks: GestureCallbacks = {
      onGestureStart: (gesture) => {
        setIsGesturing(true);
        setCurrentGesture(gesture.type);
      },
      onGestureMove: (gesture) => {
        setCurrentGesture(gesture.type);

        // Calculate swipe progress for visual feedback
        if (gesture.state === "swiping") {
          const maxDistance = 100;
          const progress = Math.min(gesture.distance / maxDistance, 1);
          setSwipeProgress(progress);
          setSwipeDirection(gesture.direction);
        }

        // Forward drag events
        if (gesture.state === "dragging" && itemDataRef.current) {
          eventHandlersRef.current.onDragMove?.(gesture, itemDataRef.current);
        }
      },
      onGestureEnd: (gesture) => {
        setIsGesturing(false);
        setCurrentGesture(null);
        setSwipeProgress(0);
        setSwipeDirection(null);

        if (gesture.state === "dragging" && itemDataRef.current) {
          eventHandlersRef.current.onDragEnd?.(gesture, itemDataRef.current);
        }
      },
      onTap: (gesture) => {
        if (!itemDataRef.current) return;
        eventHandlersRef.current.onTap?.(gesture, itemDataRef.current);
      },
      onDoubleTap: (gesture) => {
        if (!itemDataRef.current) return;
        if (finalConfig.hapticEnabled) triggerHaptic("light");
        eventHandlersRef.current.onDoubleTap?.(gesture, itemDataRef.current);
      },
      onLongPress: (gesture) => {
        if (!itemDataRef.current) return;
        if (finalConfig.hapticEnabled) triggerHaptic("medium");

        // Trigger preview if enabled
        if (finalConfig.longPressPreviewEnabled) {
          const previewItem: PreviewItem = {
            id: itemDataRef.current.id,
            title: itemDataRef.current.title || "Unknown",
            imageUrl: itemDataRef.current.imageUrl,
            description: itemDataRef.current.description,
            metadata: itemDataRef.current.metadata,
          };
          eventHandlersRef.current.onShowPreview?.(previewItem, {
            x: gesture.currentPoint.x,
            y: gesture.currentPoint.y,
          });
        }

        eventHandlersRef.current.onLongPress?.(gesture, itemDataRef.current);
      },
      onSwipe: async (gesture) => {
        if (!itemDataRef.current || !finalConfig.swipeShortcutsEnabled) return;

        eventHandlersRef.current.onSwipe?.(gesture, itemDataRef.current);

        // Process action via swipe handler
        if (swipeHandlerRef.current) {
          const context: ActionContext = {
            itemId: itemDataRef.current.id,
            itemTitle: itemDataRef.current.title,
            currentPosition: itemDataRef.current.position,
          };

          const result = await swipeHandlerRef.current.handleGesture(
            gesture,
            finalConfig.contextType,
            context
          );

          if (result) {
            if (result.triggerHaptic && finalConfig.hapticEnabled) {
              triggerHaptic(result.hapticIntensity || "medium");
            }
            eventHandlersRef.current.onAction?.(result);
          }
        }
      },
      onFlick: (gesture) => {
        if (!itemDataRef.current) return;
        if (finalConfig.hapticEnabled) triggerHaptic("light");
        eventHandlersRef.current.onFlick?.(gesture, itemDataRef.current);
      },
      onDrag: (gesture) => {
        if (!itemDataRef.current) return;
        if (gesture.state === "dragging") {
          eventHandlersRef.current.onDragStart?.(gesture, itemDataRef.current);
        }
      },
    };

    gestureRecognizerRef.current = createGestureRecognizer(
      { ...DEFAULT_GESTURE_CONFIG, ...finalConfig.gestureConfig },
      callbacks
    );

    return () => {
      gestureRecognizerRef.current?.reset();
    };
  }, [finalConfig]);

  // Initialize swipe action handler
  useEffect(() => {
    if (!finalConfig.swipeShortcutsEnabled) return;

    swipeHandlerRef.current = createSwipeActionHandler({
      enableHaptics: finalConfig.hapticEnabled,
    });

    // Register action handlers
    const handlers = actionHandlersRef.current;

    if (handlers.onQuickAssign) {
      swipeHandlerRef.current.setActionHandler("quick-assign", handlers.onQuickAssign);
    }
    if (handlers.onRemove) {
      swipeHandlerRef.current.setActionHandler("remove", handlers.onRemove);
    }
    if (handlers.onPreview) {
      swipeHandlerRef.current.setActionHandler("preview", handlers.onPreview);
    }
    if (handlers.onCompare) {
      swipeHandlerRef.current.setActionHandler("compare", handlers.onCompare);
    }
    if (handlers.onFavorite) {
      swipeHandlerRef.current.setActionHandler("favorite", handlers.onFavorite);
    }
    if (handlers.onDismiss) {
      swipeHandlerRef.current.setActionHandler("dismiss", handlers.onDismiss);
    }
  }, [finalConfig.swipeShortcutsEnabled, finalConfig.hapticEnabled]);

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!finalConfig.enabled || !gestureRecognizerRef.current) return;
      gestureRecognizerRef.current.handleTouchStart(e.nativeEvent);
    },
    [finalConfig.enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!finalConfig.enabled || !gestureRecognizerRef.current) return;
      gestureRecognizerRef.current.handleTouchMove(e.nativeEvent);
    },
    [finalConfig.enabled]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!finalConfig.enabled || !gestureRecognizerRef.current) return;
      gestureRecognizerRef.current.handleTouchEnd(e.nativeEvent);

      // Hide preview on touch end
      eventHandlersRef.current.onHidePreview?.();
    },
    [finalConfig.enabled]
  );

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      if (!finalConfig.enabled || !gestureRecognizerRef.current) return;
      gestureRecognizerRef.current.handleTouchCancel(e.nativeEvent);

      // Hide preview on cancel
      eventHandlersRef.current.onHidePreview?.();
    },
    [finalConfig.enabled]
  );

  // Set item data
  const setItemData = useCallback((data: GestureItemData | null) => {
    itemDataRef.current = data;
  }, []);

  // Get bindings
  const getBindings = useCallback((): SwipeActionBinding[] => {
    if (!swipeHandlerRef.current) return [];
    return swipeHandlerRef.current.getBindings(finalConfig.contextType);
  }, [finalConfig.contextType]);

  // Update binding
  const updateBinding = useCallback(
    (
      direction: SwipeActionBinding["direction"],
      updates: Partial<SwipeActionBinding>
    ) => {
      swipeHandlerRef.current?.updateBinding(
        finalConfig.contextType,
        direction,
        updates
      );
    },
    [finalConfig.contextType]
  );

  // Calculate swipe indicator
  const swipeIndicator = useMemo(() => {
    if (!swipeDirection || !swipeHandlerRef.current) {
      return {
        direction: null,
        progress: 0,
        action: null,
        color: null,
      };
    }

    const indicator = swipeHandlerRef.current.getSwipeIndicator(
      swipeDirection,
      finalConfig.contextType
    );

    return {
      direction: swipeDirection,
      progress: swipeProgress,
      action: indicator?.action || null,
      color: indicator?.color || null,
    };
  }, [swipeDirection, swipeProgress, finalConfig.contextType]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    isGesturing,
    currentGesture,
    swipeIndicator,
    setItemData,
    getBindings,
    updateBinding,
  };
}

/**
 * Hook for momentum-based item flicking toward positions
 * Calculates trajectory and landing position based on velocity
 */
export function useMomentumFlick(
  gridPositions: Array<{ x: number; y: number; index: number }>,
  config: {
    friction?: number;
    minVelocity?: number;
    maxDistance?: number;
  } = {}
) {
  const { friction = 0.92, minVelocity = 0.5, maxDistance = 500 } = config;

  const calculateLandingPosition = useCallback(
    (
      startX: number,
      startY: number,
      velocityX: number,
      velocityY: number
    ): { position: number; x: number; y: number } | null => {
      // Check if velocity is sufficient
      const speed = Math.sqrt(velocityX ** 2 + velocityY ** 2);
      if (speed < minVelocity) return null;

      // Project position with friction
      let x = startX;
      let y = startY;
      let vx = velocityX;
      let vy = velocityY;
      let totalDistance = 0;

      while (Math.abs(vx) > 0.01 || Math.abs(vy) > 0.01) {
        x += vx;
        y += vy;
        vx *= friction;
        vy *= friction;
        totalDistance += Math.sqrt(vx ** 2 + vy ** 2);

        if (totalDistance > maxDistance) break;
      }

      // Find nearest grid position to projected landing
      let nearestPos = gridPositions[0];
      let nearestDist = Infinity;

      for (const pos of gridPositions) {
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestPos = pos;
        }
      }

      return {
        position: nearestPos.index,
        x: nearestPos.x,
        y: nearestPos.y,
      };
    },
    [gridPositions, friction, minVelocity, maxDistance]
  );

  return { calculateLandingPosition };
}

export default useTouchGestures;
