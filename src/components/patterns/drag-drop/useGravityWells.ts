/**
 * useGravityWells Hook
 *
 * Manages gravity wells that attract dragged items to specific positions.
 * Used for podium positions and priority drop targets.
 *
 * @example
 * ```tsx
 * const { activeWell, checkPosition, getStrength } = useGravityWells([
 *   { position: 0, radius: 200, strength: 1.0 }, // Gold position
 *   { position: 1, radius: 180, strength: 0.8 }, // Silver
 *   { position: 2, radius: 160, strength: 0.6 }, // Bronze
 * ]);
 *
 * // In drag handler
 * const well = checkPosition({ x: event.clientX, y: event.clientY });
 * if (well) {
 *   triggerHaptic('gravity-enter');
 * }
 * ```
 */

import { useRef, useCallback, useMemo } from 'react';
import type { Vector2D, GravityWell, UseGravityWellsReturn } from './types';

export interface GravityWellsConfig {
  /** Enable/disable gravity wells */
  enabled?: boolean;
  /** Global strength multiplier */
  strengthMultiplier?: number;
  /** Minimum distance to trigger gravity */
  activationThreshold?: number;
  /** Easing function for strength falloff */
  easingFunction?: (normalizedDistance: number) => number;
}

export interface GravityWellWithRef extends GravityWell {
  ref?: React.RefObject<HTMLElement>;
  center?: Vector2D;
}

const DEFAULT_CONFIG: Required<GravityWellsConfig> = {
  enabled: true,
  strengthMultiplier: 1.0,
  activationThreshold: 0.95, // 95% of radius to activate
  easingFunction: (d) => 1 - d * d, // Quadratic falloff
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
 * Get center position of an element
 */
function getElementCenter(element: HTMLElement): Vector2D {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Hook for managing gravity wells that attract dragged items
 */
export function useGravityWells(
  wells: GravityWellWithRef[],
  config: GravityWellsConfig = {}
): UseGravityWellsReturn {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const activeWellRef = useRef<GravityWell | null>(null);
  const wellCentersRef = useRef<Map<number, Vector2D>>(new Map());

  // Update well centers from refs
  const updateWellCenters = useCallback(() => {
    wells.forEach((well) => {
      if (well.ref?.current) {
        wellCentersRef.current.set(
          well.position,
          getElementCenter(well.ref.current)
        );
      } else if (well.center) {
        wellCentersRef.current.set(well.position, well.center);
      }
    });
  }, [wells]);

  /**
   * Check if position is within any gravity well
   * Returns the strongest well if multiple overlap
   */
  const checkPosition = useCallback(
    (position: Vector2D): GravityWell | null => {
      if (!mergedConfig.enabled) return null;

      updateWellCenters();

      let strongestWell: GravityWell | null = null;
      let strongestStrength = 0;

      for (const well of wells) {
        if (well.active === false) continue;

        const center = wellCentersRef.current.get(well.position);
        if (!center) continue;

        const distance = getDistance(position, center);
        const normalizedDistance = distance / well.radius;

        // Check if within activation threshold
        if (normalizedDistance > mergedConfig.activationThreshold) continue;

        // Calculate effective strength
        const falloff = mergedConfig.easingFunction(normalizedDistance);
        const effectiveStrength =
          well.strength * falloff * mergedConfig.strengthMultiplier;

        // Consider priority if multiple wells
        const priority = well.priority ?? 0;
        const weightedStrength = effectiveStrength * (1 + priority * 0.1);

        if (weightedStrength > strongestStrength) {
          strongestStrength = weightedStrength;
          strongestWell = well;
        }
      }

      activeWellRef.current = strongestWell;
      return strongestWell;
    },
    [wells, mergedConfig, updateWellCenters]
  );

  /**
   * Get the strength of gravity at a position (0-1)
   */
  const getStrength = useCallback(
    (position: Vector2D): number => {
      if (!mergedConfig.enabled) return 0;

      updateWellCenters();

      let maxStrength = 0;

      for (const well of wells) {
        if (well.active === false) continue;

        const center = wellCentersRef.current.get(well.position);
        if (!center) continue;

        const distance = getDistance(position, center);
        const normalizedDistance = distance / well.radius;

        if (normalizedDistance > 1) continue;

        const falloff = mergedConfig.easingFunction(normalizedDistance);
        const strength =
          well.strength * falloff * mergedConfig.strengthMultiplier;

        maxStrength = Math.max(maxStrength, strength);
      }

      return Math.min(1, maxStrength);
    },
    [wells, mergedConfig, updateWellCenters]
  );

  /**
   * Register a well center position dynamically
   */
  const registerWellCenter = useCallback(
    (position: number, center: Vector2D) => {
      wellCentersRef.current.set(position, center);
    },
    []
  );

  /**
   * Get the snap target position for current drag position
   */
  const getSnapTarget = useCallback(
    (position: Vector2D): Vector2D | null => {
      const well = checkPosition(position);
      if (!well) return null;

      return wellCentersRef.current.get(well.position) ?? null;
    },
    [checkPosition]
  );

  return {
    activeWell: activeWellRef.current,
    checkPosition,
    getStrength,
    wells,
  };
}

/**
 * Create default podium gravity wells configuration
 */
export function createPodiumWells(): GravityWell[] {
  return [
    { position: 0, radius: 200, strength: 1.0, priority: 100 }, // Gold
    { position: 1, radius: 180, strength: 0.8, priority: 90 }, // Silver
    { position: 2, radius: 160, strength: 0.6, priority: 80 }, // Bronze
  ];
}

/**
 * Create gravity wells for top N positions with decreasing strength
 */
export function createTopNWells(count: number): GravityWell[] {
  return Array.from({ length: count }, (_, i) => ({
    position: i,
    radius: 200 - i * 10,
    strength: 1.0 - i * 0.08,
    priority: 100 - i * 10,
  }));
}

/**
 * Easing functions for gravity falloff
 */
export const gravityEasings = {
  /** Linear falloff */
  linear: (d: number) => 1 - d,
  /** Quadratic falloff (default) */
  quadratic: (d: number) => 1 - d * d,
  /** Cubic falloff (smoother) */
  cubic: (d: number) => 1 - d * d * d,
  /** Exponential falloff (sharper edge) */
  exponential: (d: number) => Math.exp(-d * 3),
  /** Smooth step */
  smoothStep: (d: number) => {
    const t = 1 - d;
    return t * t * (3 - 2 * t);
  },
};

export default useGravityWells;
