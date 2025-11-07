/**
 * Collection Lazy Loading Configuration
 *
 * Defines thresholds and parameters for dynamic lazy loading
 * and virtualization of collection items.
 */

export const LAZY_LOAD_CONFIG = {
  /**
   * Threshold for switching to virtualized list
   * Collections with fewer items use normal rendering
   * Collections with more items use virtualized rendering
   */
  VIRTUALIZATION_THRESHOLD: 100,

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
  return itemCount > LAZY_LOAD_CONFIG.LAZY_LOAD_PAGE_SIZE;
}
