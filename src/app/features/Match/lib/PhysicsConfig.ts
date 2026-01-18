/**
 * PhysicsConfig
 * Centralized physics constants and configuration for the match grid
 * Extracts all magic numbers for maintainability and tuning
 */

/**
 * Gravity well configuration for top positions
 */
export interface GravityWellConfig {
  position: number;
  radius: number;
  strength: number;
}

/**
 * Spring physics configuration
 */
export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

/**
 * Velocity thresholds for physics effects
 */
export const VELOCITY_THRESHOLDS = {
  /** Speed above which to trigger flick feedback */
  FLICK: 300,
  /** Speed above which to trigger bounce feedback */
  BOUNCE: 200,
  /** Maximum bounces for high-speed drops */
  MAX_BOUNCES: 3,
  /** Speed divisor for calculating bounce count */
  BOUNCE_DIVISOR: 500,
} as const;

/**
 * Gravity well configurations for top positions
 */
export const GRAVITY_WELLS: GravityWellConfig[] = [
  { position: 0, radius: 200, strength: 1.0 },
  { position: 1, radius: 180, strength: 0.8 },
  { position: 2, radius: 160, strength: 0.6 },
  { position: 3, radius: 120, strength: 0.3 },
  { position: 4, radius: 100, strength: 0.2 },
];

/**
 * Get gravity strength for a position
 */
export function getGravityStrength(position: number): number {
  if (position < 3) return 0.8;
  if (position < 5) return 0.5;
  return 0.3;
}

/**
 * Spring configurations for different effects
 */
export const SPRING_CONFIGS = {
  /** Cursor glow following */
  cursorGlow: {
    damping: 15,
    stiffness: 150,
    mass: 0.5,
  } as SpringConfig,

  /** Drop snap animation */
  dropSnap: {
    damping: 25,
    stiffness: 300,
    mass: 1,
  } as SpringConfig,

  /** Swap animation */
  swap: {
    damping: 20,
    stiffness: 200,
    mass: 0.8,
  } as SpringConfig,

  /** Bounce animation */
  bounce: {
    damping: 10,
    stiffness: 400,
    mass: 0.5,
  } as SpringConfig,
} as const;

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
  /** Snap animation duration */
  SNAP_DURATION: 300,
  /** Swap animation duration */
  SWAP_DURATION: 350,
  /** Swap state clear delay */
  SWAP_CLEAR_DELAY: 400,
  /** Share modal delay after completion */
  SHARE_MODAL_DELAY: 500,
  /** Position resistance threshold (item in position for X ms shows resistance) */
  POSITION_RESISTANCE_THRESHOLD: 10000,
  /** Haptic resistance delay */
  HAPTIC_RESISTANCE_DELAY: 50,
  /** Flick haptic delay */
  HAPTIC_FLICK_DELAY: 100,
} as const;

/**
 * Trail configuration
 */
export const TRAIL_CONFIG = {
  /** Maximum trail positions to keep */
  MAX_POSITIONS: 20,
} as const;

/**
 * Sensor configuration for drag operations
 */
export const SENSOR_CONFIG = {
  /** Distance threshold to start drag (pixels) */
  ACTIVATION_DISTANCE: 3,
} as const;

/**
 * Magnetic snap configuration
 */
export const MAGNETIC_CONFIG = {
  /** Distance from center to activate magnetism */
  THRESHOLD: 120,
  /** Minimum magnetic strength */
  STRENGTH_MIN: 0.3,
  /** Maximum magnetic strength */
  STRENGTH_MAX: 0.7,
} as const;

/**
 * Animation variants for different states
 */
export const ANIMATION_VARIANTS = {
  /** Scale values for podium bounce */
  podiumBounce: [1, 1.2, 0.92, 1.08, 0.98, 1.02, 1],
  /** Scale values for normal bounce */
  normalBounce: [1, 1.15, 0.95, 1.02, 1],
  /** Rotation values for podium wiggle */
  podiumWiggle: [0, -2, 2, -1, 1, 0],
  /** Hover scale for valid drop zones */
  dropZoneHover: 1.05,
  /** Hover scale when item is over slot */
  itemOverScale: 1.08,
} as const;

/**
 * Z-index layers for drag elements
 */
export const Z_INDEX = {
  /** Background grid */
  BACKGROUND: 0,
  /** Normal grid slots */
  GRID_SLOT: 10,
  /** Hovered slot */
  HOVERED_SLOT: 20,
  /** Drag overlay */
  DRAG_OVERLAY: 100,
  /** Swap animation */
  SWAP_ANIMATION: 150,
  /** Cursor effects */
  CURSOR_EFFECTS: 200,
} as const;

/**
 * Color configuration for physics effects
 */
export const PHYSICS_COLORS = {
  /** Gravity well connector color */
  gravityWellConnector: 'rgba(6, 182, 212, 0.5)',
  /** Magnetic snap glow */
  magneticGlow: 'rgba(22, 211, 238, 0.4)',
  /** Trail color */
  trail: 'rgba(34, 211, 238, 0.3)',
} as const;

/**
 * Check if a position is within a gravity well
 */
export function isInGravityWell(
  cursorPosition: { x: number; y: number },
  elementRect: DOMRect,
  well: GravityWellConfig
): boolean {
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;

  const dx = centerX - cursorPosition.x;
  const dy = centerY - cursorPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < well.radius;
}

/**
 * Calculate bounce count based on speed
 */
export function calculateBounceCount(speed: number): number {
  return Math.min(
    Math.ceil(speed / VELOCITY_THRESHOLDS.BOUNCE_DIVISOR),
    VELOCITY_THRESHOLDS.MAX_BOUNCES
  );
}

/**
 * Calculate magnetic strength based on distance
 */
export function calculateMagneticStrength(distance: number): number {
  if (distance >= MAGNETIC_CONFIG.THRESHOLD) {
    return 0;
  }

  const normalizedDistance = distance / MAGNETIC_CONFIG.THRESHOLD;
  return (
    MAGNETIC_CONFIG.STRENGTH_MIN +
    (1 - normalizedDistance) *
      (MAGNETIC_CONFIG.STRENGTH_MAX - MAGNETIC_CONFIG.STRENGTH_MIN)
  );
}

export default {
  VELOCITY_THRESHOLDS,
  GRAVITY_WELLS,
  SPRING_CONFIGS,
  TIMING,
  TRAIL_CONFIG,
  SENSOR_CONFIG,
  MAGNETIC_CONFIG,
  ANIMATION_VARIANTS,
  Z_INDEX,
  PHYSICS_COLORS,
};
