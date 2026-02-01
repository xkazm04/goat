/**
 * ScrollPrefetcher
 *
 * Uses Intersection Observer to detect when elements enter the viewport
 * and trigger prefetching for upcoming content. Useful for:
 * - Prefetching next page of infinite scroll
 * - Prefetching items as user scrolls through a list
 * - Prefetching content that's about to come into view
 *
 * Features:
 * - Configurable trigger margins (prefetch before visible)
 * - Deduplication (don't prefetch same item twice)
 * - Threshold-based triggering
 * - Multiple observer support for different contexts
 */

import { PrefetchManager, type PrefetchTarget } from './PrefetchManager';

export type ScrollTriggerType = 'pagination' | 'item' | 'section' | 'custom';

export interface ScrollPrefetchConfig {
  /** Type of scroll trigger */
  type: ScrollTriggerType;
  /** Unique identifier */
  id: string;
  /** Prefetch targets to load when triggered */
  targets: PrefetchTarget[];
  /** Root margin for intersection observer (e.g., "100px" to trigger early) */
  rootMargin?: string;
  /** Intersection threshold (0-1) */
  threshold?: number;
  /** Only trigger once per element */
  once?: boolean;
}

interface TrackedElement {
  element: HTMLElement;
  config: ScrollPrefetchConfig;
  hasFired: boolean;
}

/** Default root margin - trigger when element is 200px from viewport */
const DEFAULT_ROOT_MARGIN = '200px';

/** Default threshold - trigger when any part of element is visible */
const DEFAULT_THRESHOLD = 0;

class ScrollPrefetcherClass {
  private static instance: ScrollPrefetcherClass | null = null;
  private observers: Map<string, IntersectionObserver> = new Map();
  private trackedElements: Map<HTMLElement, TrackedElement> = new Map();
  private prefetchedIds: Set<string> = new Set();
  private enabled: boolean = true;

  private constructor() {}

  static getInstance(): ScrollPrefetcherClass {
    if (!ScrollPrefetcherClass.instance) {
      ScrollPrefetcherClass.instance = new ScrollPrefetcherClass();
    }
    return ScrollPrefetcherClass.instance;
  }

  /**
   * Get or create an observer for a specific configuration
   */
  private getObserver(rootMargin: string, threshold: number): IntersectionObserver {
    const key = `${rootMargin}-${threshold}`;

    if (this.observers.has(key)) {
      return this.observers.get(key)!;
    }

    const observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin,
        threshold,
      }
    );

    this.observers.set(key, observer);
    return observer;
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    if (!this.enabled) return;

    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const tracked = this.trackedElements.get(entry.target as HTMLElement);
      if (!tracked) continue;

      // Check if already fired (for once: true config)
      if (tracked.config.once && tracked.hasFired) continue;

      // Check if already prefetched
      if (this.prefetchedIds.has(tracked.config.id)) continue;

      // Mark as fired
      tracked.hasFired = true;
      this.prefetchedIds.add(tracked.config.id);

      // Trigger prefetch
      const targets = tracked.config.targets.map((t) => ({
        ...t,
        source: 'scroll' as const,
        priority: t.priority ?? ('medium' as const),
      }));

      PrefetchManager.prefetchMany(targets);

      // Unobserve if once: true
      if (tracked.config.once) {
        this.unregister(entry.target as HTMLElement);
      }
    }
  }

  /**
   * Register an element for scroll-based prefetching
   */
  register(element: HTMLElement, config: ScrollPrefetchConfig): () => void {
    if (!element || this.trackedElements.has(element)) {
      return () => {};
    }

    // Skip if running on server
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return () => {};
    }

    const tracked: TrackedElement = {
      element,
      config,
      hasFired: false,
    };

    this.trackedElements.set(element, tracked);

    // Get appropriate observer
    const observer = this.getObserver(
      config.rootMargin ?? DEFAULT_ROOT_MARGIN,
      config.threshold ?? DEFAULT_THRESHOLD
    );

    observer.observe(element);

    // Return cleanup function
    return () => this.unregister(element);
  }

  /**
   * Unregister an element
   */
  unregister(element: HTMLElement): void {
    const tracked = this.trackedElements.get(element);
    if (!tracked) return;

    // Find and unobserve from the appropriate observer
    this.observers.forEach((observer) => {
      observer.unobserve(element);
    });

    this.trackedElements.delete(element);
  }

  /**
   * Register a pagination trigger (e.g., for infinite scroll)
   */
  registerPaginationTrigger(
    element: HTMLElement,
    config: {
      id: string;
      onTrigger: () => PrefetchTarget[];
      rootMargin?: string;
    }
  ): () => void {
    // Create a proxy config that generates targets on trigger
    const targets = config.onTrigger();

    return this.register(element, {
      type: 'pagination',
      id: config.id,
      targets,
      rootMargin: config.rootMargin ?? '400px', // Larger margin for pagination
      threshold: 0,
      once: true, // Only trigger once per element
    });
  }

  /**
   * Batch register multiple elements
   */
  registerMany(
    elements: HTMLElement[],
    configFactory: (element: HTMLElement, index: number) => ScrollPrefetchConfig
  ): () => void {
    const cleanups: (() => void)[] = [];

    elements.forEach((element, index) => {
      const config = configFactory(element, index);
      cleanups.push(this.register(element, config));
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }

  /**
   * Reset prefetched IDs (allow re-prefetch)
   */
  resetPrefetchedIds(): void {
    this.prefetchedIds.clear();
    this.trackedElements.forEach((tracked) => {
      tracked.hasFired = false;
    });
  }

  /**
   * Enable or disable scroll prefetching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if an element is being tracked
   */
  isTracked(element: HTMLElement): boolean {
    return this.trackedElements.has(element);
  }

  /**
   * Get the number of tracked elements
   */
  getTrackedCount(): number {
    return this.trackedElements.size;
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    trackedElements: number;
    prefetchedCount: number;
    observerCount: number;
  } {
    return {
      trackedElements: this.trackedElements.size,
      prefetchedCount: this.prefetchedIds.size,
      observerCount: this.observers.size,
    };
  }

  /**
   * Clean up all observers and tracked elements
   */
  destroy(): void {
    // Disconnect all observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });

    this.observers.clear();
    this.trackedElements.clear();
    this.prefetchedIds.clear();
    ScrollPrefetcherClass.instance = null;
  }
}

// Export singleton instance
export const ScrollPrefetcher = ScrollPrefetcherClass.getInstance();

// Export type for external use
export type { ScrollPrefetcherClass };
