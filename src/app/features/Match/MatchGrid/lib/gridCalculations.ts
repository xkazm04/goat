/**
 * Grid Calculations Utility
 * Contains helper functions for grid positioning and calculations
 */

/**
 * Calculate the next available position in the grid
 * Returns the index of the first empty slot
 */
export const getNextAvailablePosition = (gridItems: any[]): number => {
  return gridItems.findIndex(item => !item.matched);
};

/**
 * Calculate the last available position in the grid
 * Returns the index of the last empty slot
 */
export const getLastAvailablePosition = (gridItems: any[]): number | null => {
  const lastIndex = gridItems.map(item => item.matched).lastIndexOf(false);
  return lastIndex !== -1 ? lastIndex : null;
};

/**
 * Check if a position is available for placement
 * Wrapper function for store's canAddAtPosition method
 */
export const isPositionAvailable = (
  position: number,
  canAddAtPosition: (pos: number) => boolean
): boolean => {
  return canAddAtPosition(position);
};

/**
 * Calculate grid completion percentage
 * Returns the percentage of filled slots in the grid
 */
export const calculateGridCompletion = (gridItems: any[]): number => {
  const filledSlots = gridItems.filter(item => item.matched).length;
  return Math.round((filledSlots / gridItems.length) * 100);
};

/**
 * Get grid statistics
 * Returns useful statistics about the current grid state
 */
export const getGridStatistics = (gridItems: any[]) => {
  const total = gridItems.length;
  const filled = gridItems.filter(item => item.matched).length;
  const empty = total - filled;
  const percentage = calculateGridCompletion(gridItems);

  return {
    total,
    filled,
    empty,
    percentage,
    isComplete: filled === total
  };
};

/**
 * Validate grid position
 * Ensures a position is within valid grid bounds
 */
export const isValidGridPosition = (position: number, maxItems: number): boolean => {
  return position >= 0 && position < maxItems;
};

/**
 * Get position tier
 * Returns the tier (top3, mid, low) for a given position
 */
export const getPositionTier = (position: number): 'top3' | 'mid' | 'low' => {
  if (position < 3) return 'top3';
  if (position < 10) return 'mid';
  return 'low';
};
