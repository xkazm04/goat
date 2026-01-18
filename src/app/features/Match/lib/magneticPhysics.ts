/**
 * Magnetic Physics System
 * Handles magnetic field calculations, snap interpolation, and attraction forces
 */

import {
  SpatialHashGrid,
  createMagneticFieldHash,
  Point,
  QueryResult,
  distance,
  normalizeDistance,
  lerp,
} from './spatialHash';

/**
 * Magnetic field configuration for a drop zone
 */
export interface MagneticFieldConfig {
  /** Position index (grid slot) */
  position: number;
  /** Center point of the field */
  center: Point;
  /** Field radius (pixels) */
  radius: number;
  /** Attraction strength (0-1) */
  strength: number;
  /** Priority for overlap resolution (higher = wins) */
  priority: number;
  /** Whether field is currently active */
  active: boolean;
}

/**
 * Magnetic field with calculated properties
 */
export interface MagneticField extends MagneticFieldConfig {
  /** Unique identifier */
  id: string;
  /** Inner snap radius (auto-snap threshold) */
  snapRadius: number;
  /** Haptic trigger thresholds */
  hapticThresholds: {
    outer: number;  // First haptic trigger
    middle: number; // Second haptic trigger
    inner: number;  // Third haptic trigger
  };
}

/**
 * State of magnetic interaction for an item
 */
export interface MagneticState {
  /** Whether item is in any magnetic field */
  inField: boolean;
  /** Currently active field (highest priority when overlapping) */
  activeField: MagneticField | null;
  /** All fields the item is currently in */
  affectedFields: MagneticField[];
  /** Current pull strength (0-1) */
  pullStrength: number;
  /** Direction of pull (normalized) */
  pullDirection: Point;
  /** Suggested interpolated position */
  suggestedPosition: Point;
  /** Whether item should auto-snap */
  shouldSnap: boolean;
  /** Distance to active field center */
  distanceToCenter: number;
  /** Current haptic level (0-3) */
  hapticLevel: number;
  /** Previous haptic level (for detecting changes) */
  previousHapticLevel: number;
}

/**
 * Snap interpolation configuration
 */
export interface SnapInterpolationConfig {
  /** Interpolation factor (0-1, higher = faster snap) */
  factor: number;
  /** Minimum distance to consider snapped */
  snapThreshold: number;
  /** Whether to use spring physics */
  useSpring: boolean;
  /** Spring configuration */
  spring: {
    stiffness: number;
    damping: number;
    mass: number;
  };
}

/**
 * Default field configurations by position importance
 */
export const DEFAULT_FIELD_CONFIGS = {
  /** Podium positions (1-3) */
  podium: {
    radius: 120,
    strength: 0.9,
    snapRadius: 40,
    priority: 100,
  },
  /** Top 10 positions */
  top10: {
    radius: 100,
    strength: 0.7,
    snapRadius: 35,
    priority: 80,
  },
  /** Top 25 positions */
  top25: {
    radius: 80,
    strength: 0.5,
    snapRadius: 30,
    priority: 60,
  },
  /** Regular positions */
  regular: {
    radius: 60,
    strength: 0.3,
    snapRadius: 25,
    priority: 40,
  },
} as const;

/**
 * Get field configuration for a position
 */
export function getFieldConfigForPosition(position: number): typeof DEFAULT_FIELD_CONFIGS[keyof typeof DEFAULT_FIELD_CONFIGS] {
  if (position < 3) return DEFAULT_FIELD_CONFIGS.podium;
  if (position < 10) return DEFAULT_FIELD_CONFIGS.top10;
  if (position < 25) return DEFAULT_FIELD_CONFIGS.top25;
  return DEFAULT_FIELD_CONFIGS.regular;
}

/**
 * Haptic thresholds as percentage of radius
 */
const HAPTIC_THRESHOLD_PERCENTAGES = {
  outer: 0.8,   // 80px at r=100
  middle: 0.5,  // 50px at r=100
  inner: 0.2,   // 20px at r=100
};

/**
 * MagneticFieldManager
 * Calculates and caches magnetic field positions
 */
export class MagneticFieldManager {
  private spatialHash: SpatialHashGrid<MagneticField>;
  private fields: Map<string, MagneticField> = new Map();
  private lastState: MagneticState | null = null;

  constructor(cellSize: number = 150) {
    this.spatialHash = createMagneticFieldHash<MagneticField>(cellSize);
  }

  /**
   * Create a magnetic field for a position
   */
  createField(config: MagneticFieldConfig): MagneticField {
    const baseConfig = getFieldConfigForPosition(config.position);

    const field: MagneticField = {
      ...config,
      id: `field-${config.position}`,
      radius: config.radius || baseConfig.radius,
      strength: config.strength || baseConfig.strength,
      priority: config.priority || baseConfig.priority,
      snapRadius: baseConfig.snapRadius,
      hapticThresholds: {
        outer: (config.radius || baseConfig.radius) * HAPTIC_THRESHOLD_PERCENTAGES.outer,
        middle: (config.radius || baseConfig.radius) * HAPTIC_THRESHOLD_PERCENTAGES.middle,
        inner: (config.radius || baseConfig.radius) * HAPTIC_THRESHOLD_PERCENTAGES.inner,
      },
    };

    return field;
  }

  /**
   * Register a magnetic field
   */
  registerField(config: MagneticFieldConfig): MagneticField {
    const field = this.createField(config);
    this.fields.set(field.id, field);

    // Add to spatial hash
    this.spatialHash.insert({
      id: field.id,
      position: field.center,
      radius: field.radius,
      data: field,
    });

    return field;
  }

  /**
   * Update a field's center position (e.g., on resize)
   */
  updateFieldCenter(position: number, center: Point): void {
    const id = `field-${position}`;
    const field = this.fields.get(id);
    if (field) {
      field.center = center;
      this.spatialHash.update(id, center);
    }
  }

  /**
   * Set field active state
   */
  setFieldActive(position: number, active: boolean): void {
    const id = `field-${position}`;
    const field = this.fields.get(id);
    if (field) {
      field.active = active;
    }
  }

  /**
   * Remove a field
   */
  removeField(position: number): void {
    const id = `field-${position}`;
    this.fields.delete(id);
    this.spatialHash.remove(id);
  }

  /**
   * Clear all fields
   */
  clearFields(): void {
    this.fields.clear();
    this.spatialHash.clear();
    this.lastState = null;
  }

  /**
   * Calculate magnetic state for a cursor position
   */
  calculateMagneticState(cursorPosition: Point): MagneticState {
    // Find all fields containing the cursor
    const results = this.spatialHash.findContaining(cursorPosition);
    const affectedFields = results
      .map((r) => r.entity.data)
      .filter((f) => f.active);

    // Default state
    const state: MagneticState = {
      inField: affectedFields.length > 0,
      activeField: null,
      affectedFields,
      pullStrength: 0,
      pullDirection: { x: 0, y: 0 },
      suggestedPosition: cursorPosition,
      shouldSnap: false,
      distanceToCenter: Infinity,
      hapticLevel: 0,
      previousHapticLevel: this.lastState?.hapticLevel ?? 0,
    };

    if (affectedFields.length === 0) {
      this.lastState = state;
      return state;
    }

    // Resolve overlapping fields - highest priority wins
    affectedFields.sort((a, b) => b.priority - a.priority);
    const activeField = affectedFields[0];
    state.activeField = activeField;

    // Calculate distance to active field center
    const dist = distance(cursorPosition, activeField.center);
    state.distanceToCenter = dist;

    // Calculate pull strength (inverse of normalized distance)
    const normalizedDist = normalizeDistance(dist, activeField.radius);
    state.pullStrength = (1 - normalizedDist) * activeField.strength;

    // Calculate pull direction (toward center)
    if (dist > 0.001) {
      state.pullDirection = {
        x: (activeField.center.x - cursorPosition.x) / dist,
        y: (activeField.center.y - cursorPosition.y) / dist,
      };
    }

    // Calculate suggested position with interpolation
    const interpolationFactor = state.pullStrength * 0.3; // Subtle pull
    state.suggestedPosition = lerp(
      cursorPosition,
      activeField.center,
      interpolationFactor
    );

    // Check if should auto-snap
    state.shouldSnap = dist <= activeField.snapRadius;

    // Calculate haptic level based on thresholds
    if (dist <= activeField.hapticThresholds.inner) {
      state.hapticLevel = 3;
    } else if (dist <= activeField.hapticThresholds.middle) {
      state.hapticLevel = 2;
    } else if (dist <= activeField.hapticThresholds.outer) {
      state.hapticLevel = 1;
    } else {
      state.hapticLevel = 0;
    }

    this.lastState = state;
    return state;
  }

  /**
   * Get combined pull from all affected fields (for multi-magnet resolution)
   */
  calculateCombinedPull(cursorPosition: Point): Point {
    const results = this.spatialHash.findContaining(cursorPosition);
    const activeFields = results
      .map((r) => r.entity.data)
      .filter((f) => f.active);

    if (activeFields.length === 0) {
      return cursorPosition;
    }

    // Weighted average of all pulls
    let totalWeight = 0;
    let pullX = 0;
    let pullY = 0;

    for (const field of activeFields) {
      const dist = distance(cursorPosition, field.center);
      const normalizedDist = normalizeDistance(dist, field.radius);
      const weight = (1 - normalizedDist) * field.strength * field.priority;

      pullX += field.center.x * weight;
      pullY += field.center.y * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return cursorPosition;
    }

    // Blend between cursor position and weighted pull center
    const pullCenter = { x: pullX / totalWeight, y: pullY / totalWeight };
    const blendFactor = Math.min(0.3, totalWeight / 100); // Cap blend at 30%

    return lerp(cursorPosition, pullCenter, blendFactor);
  }

  /**
   * Find nearest field to a point
   */
  findNearestField(point: Point): MagneticField | null {
    const result = this.spatialHash.findNearest(point);
    return result?.entity.data ?? null;
  }

  /**
   * Get all registered fields
   */
  getAllFields(): MagneticField[] {
    return Array.from(this.fields.values());
  }

  /**
   * Get field by position
   */
  getField(position: number): MagneticField | undefined {
    return this.fields.get(`field-${position}`);
  }

  /**
   * Get statistics
   */
  getStats(): { fieldCount: number; hashStats: ReturnType<SpatialHashGrid['getStats']> } {
    return {
      fieldCount: this.fields.size,
      hashStats: this.spatialHash.getStats(),
    };
  }
}

/**
 * SnapInterpolator
 * Smooth position interpolation toward snap targets
 */
export class SnapInterpolator {
  private config: SnapInterpolationConfig;
  private velocity: Point = { x: 0, y: 0 };

  constructor(config?: Partial<SnapInterpolationConfig>) {
    this.config = {
      factor: 0.15,
      snapThreshold: 5,
      useSpring: true,
      spring: {
        stiffness: 300,
        damping: 25,
        mass: 1,
      },
      ...config,
    };
  }

  /**
   * Calculate next position using linear interpolation
   */
  interpolateLinear(current: Point, target: Point): Point {
    return lerp(current, target, this.config.factor);
  }

  /**
   * Calculate next position using spring physics
   */
  interpolateSpring(current: Point, target: Point, deltaTime: number): Point {
    const { stiffness, damping, mass } = this.config.spring;

    // Calculate spring force
    const dx = target.x - current.x;
    const dy = target.y - current.y;

    // F = -kx - bv
    const forceX = stiffness * dx - damping * this.velocity.x;
    const forceY = stiffness * dy - damping * this.velocity.y;

    // a = F/m
    const accX = forceX / mass;
    const accY = forceY / mass;

    // Update velocity
    this.velocity.x += accX * deltaTime;
    this.velocity.y += accY * deltaTime;

    // Update position
    return {
      x: current.x + this.velocity.x * deltaTime,
      y: current.y + this.velocity.y * deltaTime,
    };
  }

  /**
   * Calculate interpolated position
   */
  interpolate(current: Point, target: Point, deltaTime: number = 1 / 60): Point {
    // Check if already at target
    const dist = distance(current, target);
    if (dist < this.config.snapThreshold) {
      this.velocity = { x: 0, y: 0 };
      return target;
    }

    if (this.config.useSpring) {
      return this.interpolateSpring(current, target, deltaTime);
    }

    return this.interpolateLinear(current, target);
  }

  /**
   * Reset interpolator state
   */
  reset(): void {
    this.velocity = { x: 0, y: 0 };
  }

  /**
   * Check if interpolation is complete
   */
  isComplete(current: Point, target: Point): boolean {
    const dist = distance(current, target);
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );
    return dist < this.config.snapThreshold && speed < 1;
  }
}

/**
 * Create a magnetic field manager instance
 */
export function createMagneticFieldManager(cellSize?: number): MagneticFieldManager {
  return new MagneticFieldManager(cellSize);
}

/**
 * Create a snap interpolator instance
 */
export function createSnapInterpolator(
  config?: Partial<SnapInterpolationConfig>
): SnapInterpolator {
  return new SnapInterpolator(config);
}

export default MagneticFieldManager;
