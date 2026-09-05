/**
 * Drag activation thresholds — the one place the click-vs-drag decision is made.
 *
 * Until 2026-08-24 four DndContexts each hard-coded their own number: 2px in
 * SimpleMatchGrid, 5px in StudioItemsView, 6px in CollectionView, 8px in
 * AwardList. Nothing related them, so "is this a click or a drag?" had four
 * different answers on four surfaces of the same app, and no reviewer could see
 * that by reading any one file.
 *
 * Registry: drag-drop/drag-lifecycle — "armed is not dragging", and "the
 * click-vs-drag decision is made once, at threshold, not re-litigated per
 * handler".
 */

/**
 * How far the pointer must travel from the press point before an armed press
 * becomes a drag. Below this, release is a CLICK and the click behaviour fires.
 *
 * 6px, which is what CollectionView already used and close to the platform
 * norm. The grid was raised to it from 2px in the same change: grid cards are
 * also click-to-place targets, and a 2px threshold on a surface where clicking
 * is a real verb turns ordinary clicks into micro-drags — the exact failure the
 * armed state exists to prevent.
 */
export const DRAG_ACTIVATION_DISTANCE_PX = 6;

/**
 * Touch long-press duration before a drag arms. On touch the same finger also
 * means "scroll", so activation is time-based rather than distance-based.
 */
export const TOUCH_ACTIVATION_DELAY_MS = 350;

/** How much the finger may drift during the long press without cancelling it. */
export const TOUCH_ACTIVATION_TOLERANCE_PX = 5;
