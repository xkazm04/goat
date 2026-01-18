/**
 * Drag-Drop Pattern Library
 *
 * Reusable drag-drop primitives and hooks for building
 * interactive drag-and-drop interfaces.
 *
 * @example
 * ```tsx
 * import {
 *   useVelocityTracking,
 *   useGravityWells,
 *   useMagneticSnap,
 *   createPodiumWells,
 *   magneticPresets,
 * } from '@/components/patterns/drag-drop';
 *
 * // Track velocity during drag
 * const { velocity, updatePosition } = useVelocityTracking();
 *
 * // Set up gravity wells for podium positions
 * const { activeWell, checkPosition } = useGravityWells(createPodiumWells());
 *
 * // Add magnetic snap to drop zones
 * const { isInRange, strength } = useMagneticSnap(ref, magneticPresets.podium);
 * ```
 */

// Types
export * from './types';

// Hooks
export {
  useVelocityTracking,
  getVelocityRotation,
  getVelocityShadowIntensity,
  getVelocityScaleBoost,
  type VelocityTrackingConfig,
} from './useVelocityTracking';

export {
  useGravityWells,
  createPodiumWells,
  createTopNWells,
  gravityEasings,
  type GravityWellsConfig,
  type GravityWellWithRef,
} from './useGravityWells';

export {
  useMagneticSnap,
  useMagneticDropZone,
  magneticPresets,
  getMagneticPreset,
  type MagneticSnapConfig,
} from './useMagneticSnap';
