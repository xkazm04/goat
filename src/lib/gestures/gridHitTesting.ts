/**
 * Grid Hit Testing Utility
 * Calculates which grid position a touch coordinate is hovering over
 */

import type { GridPosition } from '@/hooks/useSwipeGesture.types';

export interface GridConfig {
  /** Grid container element or bounding rect */
  containerRect: DOMRect;
  /** Number of grid rows */
  rows: number;
  /** Number of grid columns */
  columns: number;
  /** Gap between grid items (pixels) */
  gap?: number;
  /** Padding inside container (pixels) */
  padding?: number;
}

/**
 * Calculate which grid position (if any) a touch coordinate overlaps
 *
 * @param touchX - Touch X coordinate (viewport relative)
 * @param touchY - Touch Y coordinate (viewport relative)
 * @param config - Grid layout configuration
 * @returns GridPosition if hovering over a valid grid cell, null otherwise
 */
export function calculateGridPosition(
  touchX: number,
  touchY: number,
  config: GridConfig
): GridPosition | null {
  const { containerRect, rows, columns, gap = 8, padding = 0 } = config;

  // Check if touch is within container bounds
  if (
    touchX < containerRect.left ||
    touchX > containerRect.right ||
    touchY < containerRect.top ||
    touchY > containerRect.bottom
  ) {
    return null;
  }

  // Calculate relative position within container
  const relativeX = touchX - containerRect.left - padding;
  const relativeY = touchY - containerRect.top - padding;

  // Calculate available space (accounting for padding and gaps)
  const availableWidth = containerRect.width - (padding * 2) - (gap * (columns - 1));
  const availableHeight = containerRect.height - (padding * 2) - (gap * (rows - 1));

  // Calculate cell dimensions
  const cellWidth = availableWidth / columns;
  const cellHeight = availableHeight / rows;

  // Calculate which cell the touch is over
  let columnIndex = -1;
  let rowIndex = -1;

  // Find column
  let cumulativeX = 0;
  for (let col = 0; col < columns; col++) {
    const cellStart = cumulativeX;
    const cellEnd = cumulativeX + cellWidth;

    if (relativeX >= cellStart && relativeX <= cellEnd) {
      columnIndex = col;
      break;
    }

    cumulativeX += cellWidth + gap;
  }

  // Find row
  let cumulativeY = 0;
  for (let row = 0; row < rows; row++) {
    const cellStart = cumulativeY;
    const cellEnd = cumulativeY + cellHeight;

    if (relativeY >= cellStart && relativeY <= cellEnd) {
      rowIndex = row;
      break;
    }

    cumulativeY += cellHeight + gap;
  }

  // Return null if not over a valid cell
  if (columnIndex === -1 || rowIndex === -1) {
    return null;
  }

  // Calculate linear index (row-major order)
  const index = rowIndex * columns + columnIndex;

  // Return grid position
  return {
    x: columnIndex,
    y: rowIndex,
    index,
  };
}

/**
 * Get the center coordinates of a grid cell
 *
 * @param gridPosition - The grid position to get center for
 * @param config - Grid layout configuration
 * @returns Object with x, y coordinates of cell center (viewport relative)
 */
export function getGridCellCenter(
  gridPosition: GridPosition,
  config: GridConfig
): { x: number; y: number } {
  const { containerRect, rows, columns, gap = 8, padding = 0 } = config;

  // Calculate available space
  const availableWidth = containerRect.width - (padding * 2) - (gap * (columns - 1));
  const availableHeight = containerRect.height - (padding * 2) - (gap * (rows - 1));

  // Calculate cell dimensions
  const cellWidth = availableWidth / columns;
  const cellHeight = availableHeight / rows;

  // Calculate cell position
  const cellX = padding + (gridPosition.x * (cellWidth + gap)) + (cellWidth / 2);
  const cellY = padding + (gridPosition.y * (cellHeight + gap)) + (cellHeight / 2);

  return {
    x: containerRect.left + cellX,
    y: containerRect.top + cellY,
  };
}

/**
 * Calculate grid layout from total grid size
 * Attempts to create a roughly square grid layout
 *
 * @param totalSize - Total number of grid positions (e.g., 10 for top 10)
 * @returns Object with rows and columns
 */
export function calculateGridLayout(totalSize: number): { rows: number; columns: number } {
  // For common sizes, use predefined layouts
  const layouts: Record<number, { rows: number; columns: number }> = {
    5: { rows: 1, columns: 5 },
    10: { rows: 2, columns: 5 },
    20: { rows: 4, columns: 5 },
    25: { rows: 5, columns: 5 },
    50: { rows: 5, columns: 10 },
  };

  if (layouts[totalSize]) {
    return layouts[totalSize];
  }

  // For other sizes, calculate roughly square layout
  const columns = Math.ceil(Math.sqrt(totalSize));
  const rows = Math.ceil(totalSize / columns);

  return { rows, columns };
}
