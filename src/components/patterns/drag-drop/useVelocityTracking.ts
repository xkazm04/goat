/**
 * useVelocityTracking Hook
 *
 * Tracks velocity during drag operations for physics-based animations.
 * Calculates speed, direction, and smoothed velocity from position updates.
 *
 * @example
 * ```tsx
 * const { velocity, updatePosition, reset } = useVelocityTracking({
 *   smoothingFactor: 0.3,
 *   minVelocityThreshold: 10,
 * });
 *
 * // In drag handler
 * updatePosition({ x: event.clientX, y: event.clientY });
 *
 * // Use velocity for animations
 * const rotation = velocity.x * 0.01; // Tilt based on horizontal velocity
 * ```
 */

import { useRef, useCallback, useMemo } from 'react';
import type { Vector2D, DragVelocity, DragPosition, UseVelocityTrackingReturn } from './types';

export interface VelocityTrackingConfig {
  /** Smoothing factor (0-1). Higher = more responsive, lower = smoother */
  smoothingFactor?: number;
  /** Minimum velocity to register (prevents jitter) */
  minVelocityThreshold?: number;
  /** Maximum velocity cap (prevents extreme values) */
  maxVelocity?: number;
  /** Number of samples for averaging */
  sampleSize?: number;
  /** Maximum age of samples in ms */
  maxSampleAge?: number;
}

const DEFAULT_CONFIG: Required<VelocityTrackingConfig> = {
  smoothingFactor: 0.3,
  minVelocityThreshold: 10,
  maxVelocity: 5000,
  sampleSize: 5,
  maxSampleAge: 100,
};

interface VelocitySample {
  position: Vector2D;
  time: number;
  velocity: Vector2D;
}

/**
 * Calculate velocity between two positions
 */
function calculateVelocity(
  current: DragPosition,
  previous: DragPosition
): Vector2D {
  const deltaTime = (current.time - previous.time) / 1000; // Convert to seconds

  if (deltaTime <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (current.x - previous.x) / deltaTime,
    y: (current.y - previous.y) / deltaTime,
  };
}

/**
 * Calculate speed from velocity vector
 */
function getSpeed(velocity: Vector2D): number {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
}

/**
 * Calculate direction from velocity vector (in radians)
 */
function getDirection(velocity: Vector2D): number {
  return Math.atan2(velocity.y, velocity.x);
}

/**
 * Apply smoothing to velocity
 */
function smoothVelocity(
  current: Vector2D,
  previous: Vector2D,
  factor: number
): Vector2D {
  return {
    x: previous.x + (current.x - previous.x) * factor,
    y: previous.y + (current.y - previous.y) * factor,
  };
}

/**
 * Clamp velocity to max value
 */
function clampVelocity(velocity: Vector2D, maxVelocity: number): Vector2D {
  const speed = getSpeed(velocity);

  if (speed <= maxVelocity) {
    return velocity;
  }

  const scale = maxVelocity / speed;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

/**
 * Hook for tracking velocity during drag operations
 */
export function useVelocityTracking(
  config: VelocityTrackingConfig = {}
): UseVelocityTrackingReturn {
  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...config }),
    [config]
  );

  const velocityRef = useRef<DragVelocity>({
    x: 0,
    y: 0,
    speed: 0,
    direction: 0,
  });

  const samplesRef = useRef<VelocitySample[]>([]);
  const lastPositionRef = useRef<DragPosition | null>(null);
  const smoothedVelocityRef = useRef<Vector2D>({ x: 0, y: 0 });

  const updatePosition = useCallback(
    (position: Vector2D) => {
      const now = performance.now();
      const currentPosition: DragPosition = { ...position, time: now };

      // Calculate raw velocity from last position
      if (lastPositionRef.current) {
        const rawVelocity = calculateVelocity(
          currentPosition,
          lastPositionRef.current
        );

        // Apply smoothing
        const smoothed = smoothVelocity(
          rawVelocity,
          smoothedVelocityRef.current,
          mergedConfig.smoothingFactor
        );

        // Clamp to max velocity
        const clamped = clampVelocity(smoothed, mergedConfig.maxVelocity);

        // Apply minimum threshold
        const speed = getSpeed(clamped);
        const finalVelocity: Vector2D =
          speed < mergedConfig.minVelocityThreshold
            ? { x: 0, y: 0 }
            : clamped;

        smoothedVelocityRef.current = finalVelocity;

        // Add sample
        samplesRef.current.push({
          position,
          time: now,
          velocity: finalVelocity,
        });

        // Remove old samples
        const cutoff = now - mergedConfig.maxSampleAge;
        samplesRef.current = samplesRef.current.filter(
          (sample) => sample.time >= cutoff
        );

        // Keep only recent samples
        if (samplesRef.current.length > mergedConfig.sampleSize) {
          samplesRef.current = samplesRef.current.slice(-mergedConfig.sampleSize);
        }

        // Calculate weighted average velocity from samples
        const weightedVelocity = samplesRef.current.reduce(
          (acc, sample, index) => {
            const weight = (index + 1) / samplesRef.current.length;
            return {
              x: acc.x + sample.velocity.x * weight,
              y: acc.y + sample.velocity.y * weight,
            };
          },
          { x: 0, y: 0 }
        );

        const totalWeight =
          (samplesRef.current.length * (samplesRef.current.length + 1)) / 2 /
          samplesRef.current.length;

        const averageVelocity: Vector2D = {
          x: weightedVelocity.x / totalWeight,
          y: weightedVelocity.y / totalWeight,
        };

        // Update velocity ref
        velocityRef.current = {
          x: averageVelocity.x,
          y: averageVelocity.y,
          speed: getSpeed(averageVelocity),
          direction: getDirection(averageVelocity),
        };
      }

      lastPositionRef.current = currentPosition;
    },
    [mergedConfig]
  );

  const reset = useCallback(() => {
    velocityRef.current = { x: 0, y: 0, speed: 0, direction: 0 };
    smoothedVelocityRef.current = { x: 0, y: 0 };
    samplesRef.current = [];
    lastPositionRef.current = null;
  }, []);

  // Return stable reference to velocity
  const velocity = useMemo(() => velocityRef.current, []);

  return {
    velocity: velocityRef.current,
    updatePosition,
    reset,
  };
}

/**
 * Utility: Get velocity-based rotation for drag overlays
 * @param velocity Current velocity
 * @param maxRotation Maximum rotation in degrees
 * @returns Rotation in degrees
 */
export function getVelocityRotation(
  velocity: DragVelocity,
  maxRotation: number = 15
): number {
  return Math.max(-maxRotation, Math.min(maxRotation, velocity.x * 0.01));
}

/**
 * Utility: Get velocity-based shadow intensity
 * @param velocity Current velocity
 * @param maxIntensity Maximum shadow intensity (0-1)
 * @returns Shadow intensity (0-1)
 */
export function getVelocityShadowIntensity(
  velocity: DragVelocity,
  maxIntensity: number = 1
): number {
  return Math.min(maxIntensity, velocity.speed / 500);
}

/**
 * Utility: Get velocity-based scale boost
 * @param velocity Current velocity
 * @param maxBoost Maximum scale boost
 * @returns Scale multiplier (1 + boost)
 */
export function getVelocityScaleBoost(
  velocity: DragVelocity,
  maxBoost: number = 0.1
): number {
  return 1 + Math.min(maxBoost, velocity.speed / 2000);
}

export default useVelocityTracking;
