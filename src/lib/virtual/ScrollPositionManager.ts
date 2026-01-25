/**
 * ScrollPositionManager
 * Manages scroll position persistence and restoration across navigation.
 * Uses sessionStorage for same-session persistence.
 */

/**
 * Scroll position data structure
 */
export interface ScrollPosition {
  /** Scroll offset in pixels */
  offset: number;
  /** Timestamp when position was saved */
  timestamp: number;
  /** First visible item index (for virtual lists) */
  firstVisibleIndex?: number;
  /** Total items count at time of save */
  totalItems?: number;
}

/**
 * Position restore options
 */
export interface RestoreOptions {
  /** Maximum age of saved position in ms (default: 30 minutes) */
  maxAge?: number;
  /** Behavior for scrolling */
  behavior?: ScrollBehavior;
  /** Callback after position is restored */
  onRestore?: (position: ScrollPosition) => void;
  /** Callback if restoration fails or is skipped */
  onSkip?: (reason: string) => void;
}

/**
 * Configuration for ScrollPositionManager
 */
export interface ScrollPositionManagerConfig {
  /** Storage key prefix */
  keyPrefix?: string;
  /** Maximum positions to store */
  maxPositions?: number;
  /** Default max age for positions */
  defaultMaxAge?: number;
  /** Enable debug logging */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<ScrollPositionManagerConfig> = {
  keyPrefix: 'goat-scroll-',
  maxPositions: 50,
  defaultMaxAge: 30 * 60 * 1000, // 30 minutes
  debug: false,
};

/**
 * ScrollPositionManager Class
 *
 * Provides utilities for saving and restoring scroll positions
 * across page navigation. Works with both regular scrollable
 * elements and virtualized lists.
 *
 * Features:
 * - Session storage persistence
 * - Automatic cleanup of old positions
 * - Virtual list support (save first visible index)
 * - Configurable max age for positions
 * - Debug logging option
 */
export class ScrollPositionManager {
  private config: Required<ScrollPositionManagerConfig>;
  private positions: Map<string, ScrollPosition> = new Map();

  constructor(config?: ScrollPositionManagerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Generate storage key for a given identifier
   */
  private getStorageKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Load positions from session storage
   */
  private loadFromStorage(): void {
    try {
      const storedData = sessionStorage.getItem(`${this.config.keyPrefix}positions`);
      if (storedData) {
        const parsed = JSON.parse(storedData) as Record<string, ScrollPosition>;
        this.positions = new Map(Object.entries(parsed));
        this.log('Loaded positions from storage:', this.positions.size);
      }
    } catch (error) {
      this.log('Failed to load positions from storage:', error);
    }
  }

  /**
   * Save positions to session storage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.positions.entries());
      sessionStorage.setItem(`${this.config.keyPrefix}positions`, JSON.stringify(data));
      this.log('Saved positions to storage:', this.positions.size);
    } catch (error) {
      this.log('Failed to save positions to storage:', error);
    }
  }

  /**
   * Clean up old positions
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.positions.forEach((position, key) => {
      if (now - position.timestamp > this.config.defaultMaxAge) {
        keysToDelete.push(key);
      }
    });

    // Also remove oldest if over max
    if (this.positions.size - keysToDelete.length > this.config.maxPositions) {
      const sortedEntries = Array.from(this.positions.entries())
        .filter(([key]) => !keysToDelete.includes(key))
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = sortedEntries.slice(
        0,
        sortedEntries.length - this.config.maxPositions
      );
      toRemove.forEach(([key]) => keysToDelete.push(key));
    }

    keysToDelete.forEach((key) => this.positions.delete(key));

    if (keysToDelete.length > 0) {
      this.log('Cleaned up old positions:', keysToDelete.length);
      this.saveToStorage();
    }
  }

  /**
   * Debug logging
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[ScrollPositionManager]', ...args);
    }
  }

  /**
   * Save scroll position for a key
   */
  save(
    key: string,
    offset: number,
    options?: {
      firstVisibleIndex?: number;
      totalItems?: number;
    }
  ): void {
    const position: ScrollPosition = {
      offset,
      timestamp: Date.now(),
      firstVisibleIndex: options?.firstVisibleIndex,
      totalItems: options?.totalItems,
    };

    this.positions.set(key, position);
    this.saveToStorage();
    this.log('Saved position for', key, position);
  }

  /**
   * Get saved scroll position
   */
  get(key: string): ScrollPosition | null {
    return this.positions.get(key) || null;
  }

  /**
   * Check if position exists and is valid
   */
  has(key: string, maxAge?: number): boolean {
    const position = this.positions.get(key);
    if (!position) return false;

    const age = maxAge || this.config.defaultMaxAge;
    const isValid = Date.now() - position.timestamp < age;

    return isValid;
  }

  /**
   * Restore scroll position to an element
   */
  restore(
    key: string,
    element: HTMLElement,
    options?: RestoreOptions
  ): boolean {
    const position = this.get(key);
    const maxAge = options?.maxAge || this.config.defaultMaxAge;

    if (!position) {
      this.log('No position found for', key);
      options?.onSkip?.('no_position');
      return false;
    }

    if (Date.now() - position.timestamp > maxAge) {
      this.log('Position expired for', key);
      this.remove(key);
      options?.onSkip?.('expired');
      return false;
    }

    // Use requestAnimationFrame for reliable restoration
    requestAnimationFrame(() => {
      element.scrollTo({
        top: position.offset,
        behavior: options?.behavior || 'auto',
      });
      this.log('Restored position for', key, position.offset);
      options?.onRestore?.(position);
    });

    return true;
  }

  /**
   * Remove saved position
   */
  remove(key: string): void {
    this.positions.delete(key);
    this.saveToStorage();
    this.log('Removed position for', key);
  }

  /**
   * Clear all saved positions
   */
  clear(): void {
    this.positions.clear();
    this.saveToStorage();
    this.log('Cleared all positions');
  }

  /**
   * Get all saved positions
   */
  getAll(): Map<string, ScrollPosition> {
    return new Map(this.positions);
  }

  /**
   * Trigger cleanup of old positions
   */
  runCleanup(): void {
    this.cleanup();
  }
}

/**
 * Singleton instance for app-wide scroll position management
 */
let defaultManager: ScrollPositionManager | null = null;

/**
 * Get or create the default scroll position manager
 */
export function getScrollPositionManager(
  config?: ScrollPositionManagerConfig
): ScrollPositionManager {
  if (!defaultManager) {
    defaultManager = new ScrollPositionManager(config);
  }
  return defaultManager;
}

/**
 * React hook for scroll position management
 */
export interface UseScrollPositionOptions {
  /** Unique key for this scroll position */
  key: string;
  /** Whether to auto-restore on mount */
  autoRestore?: boolean;
  /** Whether to auto-save on unmount */
  autoSave?: boolean;
  /** Element ref (if not using returned ref) */
  elementRef?: React.RefObject<HTMLElement>;
  /** Restore options */
  restoreOptions?: RestoreOptions;
  /** Callback when position is saved */
  onSave?: (position: ScrollPosition) => void;
  /** Callback when position is restored */
  onRestore?: (position: ScrollPosition) => void;
}

/**
 * Create scroll handlers for a given element
 */
export function createScrollHandlers(
  key: string,
  manager?: ScrollPositionManager
) {
  const mgr = manager || getScrollPositionManager();

  return {
    save: (offset: number, extra?: { firstVisibleIndex?: number; totalItems?: number }) => {
      mgr.save(key, offset, extra);
    },
    restore: (element: HTMLElement, options?: RestoreOptions) => {
      return mgr.restore(key, element, options);
    },
    get: () => mgr.get(key),
    has: (maxAge?: number) => mgr.has(key, maxAge),
    remove: () => mgr.remove(key),
  };
}

export default ScrollPositionManager;
