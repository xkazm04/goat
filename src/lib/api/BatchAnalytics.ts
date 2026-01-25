/**
 * BatchAnalytics - Track and report on batching efficiency
 *
 * Provides real-time analytics on request batching performance,
 * including savings, efficiency metrics, and trend analysis.
 */

import { getGlobalBatchManager, type BatchManagerStats } from './BatchManager';
import { getGlobalDeduplicator, type DeduplicatorStats } from './Deduplicator';
import { getGlobalWindowScheduler } from './WindowScheduler';

// =============================================================================
// Types
// =============================================================================

export interface BatchAnalyticsSnapshot {
  timestamp: number;
  batch: BatchManagerStats;
  dedup: DeduplicatorStats;
  scheduler: {
    pendingCount: number;
    isProcessing: boolean;
  };
}

export interface BatchAnalyticsSummary {
  /** Total API requests made (after batching) */
  actualRequests: number;
  /** Total requests if not batched */
  potentialRequests: number;
  /** Requests saved by batching */
  requestsSaved: number;
  /** Requests saved by deduplication */
  requestsDeduped: number;
  /** Overall efficiency (0-1) */
  efficiency: number;
  /** Deduplication rate (0-1) */
  deduplicationRate: number;
  /** Average batch size */
  averageBatchSize: number;
  /** Total batches executed */
  totalBatches: number;
  /** Estimated time saved (ms) - rough estimate assuming 50ms per request */
  estimatedTimeSaved: number;
}

export interface BatchAnalyticsReport {
  summary: BatchAnalyticsSummary;
  history: BatchAnalyticsSnapshot[];
  recommendations: string[];
}

// =============================================================================
// Constants
// =============================================================================

const ESTIMATED_REQUEST_TIME_MS = 50; // Rough estimate per request
const MAX_HISTORY_LENGTH = 100;

// =============================================================================
// BatchAnalytics Class
// =============================================================================

class BatchAnalytics {
  private history: BatchAnalyticsSnapshot[] = [];
  private startTime: number = Date.now();

  /**
   * Take a snapshot of current analytics state
   */
  snapshot(): BatchAnalyticsSnapshot {
    const batchManager = getGlobalBatchManager();
    const deduplicator = getGlobalDeduplicator();
    const scheduler = getGlobalWindowScheduler();

    const snapshot: BatchAnalyticsSnapshot = {
      timestamp: Date.now(),
      batch: batchManager.getStats(),
      dedup: deduplicator.getStats(),
      scheduler: scheduler.getStats(),
    };

    // Add to history
    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY_LENGTH) {
      this.history.shift();
    }

    return snapshot;
  }

  /**
   * Get a summary of batching efficiency
   */
  getSummary(): BatchAnalyticsSummary {
    const batchStats = getGlobalBatchManager().getStats();
    const dedupStats = getGlobalDeduplicator().getStats();

    const potentialRequests = batchStats.totalRequests + dedupStats.deduplicatedRequests;
    const actualRequests = batchStats.totalBatches;
    const requestsSaved = batchStats.requestsSaved;
    const requestsDeduped = dedupStats.deduplicatedRequests;

    return {
      actualRequests,
      potentialRequests,
      requestsSaved,
      requestsDeduped,
      efficiency: potentialRequests > 0 ? 1 - actualRequests / potentialRequests : 0,
      deduplicationRate: dedupStats.deduplicationRate,
      averageBatchSize: batchStats.averageBatchSize,
      totalBatches: batchStats.totalBatches,
      estimatedTimeSaved: (requestsSaved + requestsDeduped) * ESTIMATED_REQUEST_TIME_MS,
    };
  }

  /**
   * Get a full analytics report with recommendations
   */
  getReport(): BatchAnalyticsReport {
    const summary = this.getSummary();
    const recommendations = this.generateRecommendations(summary);

    return {
      summary,
      history: [...this.history],
      recommendations,
    };
  }

  /**
   * Get efficiency percentage as a formatted string
   */
  getEfficiencyDisplay(): string {
    const summary = this.getSummary();
    return `${(summary.efficiency * 100).toFixed(1)}%`;
  }

  /**
   * Get a human-readable summary string
   */
  getDisplaySummary(): string {
    const summary = this.getSummary();

    const lines = [
      `📊 Batch Analytics`,
      `─────────────────────────`,
      `Efficiency: ${(summary.efficiency * 100).toFixed(1)}%`,
      `Requests saved: ${summary.requestsSaved} (batching) + ${summary.requestsDeduped} (dedup)`,
      `Total batches: ${summary.totalBatches}`,
      `Avg batch size: ${summary.averageBatchSize.toFixed(1)}`,
      `Est. time saved: ${summary.estimatedTimeSaved}ms`,
    ];

    return lines.join('\n');
  }

  /**
   * Log the current summary to console
   */
  logSummary(): void {
    console.log(this.getDisplaySummary());
  }

  /**
   * Reset all analytics
   */
  reset(): void {
    this.history = [];
    this.startTime = Date.now();
    getGlobalBatchManager().resetStats();
    getGlobalDeduplicator().resetStats();
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get history of snapshots
   */
  getHistory(): BatchAnalyticsSnapshot[] {
    return [...this.history];
  }

  private generateRecommendations(summary: BatchAnalyticsSummary): string[] {
    const recommendations: string[] = [];

    // Low efficiency
    if (summary.efficiency < 0.3 && summary.totalBatches > 10) {
      recommendations.push(
        'Consider increasing the batch window duration to capture more requests per batch.'
      );
    }

    // Very high efficiency (might be over-batching)
    if (summary.efficiency > 0.8 && summary.averageBatchSize > 20) {
      recommendations.push(
        'High batch sizes may introduce latency. Consider reducing max batch size.'
      );
    }

    // Low deduplication rate
    if (summary.deduplicationRate < 0.1 && summary.potentialRequests > 50) {
      recommendations.push(
        'Low deduplication rate suggests unique requests. Consider prefetching common data.'
      );
    }

    // High deduplication rate
    if (summary.deduplicationRate > 0.5) {
      recommendations.push(
        'High deduplication rate - components may be fetching redundant data. Consider lifting queries to parent components.'
      );
    }

    // Small batch sizes
    if (summary.averageBatchSize < 2 && summary.totalBatches > 20) {
      recommendations.push(
        'Average batch size is very small. Requests may not be timing aligned - check component render patterns.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Batching efficiency is good! No recommendations at this time.');
    }

    return recommendations;
  }
}

// =============================================================================
// Singleton & Exports
// =============================================================================

let globalAnalytics: BatchAnalytics | null = null;

/**
 * Get the global BatchAnalytics instance
 */
export function getGlobalBatchAnalytics(): BatchAnalytics {
  if (!globalAnalytics) {
    globalAnalytics = new BatchAnalytics();
  }
  return globalAnalytics;
}

/**
 * Reset the global BatchAnalytics (mainly for testing)
 */
export function resetGlobalBatchAnalytics(): void {
  if (globalAnalytics) {
    globalAnalytics.reset();
    globalAnalytics = null;
  }
}

/**
 * Log batch analytics summary (convenience function)
 */
export function logBatchAnalytics(): void {
  getGlobalBatchAnalytics().logSummary();
}

// Export for convenience
export { BatchAnalytics };
