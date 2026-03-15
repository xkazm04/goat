/**
 * Core utility functions for item transformations.
 *
 * Shared helpers used across all transformation modules.
 */

/**
 * Normalize image URL to ensure consistent handling across all transforms.
 * Handles: undefined, null, empty string, valid URL
 */
export function normalizeImageUrl(
  imageUrl: string | null | undefined
): string | undefined {
  if (imageUrl === null || imageUrl === undefined || imageUrl === '') {
    return undefined;
  }
  return imageUrl;
}

/**
 * Extract title from various item formats with consistent fallback logic.
 * Priority: name > title > ''
 */
export function extractTitle(
  item: { name?: string; title?: string } | null | undefined
): string {
  if (!item) return '';

  if (typeof item.name === 'string' && item.name.trim()) {
    return item.name;
  }
  if (typeof item.title === 'string' && item.title.trim()) {
    return item.title;
  }
  return '';
}

/**
 * Safely extract a string value from an unknown object property
 */
export function safeString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely extract a number value from an unknown object property
 */
export function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely extract a string array from an unknown object property
 */
export function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return [];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if source object has BacklogItem-like properties
 */
export function isBacklogItemLike(
  source: unknown
): source is { id: string; name?: string; category: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (typeof obj.name === 'string' || typeof obj.title === 'string') &&
    typeof obj.category === 'string'
  );
}

/**
 * Check if source object has GridItemType-like properties
 */
export function isGridItemLike(
  source: unknown
): source is { id: string; position: number; matched: boolean } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.position === 'number' &&
    typeof obj.matched === 'boolean'
  );
}

/**
 * Check if source object has TransferableItem-like properties
 */
export function isTransferableItemLike(
  source: unknown
): source is { id: string; title: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.title === 'string';
}

/**
 * Check if source object has NormalizedItem-like properties
 */
export function isNormalizedItemLike(
  source: unknown
): source is { id: string; groupId: string } {
  if (!source || typeof source !== 'object') return false;
  const obj = source as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.groupId === 'string';
}
