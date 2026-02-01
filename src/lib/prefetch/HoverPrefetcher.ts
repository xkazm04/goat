/**
 * HoverPrefetcher
 *
 * Handles hover-triggered prefetching for interactive elements.
 * When users hover over list cards, category buttons, or other
 * interactive elements, we prefetch the data they're likely to need.
 *
 * Features:
 * - Debounced hover detection (avoid rapid fire)
 * - Cancellation on mouse leave
 * - Touch device support (uses focus instead)
 * - Custom prefetch targets per element type
 */

import { PrefetchManager, type PrefetchTarget } from './PrefetchManager';
import { PredictionEngine } from './PredictionEngine';
import { RoutePreloader } from './RoutePreloader';

export type HoverTargetType = 'list-card' | 'category' | 'blueprint' | 'link' | 'custom';

export interface HoverPrefetchConfig {
  /** Type of element being hovered */
  type: HoverTargetType;
  /** Unique identifier for the element */
  id: string;
  /** Route this element links to (optional) */
  href?: string;
  /** Custom prefetch targets (optional) */
  targets?: PrefetchTarget[];
  /** Additional data for prefetch (e.g., category name) */
  data?: Record<string, unknown>;
}

interface TrackedElement {
  element: HTMLElement;
  config: HoverPrefetchConfig;
  hoverTimeout: ReturnType<typeof setTimeout> | null;
  isPrefetching: boolean;
}

/** Minimum hover time before triggering prefetch (ms) */
const HOVER_DELAY = 100;

/** Maximum time to wait for prefetch to complete before considered "too slow" */
const PREFETCH_TIMEOUT = 200;

class HoverPrefetcherClass {
  private static instance: HoverPrefetcherClass | null = null;
  private trackedElements: Map<HTMLElement, TrackedElement> = new Map();
  private enabled: boolean = true;
  private isTouchDevice: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
  }

  static getInstance(): HoverPrefetcherClass {
    if (!HoverPrefetcherClass.instance) {
      HoverPrefetcherClass.instance = new HoverPrefetcherClass();
    }
    return HoverPrefetcherClass.instance;
  }

  /**
   * Register an element for hover prefetching
   */
  register(element: HTMLElement, config: HoverPrefetchConfig): () => void {
    if (!element || this.trackedElements.has(element)) {
      return () => {};
    }

    const tracked: TrackedElement = {
      element,
      config,
      hoverTimeout: null,
      isPrefetching: false,
    };

    this.trackedElements.set(element, tracked);

    // Attach event listeners
    const handleEnter = () => this.handleMouseEnter(tracked);
    const handleLeave = () => this.handleMouseLeave(tracked);
    const handleFocus = () => this.handleFocus(tracked);
    const handleBlur = () => this.handleBlur(tracked);

    if (this.isTouchDevice) {
      // Use focus/blur for touch devices
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);
    } else {
      // Use mouse events for pointer devices
      element.addEventListener('mouseenter', handleEnter);
      element.addEventListener('mouseleave', handleLeave);
      // Also support keyboard navigation
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);
    }

    // Return cleanup function
    return () => {
      this.unregister(element);
      element.removeEventListener('mouseenter', handleEnter);
      element.removeEventListener('mouseleave', handleLeave);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }

  /**
   * Unregister an element
   */
  unregister(element: HTMLElement): void {
    const tracked = this.trackedElements.get(element);
    if (tracked) {
      if (tracked.hoverTimeout) {
        clearTimeout(tracked.hoverTimeout);
      }
      this.trackedElements.delete(element);
    }
  }

  private handleMouseEnter(tracked: TrackedElement): void {
    if (!this.enabled) return;

    // Clear any existing timeout
    if (tracked.hoverTimeout) {
      clearTimeout(tracked.hoverTimeout);
    }

    // Set up delayed prefetch
    tracked.hoverTimeout = setTimeout(() => {
      this.triggerPrefetch(tracked);
    }, HOVER_DELAY);
  }

  private handleMouseLeave(tracked: TrackedElement): void {
    // Cancel pending prefetch
    if (tracked.hoverTimeout) {
      clearTimeout(tracked.hoverTimeout);
      tracked.hoverTimeout = null;
    }

    // Note: Don't cancel in-flight prefetches - let them complete
  }

  private handleFocus(tracked: TrackedElement): void {
    if (!this.enabled) return;

    // Immediate prefetch on focus (keyboard navigation)
    tracked.hoverTimeout = setTimeout(() => {
      this.triggerPrefetch(tracked);
    }, HOVER_DELAY);
  }

  private handleBlur(tracked: TrackedElement): void {
    if (tracked.hoverTimeout) {
      clearTimeout(tracked.hoverTimeout);
      tracked.hoverTimeout = null;
    }
  }

  private triggerPrefetch(tracked: TrackedElement): void {
    if (tracked.isPrefetching) return;
    tracked.isPrefetching = true;

    const { config } = tracked;
    const prefetchStart = Date.now();

    // Record hover event for prediction
    if (config.type === 'category' && config.data?.category) {
      PredictionEngine.recordEvent({
        type: 'interaction',
        category: config.data.category as string,
        subcategory: config.data.subcategory as string | undefined,
      });
    }

    // Determine prefetch targets
    let targets: PrefetchTarget[] = [];

    // Use custom targets if provided
    if (config.targets && config.targets.length > 0) {
      targets = config.targets.map((t) => ({
        ...t,
        priority: 'high' as const,
        source: 'hover' as const,
      }));
    }
    // Otherwise, use route-based prefetch
    else if (config.href) {
      targets = RoutePreloader.getTargetsForRoute(config.href).map((t) => ({
        ...t,
        priority: 'high' as const,
        source: 'hover' as const,
      }));
    }

    // Execute prefetch
    if (targets.length > 0) {
      PrefetchManager.prefetchMany(targets);

      // Log timing in development
      if (process.env.NODE_ENV === 'development') {
        const elapsed = Date.now() - prefetchStart;
        if (elapsed > PREFETCH_TIMEOUT) {
          console.log(`[HoverPrefetcher] Slow prefetch trigger: ${elapsed}ms for ${config.id}`);
        }
      }
    }

    // Reset flag after a short delay to allow re-prefetch
    setTimeout(() => {
      tracked.isPrefetching = false;
    }, 500);
  }

  /**
   * Manually trigger prefetch for an element
   */
  prefetch(element: HTMLElement): void {
    const tracked = this.trackedElements.get(element);
    if (tracked) {
      this.triggerPrefetch(tracked);
    }
  }

  /**
   * Prefetch by config directly (without element)
   */
  prefetchByConfig(config: HoverPrefetchConfig): void {
    const mockTracked: TrackedElement = {
      element: null as unknown as HTMLElement,
      config,
      hoverTimeout: null,
      isPrefetching: false,
    };
    this.triggerPrefetch(mockTracked);
  }

  /**
   * Enable or disable hover prefetching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if an element is registered
   */
  isRegistered(element: HTMLElement): boolean {
    return this.trackedElements.has(element);
  }

  /**
   * Get count of registered elements
   */
  getRegisteredCount(): number {
    return this.trackedElements.size;
  }

  /**
   * Clean up all registrations
   */
  destroy(): void {
    this.trackedElements.forEach((tracked) => {
      if (tracked.hoverTimeout) {
        clearTimeout(tracked.hoverTimeout);
      }
    });
    this.trackedElements.clear();
    HoverPrefetcherClass.instance = null;
  }
}

// Export singleton instance
export const HoverPrefetcher = HoverPrefetcherClass.getInstance();

// Export type for external use
export type { HoverPrefetcherClass };
