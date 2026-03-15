/**
 * Display helper functions for item presentation
 */

import { normalizeImageUrl, safeString } from './core-utils';

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
 * Get display title from any item type
 */
export function getDisplayTitle(item: unknown): string {
  if (!item || typeof item !== 'object') return 'Untitled';

  const obj = item as Record<string, unknown>;
  return (
    safeString(obj.title) ||
    safeString(obj.name) ||
    'Untitled'
  );
}

/**
 * Get display image URL from any item type
 */
export function getDisplayImageUrl(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;

  const obj = item as Record<string, unknown>;
  return normalizeImageUrl(obj.image_url as string | null | undefined);
}
