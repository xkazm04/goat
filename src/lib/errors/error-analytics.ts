/**
 * Error Analytics - Tracking and Monitoring for Application Errors
 *
 * Provides:
 * - Error rate tracking by code and endpoint
 * - Error frequency analysis
 * - Integration points for external analytics services
 * - Development dashboard data
 */

import type { ErrorCode, ErrorCategory, ErrorSeverity } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ErrorEvent {
  /** Error code */
  code: ErrorCode;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Unique trace ID */
  traceId: string;
  /** Timestamp */
  timestamp: string;
  /** HTTP path (for API errors) */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Source component/feature */
  source?: string;
  /** User ID (if authenticated) */
  userId?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

export interface ErrorMetrics {
  /** Total error count */
  total: number;
  /** Errors by code */
  byCode: Record<string, number>;
  /** Errors by category */
  byCategory: Record<string, number>;
  /** Errors by path */
  byPath: Record<string, number>;
  /** Errors in the last hour */
  lastHour: number;
  /** Errors in the last 24 hours */
  last24Hours: number;
  /** Error rate (errors per minute, last 5 minutes) */
  errorRate: number;
  /** Most frequent errors */
  topErrors: Array<{ code: string; count: number }>;
}

export interface ErrorAnalyticsConfig {
  /** Enable tracking */
  enabled: boolean;
  /** Maximum events to store in memory */
  maxEvents: number;
  /** Flush interval for external services (ms) */
  flushInterval: number;
  /** External analytics endpoint */
  endpoint?: string;
  /** Include user ID in events */
  includeUserId: boolean;
  /** Sample rate (0-1) for high-volume environments */
  sampleRate: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ErrorAnalyticsConfig = {
  enabled: true,
  maxEvents: 1000,
  flushInterval: 60000, // 1 minute
  includeUserId: false,
  sampleRate: 1, // Track all errors by default
};

// ============================================================================
// Error Analytics Class
// ============================================================================

class ErrorAnalytics {
  private config: ErrorAnalyticsConfig;
  private events: ErrorEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private subscribers: Set<(event: ErrorEvent) => void> = new Set();

  constructor(config: Partial<ErrorAnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (typeof window !== 'undefined') {
      this.setupFlushTimer();
      this.exposeGlobalTracker();
    }
  }

  /**
   * Track an error event
   */
  track(event: Omit<ErrorEvent, 'timestamp'>): void {
    if (!this.config.enabled) return;

    // Sample rate check
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) {
      return;
    }

    const fullEvent: ErrorEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Remove user ID if configured
    if (!this.config.includeUserId) {
      delete fullEvent.userId;
    }

    // Store event
    this.events.push(fullEvent);

    // Trim if over limit
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(fullEvent);
      } catch (e) {
        console.error('Error in analytics subscriber:', e);
      }
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Error tracked:', {
        code: fullEvent.code,
        category: fullEvent.category,
        traceId: fullEvent.traceId,
      });
    }
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const byCode: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPath: Record<string, number> = {};
    let lastHour = 0;
    let last24Hours = 0;
    let lastFiveMinutes = 0;

    for (const event of this.events) {
      const eventTime = new Date(event.timestamp).getTime();

      // Count by code
      byCode[event.code] = (byCode[event.code] || 0) + 1;

      // Count by category
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;

      // Count by path
      if (event.path) {
        byPath[event.path] = (byPath[event.path] || 0) + 1;
      }

      // Time-based counts
      if (eventTime >= oneHourAgo) lastHour++;
      if (eventTime >= oneDayAgo) last24Hours++;
      if (eventTime >= fiveMinutesAgo) lastFiveMinutes++;
    }

    // Calculate error rate (per minute)
    const errorRate = lastFiveMinutes / 5;

    // Top errors
    const topErrors = Object.entries(byCode)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.events.length,
      byCode,
      byCategory,
      byPath,
      lastHour,
      last24Hours,
      errorRate,
      topErrors,
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit = 50): ErrorEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get events by code
   */
  getEventsByCode(code: ErrorCode, limit = 50): ErrorEvent[] {
    return this.events
      .filter((e) => e.code === code)
      .slice(-limit)
      .reverse();
  }

  /**
   * Subscribe to error events
   */
  subscribe(callback: (event: ErrorEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Flush events to external service
   */
  async flush(): Promise<void> {
    if (!this.config.endpoint || this.events.length === 0) return;

    const eventsToSend = [...this.events];

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });

      // Clear sent events
      this.events = this.events.filter(
        (e) => !eventsToSend.includes(e)
      );
    } catch (error) {
      console.error('Failed to flush error analytics:', error);
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ErrorAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !this.flushTimer) {
      this.setupFlushTimer();
    } else if (!this.config.enabled && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  private setupFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private exposeGlobalTracker(): void {
    // Expose tracker for error boundary and global-error.tsx
    (window as any).__GOAT_ERROR_TRACKER__ = (event: Partial<ErrorEvent>) => {
      this.track({
        code: (event.code as ErrorCode) || 'CLIENT_UNKNOWN_ERROR',
        category: (event.category as ErrorCategory) || 'client',
        severity: (event.severity as ErrorSeverity) || 'error',
        traceId: event.traceId || `goat-${Date.now().toString(36)}`,
        ...event,
      });
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyticsInstance: ErrorAnalytics | null = null;

/**
 * Get the error analytics instance
 */
export function getErrorAnalytics(
  config?: Partial<ErrorAnalyticsConfig>
): ErrorAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new ErrorAnalytics(config);
  } else if (config) {
    analyticsInstance.configure(config);
  }
  return analyticsInstance;
}

/**
 * Track an error event
 */
export function trackError(event: Omit<ErrorEvent, 'timestamp'>): void {
  getErrorAnalytics().track(event);
}

/**
 * Get error metrics
 */
export function getErrorMetrics(): ErrorMetrics {
  return getErrorAnalytics().getMetrics();
}

/**
 * Subscribe to error events
 */
export function subscribeToErrors(
  callback: (event: ErrorEvent) => void
): () => void {
  return getErrorAnalytics().subscribe(callback);
}

// ============================================================================
// Initialize Analytics
// ============================================================================

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  getErrorAnalytics();
}
