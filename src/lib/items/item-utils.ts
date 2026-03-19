/**
 * Item Utilities
 *
 * Shared helpers for item display and data normalization.
 * These are leaf-level utilities with no dependency on transformation types.
 */

// ============================================================================
// Data Normalization
// ============================================================================

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
 * Canonical display-string resolver for any item that may carry `name`
 * and/or `title` fields.
 *
 * CONTRACT (see `@/types/backlog-groups.ts` for full explanation):
 *   `name`  — canonical identifier from the API / database.
 *   `title` — display label; falls back to `name` when absent.
 *
 * Resolution order: name > title > ''.
 *
 * ALL code that needs a human-readable label for an item MUST call this
 * function rather than writing an inline fallback chain.
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
// Display Helpers
// ============================================================================

/**
 * Normalize item data for consistent display (e.g., drag overlay)
 * Ensures image_url is properly set even if the source has inconsistent data
 */
export function normalizeForDisplay<
  T extends { id: string; image_url?: string | null }
>(item: T): T {
  if (!item) return item;

  return {
    ...item,
    image_url: normalizeImageUrl(item.image_url),
  };
}

/**
 * Get display title from any item type.
 *
 * Delegates to `extractTitle` (name > title) for consistent resolution.
 * Returns 'Untitled' only when the item is null/non-object or has no label.
 */
export function getDisplayTitle(item: unknown): string {
  if (!item || typeof item !== 'object') return 'Untitled';

  return extractTitle(item as { name?: string; title?: string }) || 'Untitled';
}

/**
 * Get display image URL from any item type
 */
export function getDisplayImageUrl(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;

  const obj = item as Record<string, unknown>;
  return normalizeImageUrl(obj.image_url as string | null | undefined);
}
