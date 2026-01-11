/**
 * Physics Engine for Fluid Grid Interactions
 *
 * Provides physics simulation for drag-and-drop with:
 * - Gravity wells that pull items toward top positions
 * - Momentum and inertia for natural movement
 * - Spring physics for fluid animations
 * - Bounce physics for item settling
 * - Position resistance based on tenure
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface PhysicsBody {
  position: Vector2D;
  velocity: Vector2D;
  mass: number;
  friction: number;
  restitution: number; // Bounciness (0-1)
}

export interface GravityWell {
  position: number; // Grid position (0 = #1, strongest)
  strength: number; // Pull strength
  radius: number; // Effect radius in pixels
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface PhysicsConfig {
  /** Global gravity (vertical pull) */
  gravity: number;
  /** Air resistance/drag coefficient */
  airResistance: number;
  /** Default spring configuration */
  springConfig: SpringConfig;
  /** Gravity wells for top positions */
  gravityWells: GravityWell[];
  /** Maximum velocity cap */
  maxVelocity: number;
  /** Velocity threshold for settling */
  settleThreshold: number;
}

// Default physics configuration
export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 0.3,
  airResistance: 0.02,
  springConfig: {
    stiffness: 300,
    damping: 25,
    mass: 0.8,
  },
  gravityWells: [
    { position: 0, strength: 1.0, radius: 200 }, // #1 - Strongest pull
    { position: 1, strength: 0.8, radius: 180 }, // #2
    { position: 2, strength: 0.6, radius: 160 }, // #3
    { position: 3, strength: 0.3, radius: 120 }, // #4
    { position: 4, strength: 0.2, radius: 100 }, // #5
  ],
  maxVelocity: 2000,
  settleThreshold: 0.5,
};

/**
 * Calculate the gravity well force at a given position
 * Returns a force vector pulling toward the nearest active well
 */
export function calculateGravityWellForce(
  bodyPosition: Vector2D,
  targetPosition: Vector2D,
  gridPosition: number,
  config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): Vector2D {
  const well = config.gravityWells.find(w => w.position === gridPosition);
  if (!well) {
    return { x: 0, y: 0 };
  }

  const dx = targetPosition.x - bodyPosition.x;
  const dy = targetPosition.y - bodyPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Only apply within radius
  if (distance > well.radius || distance === 0) {
    return { x: 0, y: 0 };
  }

  // Force increases as you get closer (inverse relationship)
  const normalizedDistance = 1 - (distance / well.radius);
  const forceMagnitude = well.strength * normalizedDistance * normalizedDistance;

  // Normalize direction and apply force
  return {
    x: (dx / distance) * forceMagnitude * 50,
    y: (dy / distance) * forceMagnitude * 50,
  };
}

/**
 * Calculate spring force for smooth animation
 * F = -kx - cv (Hooke's law with damping)
 */
export function calculateSpringForce(
  current: Vector2D,
  target: Vector2D,
  velocity: Vector2D,
  config: SpringConfig
): Vector2D {
  const displacement = {
    x: target.x - current.x,
    y: target.y - current.y,
  };

  // Spring force (F = kx)
  const springForce = {
    x: displacement.x * config.stiffness,
    y: displacement.y * config.stiffness,
  };

  // Damping force (F = -cv)
  const dampingForce = {
    x: -velocity.x * config.damping,
    y: -velocity.y * config.damping,
  };

  return {
    x: (springForce.x + dampingForce.x) / config.mass,
    y: (springForce.y + dampingForce.y) / config.mass,
  };
}

/**
 * Calculate bounce response when item settles
 * Returns modified velocity after bounce
 */
export function calculateBounce(
  velocity: Vector2D,
  restitution: number,
  surfaceNormal: Vector2D = { x: 0, y: -1 }
): Vector2D {
  // Reflect velocity around surface normal
  const dot = velocity.x * surfaceNormal.x + velocity.y * surfaceNormal.y;

  return {
    x: (velocity.x - 2 * dot * surfaceNormal.x) * restitution,
    y: (velocity.y - 2 * dot * surfaceNormal.y) * restitution,
  };
}

/**
 * Calculate position resistance based on tenure
 * Items that have been in a position longer resist being moved
 */
export function calculatePositionResistance(
  tenureMs: number,
  baseResistance: number = 0.1,
  maxResistance: number = 0.8,
  tenureThreshold: number = 30000 // 30 seconds to reach max
): number {
  const normalizedTenure = Math.min(tenureMs / tenureThreshold, 1);
  // Ease-out curve for resistance buildup
  const easedTenure = 1 - Math.pow(1 - normalizedTenure, 3);

  return baseResistance + (maxResistance - baseResistance) * easedTenure;
}

/**
 * Apply drag/friction to velocity
 */
export function applyDrag(
  velocity: Vector2D,
  dragCoefficient: number
): Vector2D {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed === 0) return velocity;

  // Drag is proportional to velocity squared
  const dragMagnitude = dragCoefficient * speed;
  const dragFactor = Math.max(0, 1 - dragMagnitude / speed);

  return {
    x: velocity.x * dragFactor,
    y: velocity.y * dragFactor,
  };
}

/**
 * Clamp velocity to maximum
 */
export function clampVelocity(
  velocity: Vector2D,
  maxVelocity: number
): Vector2D {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  if (speed <= maxVelocity) return velocity;

  const scale = maxVelocity / speed;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

/**
 * Check if physics body has settled (velocity below threshold)
 */
export function hasSettled(
  velocity: Vector2D,
  threshold: number = DEFAULT_PHYSICS_CONFIG.settleThreshold
): boolean {
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  return speed < threshold;
}

/**
 * Calculate momentum for flicking gesture
 * Returns projected final position based on current velocity
 */
export function calculateMomentumProjection(
  position: Vector2D,
  velocity: Vector2D,
  friction: number = 0.95,
  minVelocity: number = 10
): Vector2D {
  let projectedX = position.x;
  let projectedY = position.y;
  let vx = velocity.x;
  let vy = velocity.y;

  // Simulate until velocity drops below threshold
  let iterations = 0;
  const maxIterations = 100;

  while (Math.abs(vx) > minVelocity || Math.abs(vy) > minVelocity) {
    projectedX += vx * 0.016; // Assuming 60fps
    projectedY += vy * 0.016;
    vx *= friction;
    vy *= friction;
    iterations++;
    if (iterations > maxIterations) break;
  }

  return { x: projectedX, y: projectedY };
}

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
 * Interpolate between two vectors
 */
export function lerpVector(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Create a physics body with default values
 */
export function createPhysicsBody(
  position: Vector2D = { x: 0, y: 0 },
  velocity: Vector2D = { x: 0, y: 0 },
  mass: number = 1,
  friction: number = 0.1,
  restitution: number = 0.6
): PhysicsBody {
  return { position, velocity, mass, friction, restitution };
}

/**
 * Physics simulation step
 * Integrates forces and updates position/velocity
 */
export function physicsStep(
  body: PhysicsBody,
  forces: Vector2D[],
  deltaTime: number,
  config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): PhysicsBody {
  // Sum all forces
  const totalForce = forces.reduce(
    (acc, f) => ({ x: acc.x + f.x, y: acc.y + f.y }),
    { x: 0, y: 0 }
  );

  // Apply gravity
  totalForce.y += config.gravity * body.mass;

  // Calculate acceleration (F = ma, so a = F/m)
  const acceleration = {
    x: totalForce.x / body.mass,
    y: totalForce.y / body.mass,
  };

  // Update velocity (v = v0 + at)
  let newVelocity = {
    x: body.velocity.x + acceleration.x * deltaTime,
    y: body.velocity.y + acceleration.y * deltaTime,
  };

  // Apply air resistance
  newVelocity = applyDrag(newVelocity, config.airResistance);

  // Clamp velocity
  newVelocity = clampVelocity(newVelocity, config.maxVelocity);

  // Update position (x = x0 + vt)
  const newPosition = {
    x: body.position.x + newVelocity.x * deltaTime,
    y: body.position.y + newVelocity.y * deltaTime,
  };

  return {
    ...body,
    position: newPosition,
    velocity: newVelocity,
  };
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

  // Calculate perpendicular offset for curve
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular direction
  const perpX = -dy / distance;
  const perpY = dx / distance;

  // Curve offset (items pass each other in arc)
  const curveOffset = distance * curveIntensity * 0.3;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Ease-in-out for smooth movement
    const easedT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Sine curve for arc (peaks at middle)
    const arcT = Math.sin(t * Math.PI);

    // Linear interpolation + perpendicular arc
    path.push({
      x: fromPosition.x + dx * easedT + perpX * curveOffset * arcT,
      y: fromPosition.y + dy * easedT + perpY * curveOffset * arcT,
    });
  }

  return path;
}

/**
 * Get Framer Motion spring config from physics config
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
  baseConfig: SpringConfig = DEFAULT_PHYSICS_CONFIG.springConfig
): SpringConfig {
  // Positions 0-2 (top 3) get enhanced springs
  if (position < 3) {
    const boost = 1 + (2 - position) * 0.2; // #1 gets 1.4x, #2 gets 1.2x, #3 gets 1x
    return {
      stiffness: baseConfig.stiffness * boost,
      damping: baseConfig.damping * (1 + (2 - position) * 0.1),
      mass: baseConfig.mass * 0.9, // Slightly lighter for snappier response
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
