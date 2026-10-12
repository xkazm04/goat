/**
 * ViewRegistry — Explicit mapping between ViewModes and list size constraints.
 *
 * Each view declares:
 *  - `minSlots`: minimum grid positions required to render without data loss
 *  - `displaySlots`: number of "hero" slots the view itself renders
 *    (remaining items spill into the GridSection below)
 *  - `maxSlots`: optional hard cap (views like tierlist/bracket handle any size)
 *
 * Use `getAvailableViews(listSize)` to filter the switcher and
 * `isViewCompatible(mode, listSize)` before rendering.
 */

import type { ViewMode } from '@/app/features/Match/sub_MatchGrid/components/ViewSwitcher';

export interface ViewConfig {
  /** Minimum grid slots the view requires to render */
  minSlots: number;
  /** Number of hero/featured slots the view itself renders */
  displaySlots: number;
  /** Optional maximum grid size the view supports (undefined = unlimited) */
  maxSlots?: number;
}

/**
 * Canonical view → size mapping.
 * Single source of truth — individual view components should reference this
 * instead of defining their own MIN_ITEMS constants.
 */
export const VIEW_REGISTRY: Record<ViewMode, ViewConfig> = {
  podium: {
    minSlots: 3,
    displaySlots: 3,
  },
  goat: {
    minSlots: 3,
    displaySlots: 3,
  },
  rushmore: {
    minSlots: 4,
    displaySlots: 4,
  },
  bracket: {
    minSlots: 2,
    displaySlots: Infinity, // bracket handles all items
  },
  tierlist: {
    minSlots: 1,
    displaySlots: Infinity, // tier list handles all items
  },
} as const;

/**
 * Check whether a view is compatible with the given list size.
 */
export function isViewCompatible(mode: ViewMode, listSize: number): boolean {
  const config = VIEW_REGISTRY[mode];
  if (listSize < config.minSlots) return false;
  if (config.maxSlots !== undefined && listSize > config.maxSlots) return false;
  return true;
}

/**
 * Return all views that are compatible with the given list size.
 */
export function getAvailableViews(listSize: number): ViewMode[] {
  return (Object.keys(VIEW_REGISTRY) as ViewMode[]).filter((mode) =>
    isViewCompatible(mode, listSize),
  );
}

/**
 * Get the number of hero/display slots for a given view.
 * Useful for determining where the GridSection should start rendering.
 */
export function getDisplaySlots(mode: ViewMode): number {
  return VIEW_REGISTRY[mode].displaySlots;
}
