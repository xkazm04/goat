/**
 * usePhysicsDrag Hook
 *
 * High-level hook for physics-based drag interactions with haptic feedback.
 * Integrates the physics engine, haptic feedback, and drag state management.
 *
 * @deprecated This hook is NOT CURRENTLY USED. SimpleMatchGrid implements
 * inline velocity tracking with velocityRef for better real-time performance.
 * The physics primitives from physicsEngine.ts are used directly instead.
 *
 * Consider removing this file if no integration is planned.
 * See: src/app/features/Match/sub_MatchGrid/lib/usePhysicsGrid.ts for alternative
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { useMotionValue, useSpring } from 'framer-motion';
import {
  Vector2D,
  getSpeed,
  calculateMomentumProjection,
  calculatePositionResistance,
  getPositionAwareSpringConfig,
  getFramerSpringConfig,
  DEFAULT_PHYSICS_CONFIG,
  PhysicsConfig,
} from '@/app/features/Match/sub_MatchGrid/lib/physicsEngine';
import {
  triggerHaptic,
  triggerBounceSequence,
  triggerSwapSequence,
  triggerGravityWellSequence,
  getDropPositionPattern,
  getFlickPattern,
  getResistancePattern,
  isHapticSupported,
  configureHaptics,
  HapticConfig,
} from '@/app/features/Match/sub_MatchGrid/lib/hapticFeedback';

export interface PhysicsDragState {
  /** Whether dragging is active */
  isDragging: boolean;
  /** Current velocity */
  velocity: Vector2D;
  /** Current speed (magnitude of velocity) */
  speed: number;
  /** Active item ID being dragged */
  activeItemId: string | null;
  /** Preview position for drop */
  previewPosition: number | null;
  /** Active gravity well position */
  activeGravityWell: number | null;
  /** Current position resistance */
  resistance: number;
  /** Bounce count for settling */
  bounceCount: number;
  /** Whether item is settling after drop */
  isSettling: boolean;
  /** Drag trail positions */
  trailPositions: Array<{ x: number; y: number; timestamp: number }>;
}

export interface UsePhysicsDragOptions {
  /** Physics configuration */
  physicsConfig?: Partial<PhysicsConfig>;
  /** Haptic configuration */
  hapticConfig?: Partial<HapticConfig>;
  /** Item tenure tracker (itemId -> timestamp when placed) */
  itemTenures?: Map<string, number>;
  /** Maximum trail length */
  maxTrailLength?: number;
  /** Trail lifetime in ms */
  trailLifetime?: number;
  /** Callback when gravity well is entered */
  onGravityWellEnter?: (position: number) => void;
  /** Callback when gravity well is exited */
  onGravityWellExit?: (position: number) => void;
  /** Callback when item bounces */
  onBounce?: (count: number, position: number) => void;
  /** Callback when item settles */
  onSettle?: (position: number) => void;
  /** Callback when swap occurs */
  onSwap?: (fromPosition: number, toPosition: number) => void;
}

const DEFAULT_OPTIONS: Required<UsePhysicsDragOptions> = {
  physicsConfig: {},
  hapticConfig: { enabled: true, intensity: 1.0, reducedMotion: false },
  itemTenures: new Map(),
  maxTrailLength: 20,
  trailLifetime: 200,
  onGravityWellEnter: () => {},
  onGravityWellExit: () => {},
  onBounce: () => {},
  onSettle: () => {},
  onSwap: () => {},
};

export function usePhysicsDrag(options: UsePhysicsDragOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const config: PhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG, ...opts.physicsConfig };

  // Configure haptics on mount
  useEffect(() => {
    if (opts.hapticConfig) {
      configureHaptics(opts.hapticConfig);
    }
  }, [opts.hapticConfig]);

  // State
  const [state, setState] = useState<PhysicsDragState>({
    isDragging: false,
    velocity: { x: 0, y: 0 },
    speed: 0,
    activeItemId: null,
    previewPosition: null,
    activeGravityWell: null,
    resistance: 0,
    bounceCount: 0,
    isSettling: false,
    trailPositions: [],
  });

  // Refs for tracking
  const lastPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(Date.now());
  const dragStartTimeRef = useRef<number>(0);
  const gravityWellTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Motion values for smooth animations
  const velocityX = useMotionValue(0);
  const velocityY = useMotionValue(0);

  // Spring-animated cursor position
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springConfig = useMemo(() => getFramerSpringConfig(config.springConfig), [config.springConfig]);
  const springX = useSpring(cursorX, springConfig);
  const springY = useSpring(cursorY, springConfig);

  // Grid slot refs for gravity well calculations
  const gridSlotsRef = useRef<Map<number, { center: Vector2D; element: HTMLElement }>>(new Map());

  // Register a grid slot
  const registerGridSlot = useCallback((
    position: number,
    element: HTMLElement | null
  ) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      gridSlotsRef.current.set(position, {
        element,
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      });
    } else {
      gridSlotsRef.current.delete(position);
    }
  }, []);

  // Update velocity from position
  const updateVelocity = useCallback((currentPosition: Vector2D): Vector2D => {
    const now = Date.now();
    const deltaTime = Math.max(now - lastTimeRef.current, 1) / 1000;

    const newVelocity = {
      x: (currentPosition.x - lastPositionRef.current.x) / deltaTime,
      y: (currentPosition.y - lastPositionRef.current.y) / deltaTime,
    };

    velocityX.set(newVelocity.x);
    velocityY.set(newVelocity.y);

    lastPositionRef.current = currentPosition;
    lastTimeRef.current = now;

    return newVelocity;
  }, [velocityX, velocityY]);

  // Check gravity wells
  const checkGravityWells = useCallback((position: Vector2D): number | null => {
    for (const well of config.gravityWells) {
      const slot = gridSlotsRef.current.get(well.position);
      if (!slot) continue;

      const dx = slot.center.x - position.x;
      const dy = slot.center.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < well.radius) {
        return well.position;
      }
    }
    return null;
  }, [config.gravityWells]);

  // Calculate resistance for an item
  const getResistance = useCallback((itemId: string): number => {
    const tenure = opts.itemTenures?.get(itemId);
    if (!tenure) return 0;
    return calculatePositionResistance(Date.now() - tenure);
  }, [opts.itemTenures]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const itemId = String(event.active.id);
    const resistance = getResistance(itemId);

    dragStartTimeRef.current = Date.now();
    lastPositionRef.current = { x: 0, y: 0 };
    lastTimeRef.current = Date.now();

    setState(prev => ({
      ...prev,
      isDragging: true,
      activeItemId: itemId,
      velocity: { x: 0, y: 0 },
      speed: 0,
      resistance,
      bounceCount: 0,
      isSettling: false,
      trailPositions: [],
    }));

    // Haptic feedback
    if (isHapticSupported()) {
      triggerHaptic('dragStart');

      if (resistance > 0.3) {
        const tenure = opts.itemTenures?.get(itemId) ?? 0;
        setTimeout(() => triggerHaptic(getResistancePattern(Date.now() - tenure)), 50);
      }
    }
  }, [getResistance, opts.itemTenures]);

  // Handle drag move
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!event.active.rect.current.translated) return;

    const { left, top, width, height } = event.active.rect.current.translated;
    const currentPosition = {
      x: left + width / 2,
      y: top + height / 2,
    };

    cursorX.set(currentPosition.x);
    cursorY.set(currentPosition.y);

    const velocity = updateVelocity(currentPosition);
    const speed = getSpeed(velocity);

    // Check gravity wells
    const gravityWell = checkGravityWells(currentPosition);

    // Handle gravity well state change
    setState(prev => {
      if (gravityWell !== prev.activeGravityWell) {
        if (gravityWell !== null) {
          opts.onGravityWellEnter?.(gravityWell);
          if (isHapticSupported()) {
            triggerHaptic('gravityWellEnter');
          }
        } else if (prev.activeGravityWell !== null) {
          opts.onGravityWellExit?.(prev.activeGravityWell);
        }
      }

      // Update trail
      const now = Date.now();
      const newTrail = [
        ...prev.trailPositions.filter(p => now - p.timestamp < opts.trailLifetime),
        { ...currentPosition, timestamp: now },
      ].slice(-opts.maxTrailLength);

      // Calculate preview position
      const projection = calculateMomentumProjection(currentPosition, velocity);
      let previewPosition: number | null = null;
      let nearestDistance = 150;

      gridSlotsRef.current.forEach((slot, pos) => {
        const dx = projection.x - slot.center.x;
        const dy = projection.y - slot.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          previewPosition = pos;
        }
      });

      return {
        ...prev,
        velocity,
        speed,
        activeGravityWell: gravityWell,
        trailPositions: newTrail,
        previewPosition,
      };
    });
  }, [
    cursorX,
    cursorY,
    updateVelocity,
    checkGravityWells,
    opts.onGravityWellEnter,
    opts.onGravityWellExit,
    opts.trailLifetime,
    opts.maxTrailLength,
  ]);

  // Handle drag end
  const handleDragEnd = useCallback((
    event: DragEndEvent,
    dropPosition: number | null
  ) => {
    const velocity = state.velocity;
    const speed = state.speed;

    // Calculate bounce count
    const bounceCount = dropPosition !== null && speed > 200
      ? Math.min(Math.ceil(speed / 500), 3)
      : 0;

    setState(prev => ({
      ...prev,
      isDragging: false,
      activeItemId: null,
      activeGravityWell: null,
      bounceCount,
      isSettling: bounceCount > 0,
    }));

    // Haptic feedback for drop
    if (isHapticSupported() && dropPosition !== null) {
      const dropPattern = getDropPositionPattern(dropPosition);
      triggerHaptic(dropPattern);

      if (speed > 300) {
        setTimeout(() => triggerHaptic(getFlickPattern(velocity)), 100);
      }

      if (bounceCount > 0) {
        triggerBounceSequence(bounceCount);
        opts.onBounce?.(bounceCount, dropPosition);
      }
    }

    // Settle after bounces
    if (bounceCount > 0 && dropPosition !== null) {
      const settleDuration = bounceCount * 150 + 200;
      setTimeout(() => {
        setState(prev => ({ ...prev, isSettling: false }));
        opts.onSettle?.(dropPosition);
      }, settleDuration);
    } else if (dropPosition !== null) {
      opts.onSettle?.(dropPosition);
    }

    return { speed, bounceCount };
  }, [state.velocity, state.speed, opts.onBounce, opts.onSettle]);

  // Handle swap
  const handleSwap = useCallback((fromPosition: number, toPosition: number, duration: number = 350) => {
    if (isHapticSupported()) {
      triggerSwapSequence(duration);
    }
    opts.onSwap?.(fromPosition, toPosition);
  }, [opts.onSwap]);

  // Get spring config for a position
  const getSpringConfigForPosition = useCallback((position: number) => {
    const physicsConfig = getPositionAwareSpringConfig(position, config.springConfig);
    return getFramerSpringConfig(physicsConfig);
  }, [config.springConfig]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gravityWellTimerRef.current) {
        clearTimeout(gravityWellTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    velocityX,
    velocityY,
    springX,
    springY,
    cursorX,
    cursorY,

    // Handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleSwap,

    // Registration
    registerGridSlot,

    // Helpers
    getResistance,
    getSpringConfigForPosition,
    isHapticSupported: isHapticSupported(),

    // Direct haptic triggers
    triggerHaptic,
    triggerBounceSequence,
    triggerSwapSequence,
    triggerGravityWellSequence,
  };
}

export default usePhysicsDrag;
