/**
 * Drag Animation Engine
 *
 * Provides animation utilities for drag-and-drop visual effects:
 * - Spring physics for smooth Framer Motion animations
 * - Position-aware spring configs (top positions snap faster)
 * - Swap path calculations for curved swap animations
 * - Velocity helpers for drag overlay effects
 *
 * Note: This module only drives cosmetic animations, not drag logic.
 * See grid-store.ts and DragOperationRouter for actual drag handling.
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const DEFAULT_SPRING_CONFIG: SpringConfig = {
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

/**
 * Get velocity magnitude (speed)
 */
export function getSpeed(velocity: Vector2D): number {
  return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
}

/**
 * Get direction from velocity (normalized)
 */
export function getDirection(velocity: Vector2D): Vector2D {
  const speed = getSpeed(velocity);
  if (speed === 0) return { x: 0, y: 0 };
  return { x: velocity.x / speed, y: velocity.y / speed };
}

/**
 * Calculate swap animation path between two positions
 * Returns curved path points for fluid swap animation
 */
export function calculateSwapPath(
  fromPosition: Vector2D,
  toPosition: Vector2D,
  steps: number = 20,
  curveIntensity: number = 0.5
): Vector2D[] {
  const path: Vector2D[] = [];

  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular direction for arc
  const perpX = -dy / distance;
  const perpY = dx / distance;
  const curveOffset = distance * curveIntensity * 0.3;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Ease-in-out
    const easedT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Sine curve for arc (peaks at middle)
    const arcT = Math.sin(t * Math.PI);

    path.push({
      x: fromPosition.x + dx * easedT + perpX * curveOffset * arcT,
      y: fromPosition.y + dy * easedT + perpY * curveOffset * arcT,
    });
  }

  return path;
}

/**
 * Get Framer Motion spring config from SpringConfig
 */
export function getFramerSpringConfig(config: SpringConfig): {
  stiffness: number;
  damping: number;
  mass: number;
} {
  return {
    stiffness: config.stiffness,
    damping: config.damping,
    mass: config.mass,
  };
}

/**
 * Position-aware spring config
 * Top positions get snappier springs, lower positions are more relaxed
 */
export function getPositionAwareSpringConfig(
  position: number,
  baseConfig: SpringConfig = DEFAULT_SPRING_CONFIG
): SpringConfig {
  // Positions 0-2 (top 3) get enhanced springs
  if (position < 3) {
    const boost = 1 + (2 - position) * 0.2; // #1 gets 1.4x, #2 gets 1.2x, #3 gets 1x
    return {
      stiffness: baseConfig.stiffness * boost,
      damping: baseConfig.damping * (1 + (2 - position) * 0.1),
      mass: baseConfig.mass * 0.9,
    };
  }

  // Positions 3-9 get standard config
  if (position < 10) {
    return baseConfig;
  }

  // Lower positions get more relaxed springs
  return {
    stiffness: baseConfig.stiffness * 0.8,
    damping: baseConfig.damping * 1.2,
    mass: baseConfig.mass * 1.1,
  };
}
