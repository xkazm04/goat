/**
 * SourceLatencyTracker
 *
 * Lightweight in-memory histogram that tracks per-source fetch latencies.
 * Provides p50/p95/p99 percentiles per DataSource for proactive
 * detection of degrading third-party APIs.
 */

import type { DataSource } from './types';

const MAX_SAMPLES = 500;

export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

class SourceLatencyTrackerClass {
  private samples: Map<DataSource, number[]> = new Map();

  record(source: DataSource, durationMs: number): void {
    let list = this.samples.get(source);
    if (!list) {
      list = [];
      this.samples.set(source, list);
    }
    list.push(durationMs);
    // Evict oldest when over limit
    if (list.length > MAX_SAMPLES) {
      list.splice(0, list.length - MAX_SAMPLES);
    }
  }

  getStats(source: DataSource): LatencyStats | null {
    const list = this.samples.get(source);
    if (!list || list.length === 0) return null;

    const sorted = [...list].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      count: len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      min: sorted[0],
      max: sorted[len - 1],
      mean: Math.round(sorted.reduce((s, v) => s + v, 0) / len),
    };
  }

  getAllStats(): Partial<Record<DataSource, LatencyStats>> {
    const result: Partial<Record<DataSource, LatencyStats>> = {};
    this.samples.forEach((_, source) => {
      const stats = this.getStats(source);
      if (stats) result[source] = stats;
    });
    return result;
  }

  reset(source?: DataSource): void {
    if (source) {
      this.samples.delete(source);
    } else {
      this.samples.clear();
    }
  }
}

export const SourceLatencyTracker = new SourceLatencyTrackerClass();
export { SourceLatencyTrackerClass };
