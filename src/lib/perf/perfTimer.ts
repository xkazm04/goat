/**
 * Lightweight performance timing utility for algorithm instrumentation.
 * Logs structured entries with elapsed time and warns when exceeding a threshold.
 */

const SLOW_THRESHOLD_MS = 100;

interface PerfEntry {
  label: string;
  elapsedMs: number;
  meta: Record<string, string | number>;
}

/**
 * Time a synchronous function and log structured performance data.
 * Warns in console when execution exceeds SLOW_THRESHOLD_MS.
 */
export function timeSync<T>(
  label: string,
  meta: Record<string, string | number>,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const elapsedMs = performance.now() - start;

  const entry: PerfEntry = { label, elapsedMs: Math.round(elapsedMs * 100) / 100, meta };

  if (elapsedMs > SLOW_THRESHOLD_MS) {
    console.warn(`⏱️ SLOW: ${label} took ${entry.elapsedMs}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`, meta);
  } else if (process.env.NODE_ENV === 'development') {
    console.debug(`⏱️ ${label}: ${entry.elapsedMs}ms`, meta);
  }

  return result;
}
