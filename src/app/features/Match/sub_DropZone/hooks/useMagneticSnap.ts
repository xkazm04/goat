/**
 * useMagneticSnap Hook
 * Encapsulates magnetic threshold calculations and strength for drop zones.
 *
 * When a dragged item enters the magnetic threshold radius of a drop zone,
 * this hook calculates the "magnetic strength" - a value that increases
 * as the cursor gets closer to the center of the drop zone.
 */

import { useMemo, useRef, useEffect, RefObject } from "react";

// Constants for magnetic snap effect
export const MAGNETIC_THRESHOLD = 120; // pixels from center to activate magnetism
export const MAGNETIC_STRENGTH_MIN = 0.3;
export const MAGNETIC_STRENGTH_MAX = 0.7;

export interface MagneticSnapOptions {
  /** Whether global drag is active */
  isDragging: boolean;
  /** Whether this drop zone should respond to magnetic effect */
  isValidDropTarget: boolean;
  /** Current cursor position */
  cursorPosition: { x: number; y: number };
  /** Reference to the container element */
  containerRef: RefObject<HTMLElement | null>;
  /** Custom threshold distance (default: 120) */
  threshold?: number;
  /** Minimum strength value (default: 0.3) */
  minStrength?: number;
  /** Maximum strength value (default: 0.7) */
  maxStrength?: number;
}

export interface MagneticSnapResult {
  /** Calculated magnetic strength (0 to maxStrength) */
  strength: number;
  /** Whether the cursor is within magnetic range */
  isInRange: boolean;
  /** Distance from cursor to center of container */
  distance: number;
  /** Normalized distance (0 = at center, 1 = at threshold) */
  normalizedDistance: number;
}

/**
 * Calculate magnetic snap strength based on cursor proximity
 *
 * @param options Configuration options
 * @returns Magnetic snap calculation results
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { strength, isInRange } = useMagneticSnap({
 *   isDragging: true,
 *   isValidDropTarget: !isOccupied,
 *   cursorPosition: { x: 100, y: 200 },
 *   containerRef,
 * });
 * ```
 */
export function useMagneticSnap({
  isDragging,
  isValidDropTarget,
  cursorPosition,
  containerRef,
  threshold = MAGNETIC_THRESHOLD,
  minStrength = MAGNETIC_STRENGTH_MIN,
  maxStrength = MAGNETIC_STRENGTH_MAX,
}: MagneticSnapOptions): MagneticSnapResult {
  // Cache the bounding rect to avoid layout thrashing on every mouse move.
  // Recalculate only when drag starts, or on scroll/resize.
  const cachedRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    if (!isDragging || !containerRef.current) {
      cachedRectRef.current = null;
      return;
    }

    // Snapshot rect on drag start
    cachedRectRef.current = containerRef.current.getBoundingClientRect();

    // Refresh on scroll or resize (rects shift)
    const refresh = () => {
      if (containerRef.current) {
        cachedRectRef.current = containerRef.current.getBoundingClientRect();
      }
    };

    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    window.addEventListener('resize', refresh, { passive: true });

    return () => {
      window.removeEventListener('scroll', refresh, true);
      window.removeEventListener('resize', refresh);
    };
  }, [isDragging, containerRef]);

  return useMemo(() => {
    // Early return if not in a valid drag state
    if (!isDragging || !isValidDropTarget || !cachedRectRef.current) {
      return {
        strength: 0,
        isInRange: false,
        distance: Infinity,
        normalizedDistance: 1,
      };
    }

    const rect = cachedRectRef.current;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = cursorPosition.x - centerX;
    const dy = cursorPosition.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Outside threshold range
    if (distance >= threshold) {
      return {
        strength: 0,
        isInRange: false,
        distance,
        normalizedDistance: 1,
      };
    }

    // Calculate strength: closer = stronger
    const normalizedDistance = distance / threshold;
    const strength = minStrength + (1 - normalizedDistance) * (maxStrength - minStrength);
    const clampedStrength = Math.min(maxStrength, Math.max(minStrength, strength));

    return {
      strength: clampedStrength,
      isInRange: true,
      distance,
      normalizedDistance,
    };
  }, [isDragging, isValidDropTarget, cursorPosition.x, cursorPosition.y, threshold, minStrength, maxStrength]);
}

/**
 * Get glow style properties based on magnetic strength
 * Utility function to generate consistent glow effects
 */
export function getMagneticGlowStyles(strength: number, color: string = 'rgb(22, 211, 238)') {
  if (strength <= 0) return null;

  // Extract RGB values from color string for rgba calculations
  const rgbMatch = color.match(/\d+/g);
  const [r, g, b] = rgbMatch ? rgbMatch.map(Number) : [22, 211, 238];

  return {
    boxShadow: `
      0 0 ${15 + strength * 25}px rgba(${r}, ${g}, ${b}, ${0.3 + strength * 0.3}),
      0 0 ${30 + strength * 40}px rgba(${r}, ${g}, ${b}, ${0.2 + strength * 0.2}),
      inset 0 0 ${10 + strength * 15}px rgba(${r}, ${g}, ${b}, ${0.1 + strength * 0.15})
    `,
    border: `2px solid rgba(${r}, ${g}, ${b}, ${0.4 + strength * 0.4})`,
    scale: 1 + strength * 0.05,
  };
}

export default useMagneticSnap;
