/**
 * Collection Lazy Loading Configuration
 *
 * THE single source for the render-strategy ladder (normal → lazy → virtualized).
 * A second copy of these predicates used to live in
 * src/components/patterns/virtualization/useLazyLoad.ts with a different lazy
 * threshold; it has been removed. If you need these numbers elsewhere, import
 * them from here rather than defaulting a parameter.
 *
 * CURRENT STATUS (2026-08-24): only the observer fields are live, via
 * components/LazyLoadTrigger.tsx. The VIRTUALIZATION_* and LAZY_LOAD_* numbers
 * are still declared but nothing reads them — the Collection panel renders
 * every filtered item.
 *
 * AUTOPSY — the two predicates that used to live at the bottom of this file:
 *
 *   shouldUseVirtualization(count)  ->  count > VIRTUALIZATION_THRESHOLD
 *   shouldUseLazyLoading(count)     ->  count > LAZY_LOAD_THRESHOLD
 *
 * Both were exported from the Collection barrel and called from NOWHERE — not
 * a single call site anywhere in src/, e2e/ or scripts/, verified by grep and
 * independently by knip. Their presence read as protection ("the ladder is
 * handled"), and it is that appearance, not the twelve lines, that cost
 * something: it is why a SECOND and more complete answer to the same problem
 * (src/lib/virtual/, ~2,100 lines) was written and also left unwired.
 *
 * They are deleted rather than kept, per dead-code/deletion-protocols: a
 * control that looks like protection and is inert is worse than none, because
 * it teaches everyone to stop looking.
 *
 * To re-add them, you must first refute this: name the call site that will
 * consume the verdict, in the same change. The thresholds above are kept
 * because they are the recorded intent for whoever wires the ladder — they are
 * data, and data does not pretend to be a control.
 *
 * See docs/lazy-loading-implementation.md for what exists and what does not.
 */

export const LAZY_LOAD_CONFIG = {
  /**
   * Threshold for switching to virtualized list
   * Collections with fewer items use normal rendering
   * Collections with more items use virtualized rendering
   */
  VIRTUALIZATION_THRESHOLD: 100,

  /**
   * Item count above which lazy loading engages.
   *
   * Deliberately distinct from LAZY_LOAD_PAGE_SIZE. The two were previously
   * conflated — shouldUseLazyLoading tested against the PAGE SIZE, which meant
   * "more than one page" rather than "big enough to be worth paginating", and
   * disagreed with the other copy of the ladder that used 50.
   */
  LAZY_LOAD_THRESHOLD: 50,

  /**
   * Number of items to load per page in lazy loading mode
   */
  LAZY_LOAD_PAGE_SIZE: 20,

  /**
   * Number of items to prefetch ahead of the visible area
   * Helps prevent loading gaps during fast scrolling
   */
  PREFETCH_COUNT: 10,

  /**
   * Root margin for intersection observer (in pixels)
   * Triggers loading before items enter viewport
   */
  INTERSECTION_ROOT_MARGIN: '200px',

  /**
   * Intersection threshold (0.0 to 1.0)
   * 0.1 means trigger when 10% of the item is visible
   */
  INTERSECTION_THRESHOLD: 0.1,

  /**
   * Virtual list configuration
   */
  VIRTUAL_LIST: {
    /**
     * Estimated item height in pixels (for grid items)
     */
    ITEM_HEIGHT: 120,

    /**
     * Number of items to render outside visible area (overscan)
     */
    OVERSCAN_COUNT: 5,

    /**
     * Minimum batch size for rendering items
     */
    MIN_BATCH_SIZE: 10,
  },

  /**
   * Debounce delay for scroll events (milliseconds)
   */
  SCROLL_DEBOUNCE_MS: 150,
} as const;
