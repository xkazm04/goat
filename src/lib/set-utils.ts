/**
 * Utility functions for handling Set serialization in storage
 */

/**
 * Convert an array to a Set
 */
export const arrayToSet = <T>(array: T[] | undefined | null): Set<T> => {
  if (!array) return new Set<T>();
  return new Set<T>(array);
};

/**
 * Convert a Set to an array for storage
 */
export const setToArray = <T>(set: Set<T> | undefined | null): T[] => {
  if (!set) return [];
  return Array.from(set);
};