/**
 * Performance Measurement Utilities
 *
 * Provides tools for measuring and reporting performance metrics,
 * specifically designed for tracking lazy loading improvements.
 *
 * Features:
 * - First Paint / First Contentful Paint tracking
 * - Component mount timing
 * - Bundle load timing
 * - Performance marks and measures
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Performance entry types
interface PerformanceMetrics {
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  domContentLoaded?: number;
  domInteractive?: number;
  loadComplete?: number;
  timeToInteractive?: number;
}

interface ComponentLoadMetric {
  name: string;
  loadStart: number;
  loadEnd?: number;
  duration?: number;
}

// Store for component load metrics
const componentMetrics: Map<string, ComponentLoadMetric> = new Map();

/**
 * Mark the start of a component/module load
 */
export function markLoadStart(componentName: string): void {
  if (!isBrowser) return;

  const startTime = performance.now();
  componentMetrics.set(componentName, {
    name: componentName,
    loadStart: startTime,
  });

  // Also add a performance mark for browser devtools
  try {
    performance.mark(`${componentName}-load-start`);
  } catch {
    // Ignore errors in older browsers
  }
}

/**
 * Mark the end of a component/module load
 */
export function markLoadEnd(componentName: string): number | null {
  if (!isBrowser) return null;

  const metric = componentMetrics.get(componentName);
  if (!metric) {
    console.warn(`No load start found for component: ${componentName}`);
    return null;
  }

  const endTime = performance.now();
  const duration = endTime - metric.loadStart;

  metric.loadEnd = endTime;
  metric.duration = duration;

  // Add performance marks and measures for browser devtools
  try {
    performance.mark(`${componentName}-load-end`);
    performance.measure(
      `${componentName}-load`,
      `${componentName}-load-start`,
      `${componentName}-load-end`
    );
  } catch {
    // Ignore errors in older browsers
  }

  return duration;
}

/**
 * Get all component load metrics
 */
export function getComponentMetrics(): ComponentLoadMetric[] {
  return Array.from(componentMetrics.values());
}

/**
 * Clear all component metrics
 */
export function clearComponentMetrics(): void {
  componentMetrics.clear();
}

/**
 * Get core web vitals and paint timings
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  if (!isBrowser) return {};

  const metrics: PerformanceMetrics = {};

  try {
    // Get paint timing entries
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    }

    // Get navigation timing
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      metrics.domContentLoaded = nav.domContentLoadedEventEnd;
      metrics.domInteractive = nav.domInteractive;
      metrics.loadComplete = nav.loadEventEnd;
    }
  } catch {
    // Ignore errors in older browsers
  }

  return metrics;
}

/**
 * Report performance metrics to console (development only)
 */
export function reportPerformance(): void {
  if (!isBrowser || process.env.NODE_ENV === 'production') return;

  const metrics = getPerformanceMetrics();
  const componentLoads = getComponentMetrics();

  console.group('📊 Performance Report');

  // Core metrics
  console.log('🎨 Paint Metrics:');
  if (metrics.firstPaint) {
    console.log(`  First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
  }
  if (metrics.firstContentfulPaint) {
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
  }

  // Navigation metrics
  console.log('📄 Navigation Metrics:');
  if (metrics.domInteractive) {
    console.log(`  DOM Interactive: ${metrics.domInteractive.toFixed(2)}ms`);
  }
  if (metrics.domContentLoaded) {
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
  }
  if (metrics.loadComplete) {
    console.log(`  Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
  }

  // Component load metrics
  if (componentLoads.length > 0) {
    console.log('📦 Lazy Component Loads:');
    for (const load of componentLoads) {
      if (load.duration !== undefined) {
        console.log(`  ${load.name}: ${load.duration.toFixed(2)}ms`);
      }
    }
  }

  console.groupEnd();
}

/**
 * Observe Largest Contentful Paint
 */
export function observeLCP(callback: (lcp: number) => void): (() => void) | null {
  if (!isBrowser || !('PerformanceObserver' in window)) return null;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        callback(lastEntry.startTime);
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/**
 * Create a wrapper that measures component load time
 */
export function withLoadTiming<T>(
  componentName: string,
  importFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    markLoadStart(componentName);
    const result = await importFn();
    const duration = markLoadEnd(componentName);
    if (duration !== null && process.env.NODE_ENV !== 'production') {
      console.log(`⏱️ ${componentName} loaded in ${duration.toFixed(2)}ms`);
    }
    return result;
  };
}

/**
 * Hook to report performance after component mount
 */
export function usePerformanceReport(delay = 1000): void {
  if (!isBrowser) return;

  // Schedule performance report after initial render
  setTimeout(() => {
    reportPerformance();
  }, delay);
}
