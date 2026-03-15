/**
 * Shallow equality helpers for reference-stable memoization.
 * Used to avoid unnecessary re-renders when data hasn't changed.
 */

/**
 * Shallow-compare two Maps by size and identity of values.
 */
export function mapsEqual<K, V>(a: Map<K, V>, b: Map<K, V>): boolean {
  if (a.size !== b.size) return false;
  let equal = true;
  a.forEach((val, key) => {
    if (equal && b.get(key) !== val) equal = false;
  });
  return equal;
}

/**
 * Shallow-compare two arrays by length and identity of elements.
 */
export function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compare two Maps of arrays by checking each array with arraysEqual.
 */
export function arrayMapsEqual<K, V>(a: Map<K, V[]>, b: Map<K, V[]>): boolean {
  if (a.size !== b.size) return false;
  let equal = true;
  a.forEach((items, key) => {
    if (!equal) return;
    const bItems = b.get(key);
    if (!bItems || !arraysEqual(items, bItems)) equal = false;
  });
  return equal;
}
