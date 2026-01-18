"use client";

/**
 * AnimationController
 * Orchestrates swap animations, celebrations, and transitions
 * Centralizes animation state to prevent conflicts
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { TIMING, ANIMATION_VARIANTS } from "../../lib/PhysicsConfig";

/**
 * Swap animation state
 */
export interface SwapAnimationState {
  isSwapping: boolean;
  fromPosition: number;
  toPosition: number;
  fromItem: {
    id: string;
    title: string;
    image_url?: string | null;
  } | null;
  toItem: {
    id: string;
    title: string;
    image_url?: string | null;
  } | null;
  fromCenter: { x: number; y: number };
  toCenter: { x: number; y: number };
}

/**
 * Celebration state
 */
export interface CelebrationState {
  position: number;
  type: "drop" | "podium" | "complete";
  timestamp: number;
}

/**
 * Animation queue item
 */
export interface QueuedAnimation {
  id: string;
  type: "swap" | "drop" | "celebration" | "bounce";
  position?: number;
  data?: any;
  priority: number;
  callback?: () => void;
}

/**
 * Animation controller state
 */
export interface AnimationState {
  /** Current swap animation */
  swapAnimation: SwapAnimationState | null;
  /** Active celebrations by position */
  celebrations: Map<number, CelebrationState>;
  /** Positions currently bouncing */
  bouncingPositions: Set<number>;
  /** Positions with drop animation */
  droppingPositions: Set<number>;
  /** Animation queue */
  queue: QueuedAnimation[];
  /** Whether animations are paused */
  isPaused: boolean;
}

/**
 * Animation actions
 */
export interface AnimationActions {
  /** Start swap animation */
  startSwapAnimation: (config: Omit<SwapAnimationState, "isSwapping">) => void;
  /** Complete swap animation */
  completeSwapAnimation: () => void;
  /** Trigger celebration */
  triggerCelebration: (position: number, type: CelebrationState["type"]) => void;
  /** Clear celebration */
  clearCelebration: (position: number) => void;
  /** Start bounce animation */
  startBounce: (position: number, isPodium?: boolean) => void;
  /** End bounce animation */
  endBounce: (position: number) => void;
  /** Start drop animation */
  startDrop: (position: number) => void;
  /** End drop animation */
  endDrop: (position: number) => void;
  /** Queue animation */
  queueAnimation: (animation: Omit<QueuedAnimation, "id">) => void;
  /** Process next in queue */
  processQueue: () => void;
  /** Pause all animations */
  pauseAnimations: () => void;
  /** Resume animations */
  resumeAnimations: () => void;
  /** Clear all animations */
  clearAllAnimations: () => void;
  /** Get bounce scale for position */
  getBounceScale: (position: number, isPodium: boolean) => number[];
}

/**
 * Animation context value
 */
export interface AnimationContextValue {
  state: AnimationState;
  actions: AnimationActions;
}

/**
 * Animation context
 */
const AnimationContext = createContext<AnimationContextValue | null>(null);

/**
 * Hook to access animation context
 */
export function useAnimations(): AnimationContextValue {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimations must be used within an AnimationController");
  }
  return context;
}

/**
 * Optional hook that returns null if outside context
 */
export function useOptionalAnimations(): AnimationContextValue | null {
  return useContext(AnimationContext);
}

/**
 * AnimationController props
 */
interface AnimationControllerProps {
  children: ReactNode;
  /** Callback when swap completes */
  onSwapComplete?: (from: number, to: number) => void;
  /** Callback when celebration completes */
  onCelebrationComplete?: (position: number) => void;
}

/**
 * Initial state
 */
const initialState: AnimationState = {
  swapAnimation: null,
  celebrations: new Map(),
  bouncingPositions: new Set(),
  droppingPositions: new Set(),
  queue: [],
  isPaused: false,
};

/**
 * AnimationController Component
 */
export function AnimationController({
  children,
  onSwapComplete,
  onCelebrationComplete,
}: AnimationControllerProps) {
  const [state, setState] = useState<AnimationState>(initialState);

  // Animation ID counter
  const animationIdRef = useRef(0);

  // Timeout refs for cleanup
  const swapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const celebrationTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const bounceTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const dropTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  /**
   * Generate unique animation ID
   */
  const generateAnimationId = useCallback(() => {
    animationIdRef.current += 1;
    return `anim-${animationIdRef.current}-${Date.now()}`;
  }, []);

  /**
   * Start swap animation
   */
  const startSwapAnimation = useCallback(
    (config: Omit<SwapAnimationState, "isSwapping">) => {
      // Clear existing swap timeout
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
      }

      setState((prev) => ({
        ...prev,
        swapAnimation: { ...config, isSwapping: true },
      }));

      // Auto-complete after duration
      swapTimeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, swapAnimation: null }));
        onSwapComplete?.(config.fromPosition, config.toPosition);
      }, TIMING.SWAP_CLEAR_DELAY);
    },
    [onSwapComplete]
  );

  /**
   * Complete swap animation manually
   */
  const completeSwapAnimation = useCallback(() => {
    if (swapTimeoutRef.current) {
      clearTimeout(swapTimeoutRef.current);
    }

    const current = state.swapAnimation;
    setState((prev) => ({ ...prev, swapAnimation: null }));

    if (current) {
      onSwapComplete?.(current.fromPosition, current.toPosition);
    }
  }, [onSwapComplete, state.swapAnimation]);

  /**
   * Trigger celebration
   */
  const triggerCelebration = useCallback(
    (position: number, type: CelebrationState["type"]) => {
      // Clear existing timeout for this position
      const existingTimeout = celebrationTimeoutsRef.current.get(position);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const celebration: CelebrationState = {
        position,
        type,
        timestamp: Date.now(),
      };

      setState((prev) => {
        const newCelebrations = new Map(prev.celebrations);
        newCelebrations.set(position, celebration);
        return { ...prev, celebrations: newCelebrations };
      });

      // Auto-clear after animation
      const timeout = setTimeout(() => {
        setState((prev) => {
          const newCelebrations = new Map(prev.celebrations);
          newCelebrations.delete(position);
          return { ...prev, celebrations: newCelebrations };
        });
        onCelebrationComplete?.(position);
      }, 1200);

      celebrationTimeoutsRef.current.set(position, timeout);
    },
    [onCelebrationComplete]
  );

  /**
   * Clear celebration
   */
  const clearCelebration = useCallback((position: number) => {
    const timeout = celebrationTimeoutsRef.current.get(position);
    if (timeout) {
      clearTimeout(timeout);
      celebrationTimeoutsRef.current.delete(position);
    }

    setState((prev) => {
      const newCelebrations = new Map(prev.celebrations);
      newCelebrations.delete(position);
      return { ...prev, celebrations: newCelebrations };
    });
  }, []);

  /**
   * Start bounce animation
   */
  const startBounce = useCallback((position: number, isPodium: boolean = false) => {
    // Clear existing timeout
    const existingTimeout = bounceTimeoutsRef.current.get(position);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setState((prev) => ({
      ...prev,
      bouncingPositions: new Set([...Array.from(prev.bouncingPositions), position]),
    }));

    // Auto-end bounce
    const duration = isPodium ? 800 : 600;
    const timeout = setTimeout(() => {
      setState((prev) => {
        const newBouncing = new Set(prev.bouncingPositions);
        newBouncing.delete(position);
        return { ...prev, bouncingPositions: newBouncing };
      });
    }, duration);

    bounceTimeoutsRef.current.set(position, timeout);
  }, []);

  /**
   * End bounce animation
   */
  const endBounce = useCallback((position: number) => {
    const timeout = bounceTimeoutsRef.current.get(position);
    if (timeout) {
      clearTimeout(timeout);
      bounceTimeoutsRef.current.delete(position);
    }

    setState((prev) => {
      const newBouncing = new Set(prev.bouncingPositions);
      newBouncing.delete(position);
      return { ...prev, bouncingPositions: newBouncing };
    });
  }, []);

  /**
   * Start drop animation
   */
  const startDrop = useCallback((position: number) => {
    const existingTimeout = dropTimeoutsRef.current.get(position);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setState((prev) => ({
      ...prev,
      droppingPositions: new Set([...Array.from(prev.droppingPositions), position]),
    }));

    // Auto-end drop
    const timeout = setTimeout(() => {
      setState((prev) => {
        const newDropping = new Set(prev.droppingPositions);
        newDropping.delete(position);
        return { ...prev, droppingPositions: newDropping };
      });
    }, TIMING.SNAP_DURATION);

    dropTimeoutsRef.current.set(position, timeout);
  }, []);

  /**
   * End drop animation
   */
  const endDrop = useCallback((position: number) => {
    const timeout = dropTimeoutsRef.current.get(position);
    if (timeout) {
      clearTimeout(timeout);
      dropTimeoutsRef.current.delete(position);
    }

    setState((prev) => {
      const newDropping = new Set(prev.droppingPositions);
      newDropping.delete(position);
      return { ...prev, droppingPositions: newDropping };
    });
  }, []);

  /**
   * Queue animation
   */
  const queueAnimation = useCallback(
    (animation: Omit<QueuedAnimation, "id">) => {
      const id = generateAnimationId();
      setState((prev) => ({
        ...prev,
        queue: [...prev.queue, { ...animation, id }].sort(
          (a, b) => b.priority - a.priority
        ),
      }));
    },
    [generateAnimationId]
  );

  /**
   * Process next in queue
   */
  const processQueue = useCallback(() => {
    setState((prev) => {
      if (prev.queue.length === 0 || prev.isPaused) return prev;

      const [next, ...rest] = prev.queue;
      next.callback?.();

      return { ...prev, queue: rest };
    });
  }, []);

  /**
   * Pause animations
   */
  const pauseAnimations = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  /**
   * Resume animations
   */
  const resumeAnimations = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  /**
   * Clear all animations
   */
  const clearAllAnimations = useCallback(() => {
    // Clear all timeouts
    if (swapTimeoutRef.current) {
      clearTimeout(swapTimeoutRef.current);
    }
    celebrationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    bounceTimeoutsRef.current.forEach((t) => clearTimeout(t));
    dropTimeoutsRef.current.forEach((t) => clearTimeout(t));

    celebrationTimeoutsRef.current.clear();
    bounceTimeoutsRef.current.clear();
    dropTimeoutsRef.current.clear();

    setState(initialState);
  }, []);

  /**
   * Get bounce scale values for position
   */
  const getBounceScale = useCallback(
    (_position: number, isPodium: boolean): number[] => {
      return isPodium
        ? [...ANIMATION_VARIANTS.podiumBounce]
        : [...ANIMATION_VARIANTS.normalBounce];
    },
    []
  );

  /**
   * Memoized context value
   */
  const contextValue = useMemo<AnimationContextValue>(
    () => ({
      state,
      actions: {
        startSwapAnimation,
        completeSwapAnimation,
        triggerCelebration,
        clearCelebration,
        startBounce,
        endBounce,
        startDrop,
        endDrop,
        queueAnimation,
        processQueue,
        pauseAnimations,
        resumeAnimations,
        clearAllAnimations,
        getBounceScale,
      },
    }),
    [
      state,
      startSwapAnimation,
      completeSwapAnimation,
      triggerCelebration,
      clearCelebration,
      startBounce,
      endBounce,
      startDrop,
      endDrop,
      queueAnimation,
      processQueue,
      pauseAnimations,
      resumeAnimations,
      clearAllAnimations,
      getBounceScale,
    ]
  );

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
}

/**
 * Hook to check if position is bouncing
 */
export function useIsBouncing(position: number): boolean {
  const context = useAnimations();
  return context.state.bouncingPositions.has(position);
}

/**
 * Hook to check if position has celebration
 */
export function useHasCelebration(position: number): CelebrationState | null {
  const context = useAnimations();
  return context.state.celebrations.get(position) ?? null;
}

/**
 * Hook to get swap animation state
 */
export function useSwapAnimation(): SwapAnimationState | null {
  const context = useAnimations();
  return context.state.swapAnimation;
}

export default AnimationController;
