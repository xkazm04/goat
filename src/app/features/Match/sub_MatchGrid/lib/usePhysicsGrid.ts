/**
 * usePhysicsGrid Hook
 *
 * React hook for physics-based grid interactions.
 * Provides:
 * - Gravity well effects for top positions
 * - Momentum tracking during drag
 * - Spring physics for fluid animations
 * - Bounce physics for settling
 * - Position resistance based on tenure
 * - Integrated haptic feedback
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useMotionValue, useSpring, animate } from 'framer-motion';
import {
  Vector2D,
  PhysicsConfig,
  SpringConfig,
  DEFAULT_PHYSICS_CONFIG,
  calculateGravityWellForce,
  calculateSpringForce,
  calculateBounce,
  calculatePositionResistance,
  calculateMomentumProjection,
  calculateSwapPath,
  getPositionAwareSpringConfig,
  getFramerSpringConfig,
  getSpeed,
  hasSettled,
} from './physicsEngine';
import {
  triggerHaptic,
  triggerBounceSequence,
  triggerSwapSequence,
  triggerGravityWellSequence,
  getDropPositionPattern,
  getFlickPattern,
  getResistancePattern,
  isHapticSupported,
} from './hapticFeedback';

export interface PhysicsGridState {
  /** Current drag velocity */
  velocity: Vector2D;
  /** Whether item is currently being dragged */
  isDragging: boolean;
  /** Active gravity well position (if any) */
  activeGravityWell: number | null;
  /** Current bounce count */
  bounceCount: number;
  /** Whether item is settling */
  isSettling: boolean;
  /** Preview position for snap */
  previewPosition: number | null;
  /** Position resistance level (0-1) */
  resistance: number;
}

export interface PhysicsGridConfig extends PhysicsConfig {
  /** Enable/disable haptic feedback */
  enableHaptics: boolean;
  /** Enable/disable gravity wells */
  enableGravityWells: boolean;
  /** Enable/disable bounce physics */
  enableBounce: boolean;
  /** Enable/disable position resistance */
  enableResistance: boolean;
  /** Maximum bounce count */
  maxBounces: number;
}

const DEFAULT_GRID_CONFIG: PhysicsGridConfig = {
  ...DEFAULT_PHYSICS_CONFIG,
  enableHaptics: true,
  enableGravityWells: true,
  enableBounce: true,
  enableResistance: true,
  maxBounces: 3,
};

export interface GridSlotRef {
  position: number;
  element: HTMLElement | null;
  center: Vector2D;
}

export interface UsePhysicsGridOptions {
  config?: Partial<PhysicsGridConfig>;
  /** Callback when item enters gravity well */
  onGravityWellEnter?: (position: number) => void;
  /** Callback when item leaves gravity well */
  onGravityWellLeave?: (position: number) => void;
  /** Callback when bounce occurs */
  onBounce?: (count: number) => void;
  /** Callback when item settles */
  onSettle?: (position: number) => void;
  /** Item tenure tracker (position -> timestamp) */
  itemTenures?: Map<string, number>;
}

export function usePhysicsGrid(options: UsePhysicsGridOptions = {}) {
  const config: PhysicsGridConfig = {
    ...DEFAULT_GRID_CONFIG,
    ...options.config,
  };

  // Physics state
  const [state, setState] = useState<PhysicsGridState>({
    velocity: { x: 0, y: 0 },
    isDragging: false,
    activeGravityWell: null,
    bounceCount: 0,
    isSettling: false,
    previewPosition: null,
    resistance: 0,
  });

  // Motion values for smooth animations
  const velocityX = useMotionValue(0);
  const velocityY = useMotionValue(0);

  // Refs for tracking
  const lastPositionRef = useRef<Vector2D>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(Date.now());
  const dragStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const gridSlotsRef = useRef<Map<number, GridSlotRef>>(new Map());

  // Register a grid slot for gravity well calculations
  const registerGridSlot = useCallback((
    position: number,
    element: HTMLElement | null
  ) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      gridSlotsRef.current.set(position, {
        position,
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

  // Get spring config for a position
  const getSpringConfig = useCallback((position: number): SpringConfig => {
    return getPositionAwareSpringConfig(position, config.springConfig);
  }, [config.springConfig]);

  // Get Framer Motion spring config
  const getFramerConfig = useCallback((position: number) => {
    const springConfig = getSpringConfig(position);
    return getFramerSpringConfig(springConfig);
  }, [getSpringConfig]);

  // Calculate velocity from position change
  const updateVelocity = useCallback((currentPosition: Vector2D) => {
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

    setState(prev => ({ ...prev, velocity: newVelocity }));

    return newVelocity;
  }, [velocityX, velocityY]);

  // Check for gravity well interaction
  const checkGravityWells = useCallback((
    position: Vector2D,
    velocity: Vector2D
  ): { wellPosition: number | null; force: Vector2D } => {
    if (!config.enableGravityWells) {
      return { wellPosition: null, force: { x: 0, y: 0 } };
    }

    let strongestWell: { position: number; force: Vector2D } | null = null;
    let maxForce = 0;

    for (const well of config.gravityWells) {
      const slot = gridSlotsRef.current.get(well.position);
      if (!slot) continue;

      const force = calculateGravityWellForce(
        position,
        slot.center,
        well.position,
        config
      );

      const forceMagnitude = getSpeed(force);
      if (forceMagnitude > maxForce) {
        maxForce = forceMagnitude;
        strongestWell = { position: well.position, force };
      }
    }

    return {
      wellPosition: strongestWell?.position ?? null,
      force: strongestWell?.force ?? { x: 0, y: 0 },
    };
  }, [config]);

  // Calculate position resistance
  const getResistance = useCallback((itemId: string): number => {
    if (!config.enableResistance || !options.itemTenures) {
      return 0;
    }

    const tenure = options.itemTenures.get(itemId);
    if (!tenure) return 0;

    const tenureMs = Date.now() - tenure;
    return calculatePositionResistance(tenureMs);
  }, [config.enableResistance, options.itemTenures]);

  // Handle drag start
  const handleDragStart = useCallback((itemId: string) => {
    dragStartTimeRef.current = Date.now();

    // Calculate initial resistance
    const resistance = getResistance(itemId);

    setState(prev => ({
      ...prev,
      isDragging: true,
      bounceCount: 0,
      isSettling: false,
      resistance,
    }));

    // Haptic feedback for drag start
    if (config.enableHaptics && isHapticSupported()) {
      triggerHaptic('dragStart');

      // If there's significant resistance, provide feedback
      if (resistance > 0.3) {
        const resistancePattern = getResistancePattern(
          options.itemTenures?.get(itemId) ?? 0
        );
        setTimeout(() => triggerHaptic(resistancePattern), 50);
      }
    }
  }, [config.enableHaptics, getResistance, options.itemTenures]);

  // Handle drag move
  const handleDragMove = useCallback((
    position: Vector2D,
    itemId: string
  ) => {
    const velocity = updateVelocity(position);

    // Check gravity wells
    const { wellPosition, force } = checkGravityWells(position, velocity);

    // Handle gravity well state changes
    if (wellPosition !== state.activeGravityWell) {
      if (wellPosition !== null) {
        // Entering gravity well
        options.onGravityWellEnter?.(wellPosition);

        if (config.enableHaptics) {
          triggerHaptic('gravityWellEnter');
        }
      } else if (state.activeGravityWell !== null) {
        // Leaving gravity well
        options.onGravityWellLeave?.(state.activeGravityWell);
      }

      setState(prev => ({ ...prev, activeGravityWell: wellPosition }));
    }

    // Calculate momentum projection for preview
    const projectedPosition = calculateMomentumProjection(position, velocity);

    // Find nearest grid slot to projected position
    let nearestSlot: number | null = null;
    let nearestDistance = Infinity;

    gridSlotsRef.current.forEach((slot, pos) => {
      const dx = projectedPosition.x - slot.center.x;
      const dy = projectedPosition.y - slot.center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance && distance < 150) {
        nearestDistance = distance;
        nearestSlot = pos;
      }
    });

    setState(prev => ({ ...prev, previewPosition: nearestSlot }));

    return { velocity, force, previewPosition: nearestSlot };
  }, [
    updateVelocity,
    checkGravityWells,
    state.activeGravityWell,
    options.onGravityWellEnter,
    options.onGravityWellLeave,
    config.enableHaptics,
  ]);

  // Handle drag end
  const handleDragEnd = useCallback((
    position: number,
    itemId: string,
    finalPosition: Vector2D
  ) => {
    const velocity = state.velocity;
    const speed = getSpeed(velocity);

    setState(prev => ({
      ...prev,
      isDragging: false,
      activeGravityWell: null,
    }));

    // Haptic feedback for drop
    if (config.enableHaptics) {
      const dropPattern = getDropPositionPattern(position);
      triggerHaptic(dropPattern);

      // Additional flick feedback if high velocity
      if (speed > 300) {
        const flickPattern = getFlickPattern(velocity);
        setTimeout(() => triggerHaptic(flickPattern), 100);
      }
    }

    // Trigger bounce sequence if enabled and has significant velocity
    if (config.enableBounce && speed > 200) {
      const bounceCount = Math.min(
        Math.ceil(speed / 500),
        config.maxBounces
      );

      setState(prev => ({ ...prev, isSettling: true, bounceCount }));

      if (config.enableHaptics) {
        triggerBounceSequence(bounceCount);
      }

      options.onBounce?.(bounceCount);

      // Settle after bounces
      const settleDuration = bounceCount * 150 + 200;
      setTimeout(() => {
        setState(prev => ({ ...prev, isSettling: false }));
        options.onSettle?.(position);
      }, settleDuration);
    } else {
      options.onSettle?.(position);
    }

    return { speed, bounceCount: config.enableBounce ? Math.min(Math.ceil(speed / 500), config.maxBounces) : 0 };
  }, [state.velocity, config.enableHaptics, config.enableBounce, config.maxBounces, options]);

  // Handle swap animation
  const animateSwap = useCallback((
    fromPosition: number,
    toPosition: number,
    duration: number = 300
  ) => {
    const fromSlot = gridSlotsRef.current.get(fromPosition);
    const toSlot = gridSlotsRef.current.get(toPosition);

    if (!fromSlot || !toSlot) return null;

    // Calculate swap paths
    const pathA = calculateSwapPath(fromSlot.center, toSlot.center);
    const pathB = calculateSwapPath(toSlot.center, fromSlot.center);

    // Trigger haptic sequence
    if (config.enableHaptics) {
      triggerSwapSequence(duration);
    }

    return { pathA, pathB, duration };
  }, [config.enableHaptics]);

  // Get bounce animation config
  const getBounceAnimation = useCallback((bounceIndex: number) => {
    const dampingFactor = Math.pow(0.6, bounceIndex);

    return {
      y: [0, -30 * dampingFactor, 0],
      transition: {
        duration: 0.2 + bounceIndex * 0.05,
        ease: 'easeOut',
      },
    };
  }, []);

  // Get gravity well influence at position
  const getGravityWellInfluence = useCallback((position: number): number => {
    const well = config.gravityWells.find(w => w.position === position);
    return well?.strength ?? 0;
  }, [config.gravityWells]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    // State
    state,
    velocityX,
    velocityY,

    // Registration
    registerGridSlot,

    // Handlers
    handleDragStart,
    handleDragMove,
    handleDragEnd,

    // Animation helpers
    animateSwap,
    getBounceAnimation,
    getSpringConfig,
    getFramerConfig,

    // Physics helpers
    getResistance,
    getGravityWellInfluence,
    checkGravityWells,

    // Config
    config,
  };
}

export default usePhysicsGrid;
