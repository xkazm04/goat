/**
 * Snap-to-Grid Utilities
 *
 * Provides utilities for calculating grid positions and snap points
 * for a 10x10 grid layout with inertia-driven drag.
 */

export interface GridConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  offsetX: number;
  offsetY: number;
}

export interface GridPosition {
  row: number;
  col: number;
  index: number;
}

export interface SnapPoint {
  x: number;
  y: number;
  position: GridPosition;
}

export interface SnapResult {
  snapped: boolean;
  point: SnapPoint | null;
  distance: number;
  velocity: { x: number; y: number };
}

// Default 10x10 grid configuration
export const DEFAULT_GRID_CONFIG: GridConfig = {
  rows: 10,
  cols: 10,
  cellWidth: 80,
  cellHeight: 80,
  gap: 8,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Calculate the center position of a grid cell
 */
export function getCellCenter(
  row: number,
  col: number,
  config: GridConfig = DEFAULT_GRID_CONFIG
): { x: number; y: number } {
  const x = config.offsetX + col * (config.cellWidth + config.gap) + config.cellWidth / 2;
  const y = config.offsetY + row * (config.cellHeight + config.gap) + config.cellHeight / 2;
  return { x, y };
}

/**
 * Calculate all snap points for the grid
 */
export function calculateSnapPoints(config: GridConfig = DEFAULT_GRID_CONFIG): SnapPoint[] {
  const points: SnapPoint[] = [];

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const { x, y } = getCellCenter(row, col, config);
      points.push({
        x,
        y,
        position: {
          row,
          col,
          index: row * config.cols + col,
        },
      });
    }
  }

  return points;
}

/**
 * Find the nearest grid position from a point
 */
export function findNearestGridPosition(
  x: number,
  y: number,
  config: GridConfig = DEFAULT_GRID_CONFIG
): GridPosition {
  // Calculate raw grid position
  const col = Math.round((x - config.offsetX - config.cellWidth / 2) / (config.cellWidth + config.gap));
  const row = Math.round((y - config.offsetY - config.cellHeight / 2) / (config.cellHeight + config.gap));

  // Clamp to valid range
  const clampedCol = Math.max(0, Math.min(config.cols - 1, col));
  const clampedRow = Math.max(0, Math.min(config.rows - 1, row));

  return {
    row: clampedRow,
    col: clampedCol,
    index: clampedRow * config.cols + clampedCol,
  };
}

/**
 * Calculate snap point with inertia consideration
 * Returns the best snap point based on current position and velocity
 */
export function calculateInertiaSnap(
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  config: GridConfig = DEFAULT_GRID_CONFIG,
  inertiaFactor: number = 0.15
): SnapResult {
  // Project position based on velocity
  const projectedX = x + velocityX * inertiaFactor;
  const projectedY = y + velocityY * inertiaFactor;

  // Find nearest position from projected point
  const position = findNearestGridPosition(projectedX, projectedY, config);
  const snapCenter = getCellCenter(position.row, position.col, config);

  // Calculate distance from current position to snap point
  const distance = Math.sqrt(
    Math.pow(snapCenter.x - x, 2) + Math.pow(snapCenter.y - y, 2)
  );

  // Calculate snap threshold based on cell size
  const snapThreshold = Math.min(config.cellWidth, config.cellHeight) * 1.5;

  return {
    snapped: distance < snapThreshold,
    point: {
      x: snapCenter.x,
      y: snapCenter.y,
      position,
    },
    distance,
    velocity: { x: velocityX, y: velocityY },
  };
}

/**
 * Convert screen coordinates to grid index
 */
export function screenToGridIndex(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  config: GridConfig = DEFAULT_GRID_CONFIG
): number {
  const relativeX = screenX - containerRect.left;
  const relativeY = screenY - containerRect.top;

  const position = findNearestGridPosition(relativeX, relativeY, config);
  return position.index;
}

/**
 * Convert grid index to screen position
 */
export function gridIndexToScreen(
  index: number,
  containerRect: DOMRect,
  config: GridConfig = DEFAULT_GRID_CONFIG
): { x: number; y: number } {
  const row = Math.floor(index / config.cols);
  const col = index % config.cols;

  const { x, y } = getCellCenter(row, col, config);

  return {
    x: containerRect.left + x,
    y: containerRect.top + y,
  };
}

/**
 * Create a custom dnd-kit modifier for snap-to-grid behavior
 */
export function createSnapToGridModifier(config: GridConfig = DEFAULT_GRID_CONFIG) {
  return ({ transform, draggingNodeRect }: any) => {
    if (!transform || !draggingNodeRect) {
      return transform;
    }

    // Calculate the projected position
    const projectedX = draggingNodeRect.left + transform.x;
    const projectedY = draggingNodeRect.top + transform.y;

    // Find nearest grid position
    const position = findNearestGridPosition(projectedX, projectedY, config);
    const snapCenter = getCellCenter(position.row, position.col, config);

    // Calculate the snapped transform
    return {
      ...transform,
      x: snapCenter.x - draggingNodeRect.left,
      y: snapCenter.y - draggingNodeRect.top,
    };
  };
}

/**
 * Generate grid configuration from container dimensions
 */
export function generateGridConfig(
  containerWidth: number,
  containerHeight: number,
  rows: number = 10,
  cols: number = 10,
  gap: number = 8
): GridConfig {
  const cellWidth = (containerWidth - gap * (cols - 1)) / cols;
  const cellHeight = (containerHeight - gap * (rows - 1)) / rows;

  return {
    rows,
    cols,
    cellWidth,
    cellHeight,
    gap,
    offsetX: 0,
    offsetY: 0,
  };
}

/**
 * Validate if a position is within grid bounds
 */
export function isValidGridPosition(
  position: GridPosition,
  config: GridConfig = DEFAULT_GRID_CONFIG
): boolean {
  return (
    position.row >= 0 &&
    position.row < config.rows &&
    position.col >= 0 &&
    position.col < config.cols
  );
}

/**
 * Get adjacent grid positions (for keyboard navigation)
 */
export function getAdjacentPositions(
  position: GridPosition,
  config: GridConfig = DEFAULT_GRID_CONFIG
): {
  up: GridPosition | null;
  down: GridPosition | null;
  left: GridPosition | null;
  right: GridPosition | null;
} {
  const { row, col } = position;

  return {
    up: row > 0 ? { row: row - 1, col, index: (row - 1) * config.cols + col } : null,
    down: row < config.rows - 1 ? { row: row + 1, col, index: (row + 1) * config.cols + col } : null,
    left: col > 0 ? { row, col: col - 1, index: row * config.cols + (col - 1) } : null,
    right: col < config.cols - 1 ? { row, col: col + 1, index: row * config.cols + (col + 1) } : null,
  };
}
