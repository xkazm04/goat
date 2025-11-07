import { closestCenter, CollisionDetection, ClientRect } from '@dnd-kit/core';

/**
 * Magnetic collision detection for grid items
 * Provides "snap" behavior when cursor is near a grid cell center
 */

const MAGNETIC_THRESHOLD = 60; // pixels from center to activate magnetism
const MAGNETIC_STRENGTH = 0.7; // 0-1, how strong the magnetic pull is

/**
 * Calculate distance from point to rectangle center
 */
function distanceToCenter(
  point: { x: number; y: number },
  rect: ClientRect
): number {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = point.x - centerX;
  const dy = point.y - centerY;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point is within magnetic range of rectangle center
 */
function isInMagneticRange(
  point: { x: number; y: number },
  rect: ClientRect,
  threshold: number
): boolean {
  const distance = distanceToCenter(point, rect);
  return distance < threshold;
}

/**
 * Magnetic collision detection
 * - Uses closestCenter as fallback
 * - Adds magnetic "snap" when cursor is near cell center
 * - Returns boosted collision score for cells in magnetic range
 */
export const magneticCollision: CollisionDetection = (args) => {
  const { active, collisionRect, droppableRects, droppableContainers, pointerCoordinates } = args;

  if (!pointerCoordinates) {
    // No pointer coordinates, fall back to closestCenter
    return closestCenter(args);
  }

  // Get all collisions using closestCenter
  const centerCollisions = closestCenter(args);

  // If no collisions, return empty
  if (!centerCollisions || centerCollisions.length === 0) {
    return centerCollisions;
  }

  // Check each collision for magnetic range
  const magneticCollisions = centerCollisions.map((collision) => {
    const droppableRect = droppableRects.get(collision.id);

    if (!droppableRect) {
      return collision;
    }

    // Check if cursor is in magnetic range
    const inMagneticRange = isInMagneticRange(
      pointerCoordinates,
      droppableRect,
      MAGNETIC_THRESHOLD
    );

    if (inMagneticRange) {
      const distance = distanceToCenter(pointerCoordinates, droppableRect);

      // Calculate magnetic boost (closer = stronger)
      const normalizedDistance = distance / MAGNETIC_THRESHOLD;
      const magneticBoost = (1 - normalizedDistance) * MAGNETIC_STRENGTH;

      // Reduce collision value (lower = higher priority in dnd-kit)
      // Apply magnetic boost to make this collision more likely
      const collisionValue = (collision as any).value || 0;
      const boostedValue = collisionValue * (1 - magneticBoost);

      return {
        ...collision,
        ...(collisionValue !== undefined && { value: boostedValue }),
        data: {
          ...(collision.data || {}),
          magnetic: true,
          magneticStrength: magneticBoost
        }
      } as any;
    }

    return collision;
  });

  // Sort by collision value (lower = higher priority)
  magneticCollisions.sort((a, b) => ((a as any).value || 0) - ((b as any).value || 0));

  return magneticCollisions;
};

/**
 * Get magnetic indicator data for visual feedback
 */
export function getMagneticIndicator(
  pointerCoordinates: { x: number; y: number } | null,
  droppableRects: Map<string, ClientRect>,
  activeDroppableId: string | null
): {
  isActive: boolean;
  strength: number;
  targetId: string | null;
} {
  if (!pointerCoordinates || !activeDroppableId) {
    return { isActive: false, strength: 0, targetId: null };
  }

  const rect = droppableRects.get(activeDroppableId);
  if (!rect) {
    return { isActive: false, strength: 0, targetId: null };
  }

  const inRange = isInMagneticRange(pointerCoordinates, rect, MAGNETIC_THRESHOLD);

  if (inRange) {
    const distance = distanceToCenter(pointerCoordinates, rect);
    const normalizedDistance = distance / MAGNETIC_THRESHOLD;
    const strength = (1 - normalizedDistance) * MAGNETIC_STRENGTH;

    return {
      isActive: true,
      strength,
      targetId: activeDroppableId
    };
  }

  return { isActive: false, strength: 0, targetId: null };
}
