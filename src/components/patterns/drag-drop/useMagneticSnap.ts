/**
 * useMagneticSnap Hook
 *
 * Provides magnetic snap physics for drop zones.
 * Calculates attraction strength based on cursor distance.
 *
 * @example
 * ```tsx
 * const { isInRange, strength, calculateSnap } = useMagneticSnap({
 *   radius: 100,
 *   strength: 0.8,
 *   minStrength: 0.3,
 * });
 *
 * // In drop zone
 * useEffect(() => {
 *   if (isInRange && isDragging) {
 *     setHighlight(true);
 *     setOpacity(0.5 + strength * 0.5);
 *   }
 * }, [isInRange, strength, isDragging]);
 * ```
 */

import { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import type { Vector2D, MagneticConfig, UseMagneticSnapReturn } from './types';

export interface MagneticSnapConfig extends MagneticConfig {
  /** Enable/disable magnetic snap */
  enabled?: boolean;
  /** Easing function for strength calculation */
  easingFunction?: (normalizedDistance: number) => number;
  /** Snap threshold (0-1) - below this distance, snap to center */
  snapThreshold?: number;
  /** Debounce updates in ms */
  debounceMs?: number;
}

const DEFAULT_CONFIG: Required<MagneticSnapConfig> = {
  radius: 100,
  strength: 0.7,
  priority: 50,
  minStrength: 0.3,
  maxStrength: 0.8,
  enabled: true,
  easingFunction: (d) => 1 - d, // Linear falloff
  snapThreshold: 0.2,
  debounceMs: 16,
};

/**
 * Calculate distance between two points
 */
function getDistance(a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Interpolate between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Hook for magnetic snap physics on drop zones
 */
export function useMagneticSnap(
  targetRef: React.RefObject<HTMLElement>,
  config: Partial<MagneticSnapConfig> = {}
): UseMagneticSnapReturn {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const [isInRange, setIsInRange] = useState(false);
  const [strength, setStrength] = useState(0);
  const [targetPosition, setTargetPosition] = useState<Vector2D | null>(null);

  const lastUpdateRef = useRef<number>(0);
  const centerRef = useRef<Vector2D | null>(null);

  /**
   * Update center position from target element
   */
  const updateCenter = useCallback(() => {
    if (!targetRef.current) return null;

    const rect = targetRef.current.getBoundingClientRect();
    const center: Vector2D = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    centerRef.current = center;
    return center;
  }, [targetRef]);

  /**
   * Calculate magnetic strength at a position
   */
  const calculateStrength = useCallback(
    (position: Vector2D): number => {
      if (!mergedConfig.enabled) return 0;

      const center = centerRef.current ?? updateCenter();
      if (!center) return 0;

      const distance = getDistance(position, center);
      const normalizedDistance = distance / mergedConfig.radius;

      if (normalizedDistance > 1) return 0;

      // Apply easing
      const easedDistance = mergedConfig.easingFunction(normalizedDistance);

      // Interpolate between min and max strength
      const magneticStrength = lerp(
        mergedConfig.minStrength,
        mergedConfig.maxStrength,
        easedDistance
      );

      return magneticStrength * mergedConfig.strength;
    },
    [mergedConfig, updateCenter]
  );

  /**
   * Calculate snap position for cursor
   */
  const calculateSnap = useCallback(
    (cursorPosition: Vector2D): Vector2D => {
      if (!mergedConfig.enabled) return cursorPosition;

      const center = centerRef.current ?? updateCenter();
      if (!center) return cursorPosition;

      const distance = getDistance(cursorPosition, center);
      const normalizedDistance = distance / mergedConfig.radius;

      // If outside range, return cursor position
      if (normalizedDistance > 1) return cursorPosition;

      // If very close, snap to center
      if (normalizedDistance < mergedConfig.snapThreshold) {
        return center;
      }

      // Calculate attraction towards center
      const strength = calculateStrength(cursorPosition);
      const dx = center.x - cursorPosition.x;
      const dy = center.y - cursorPosition.y;

      return {
        x: cursorPosition.x + dx * strength,
        y: cursorPosition.y + dy * strength,
      };
    },
    [mergedConfig, updateCenter, calculateStrength]
  );

  /**
   * Update state based on cursor position (debounced)
   */
  const updateFromPosition = useCallback(
    (position: Vector2D) => {
      const now = performance.now();
      if (now - lastUpdateRef.current < mergedConfig.debounceMs) return;
      lastUpdateRef.current = now;

      const center = centerRef.current ?? updateCenter();
      if (!center) {
        setIsInRange(false);
        setStrength(0);
        setTargetPosition(null);
        return;
      }

      const distance = getDistance(position, center);
      const inRange = distance <= mergedConfig.radius;

      setIsInRange(inRange);
      setStrength(inRange ? calculateStrength(position) : 0);
      setTargetPosition(inRange ? calculateSnap(position) : null);
    },
    [mergedConfig, updateCenter, calculateStrength, calculateSnap]
  );

  return {
    isInRange,
    strength,
    targetPosition,
    calculateSnap,
  };
}

/**
 * Hook for registering a drop zone with a magnetic physics provider
 */
export function useMagneticDropZone(
  position: number,
  containerRef: React.RefObject<HTMLElement>,
  config: Partial<MagneticConfig> = {},
  register?: (position: number, config: MagneticConfig & { ref: React.RefObject<HTMLElement> }) => void,
  unregister?: (position: number) => void
): void {
  const mergedConfig = useMemo<MagneticConfig>(
    () => ({
      radius: 100,
      strength: 0.7,
      priority: 50,
      minStrength: 0.3,
      maxStrength: 0.8,
      ...config,
    }),
    [config]
  );

  useEffect(() => {
    if (!containerRef.current || !register) return;

    register(position, { ...mergedConfig, ref: containerRef });

    return () => {
      unregister?.(position);
    };
  }, [position, containerRef, mergedConfig, register, unregister]);
}

/**
 * Preset configurations for common use cases
 */
export const magneticPresets = {
  /** Podium positions (top 3) - strong attraction */
  podium: {
    radius: 120,
    strength: 0.9,
    minStrength: 0.5,
    maxStrength: 0.9,
    priority: 100,
  },
  /** Top 10 positions - medium attraction */
  top10: {
    radius: 100,
    strength: 0.7,
    minStrength: 0.3,
    maxStrength: 0.7,
    priority: 80,
  },
  /** Standard positions - light attraction */
  standard: {
    radius: 80,
    strength: 0.5,
    minStrength: 0.2,
    maxStrength: 0.5,
    priority: 50,
  },
  /** Weak attraction for background slots */
  weak: {
    radius: 60,
    strength: 0.3,
    minStrength: 0.1,
    maxStrength: 0.3,
    priority: 20,
  },
};

/**
 * Get magnetic preset based on position
 */
export function getMagneticPreset(position: number): MagneticConfig {
  if (position < 3) return magneticPresets.podium;
  if (position < 10) return magneticPresets.top10;
  if (position < 25) return magneticPresets.standard;
  return magneticPresets.weak;
}

export default useMagneticSnap;
