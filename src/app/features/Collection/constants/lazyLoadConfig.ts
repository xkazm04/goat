/**
 * Collection Lazy Loading Configuration
 *
 * THE single source for the render-strategy ladder (normal → lazy → virtualized).
 * A second copy of these predicates used to live in
 * src/components/patterns/virtualization/useLazyLoad.ts with a different lazy
 * threshold; it has been removed. If you need these numbers elsewhere, import
 * them from here rather than defaulting a parameter.
 *
 * CURRENT STATUS: the ladder is declared but not wired. Neither
 * shouldUseLazyLoading nor shouldUseVirtualization has a call site — the
 * Collection panel renders every filtered item. LAZY_LOAD_CONFIG's observer
 * fields ARE live, via components/LazyLoadTrigger.tsx. Changing the thresholds
 * below therefore has no effect on what renders today. See
 * docs/lazy-loading-implementation.md for what exists and what does not.
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

/**
 * Determines if a collection should use virtualization
 */
export function shouldUseVirtualization(itemCount: number): boolean {
  return itemCount > LAZY_LOAD_CONFIG.VIRTUALIZATION_THRESHOLD;
}

/**
 * Determines if a collection should use lazy loading
 */
export function shouldUseLazyLoading(itemCount: number): boolean {
  return itemCount > LAZY_LOAD_CONFIG.LAZY_LOAD_THRESHOLD;
}
