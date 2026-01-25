/**
 * ShareAnalytics
 * Tracks share events and performance
 */

import type {
  SharePlatform,
  ShareContentType,
  ShareEvent,
  ShareAnalyticsSummary,
} from './types';

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `share_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get device info from user agent
 */
function getDeviceInfo(): ShareEvent['device'] {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return undefined;
  }

  const ua = navigator.userAgent;

  let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/iPad|tablet/i.test(ua)) {
    type = 'tablet';
  } else if (/iPhone|Android.*Mobile/i.test(ua)) {
    type = 'mobile';
  }

  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';

  let browser = 'Unknown';
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';

  return { type, os, browser };
}

/**
 * ShareAnalytics class
 * Manages share event tracking
 */
export class ShareAnalytics {
  private apiEndpoint: string;
  private queue: ShareEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds
  private maxQueueSize: number = 10;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(apiEndpoint: string = '/api/share/analytics') {
    this.apiEndpoint = apiEndpoint;

    // Start flush timer
    if (typeof window !== 'undefined') {
      this.startFlushTimer();

      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });

      // Flush on visibility change (going to background)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flush(true);
        }
      });
    }
  }

  /**
   * Track a share event
   */
  track(options: {
    platform: SharePlatform;
    contentType: ShareContentType;
    contentId: string;
    userId?: string;
    completed?: boolean;
    utmParams?: ShareEvent['utmParams'];
  }): ShareEvent {
    const event: ShareEvent = {
      id: generateEventId(),
      platform: options.platform,
      contentType: options.contentType,
      contentId: options.contentId,
      userId: options.userId,
      timestamp: new Date().toISOString(),
      completed: options.completed ?? false,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      utmParams: options.utmParams,
      device: getDeviceInfo(),
    };

    this.queue.push(event);

    // Flush if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }

    return event;
  }

  /**
   * Mark an event as completed
   */
  markCompleted(eventId: string): void {
    const event = this.queue.find((e) => e.id === eventId);
    if (event) {
      event.completed = true;
    }
  }

  /**
   * Track share initiation (when user clicks share button)
   */
  trackInitiation(
    platform: SharePlatform,
    contentType: ShareContentType,
    contentId: string,
    userId?: string
  ): ShareEvent {
    return this.track({
      platform,
      contentType,
      contentId,
      userId,
      completed: false,
    });
  }

  /**
   * Track share completion (when share dialog closes or succeeds)
   */
  trackCompletion(eventId: string): void {
    this.markCompleted(eventId);
    // Flush immediately to capture completion
    this.flush();
  }

  /**
   * Start the auto-flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Stop the auto-flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush queued events to the server
   */
  async flush(useBeacon: boolean = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          this.apiEndpoint,
          JSON.stringify({ events })
        );
      } else {
        // Use fetch for normal delivery
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
        });
      }
    } catch (error) {
      // On failure, add events back to queue
      this.queue = [...events, ...this.queue];
      console.error('Failed to flush share analytics:', error);
    }
  }

  /**
   * Get local analytics summary (from queue)
   */
  getLocalSummary(): Partial<ShareAnalyticsSummary> {
    const events = this.queue;

    const byPlatform: Partial<Record<SharePlatform, number>> = {};
    const byContentType: Partial<Record<ShareContentType, number>> = {};
    let completed = 0;

    events.forEach((event) => {
      byPlatform[event.platform] = (byPlatform[event.platform] || 0) + 1;
      byContentType[event.contentType] = (byContentType[event.contentType] || 0) + 1;
      if (event.completed) completed++;
    });

    const topPlatform = Object.entries(byPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | SharePlatform
      | undefined;

    return {
      totalShares: events.length,
      byPlatform: byPlatform as Record<SharePlatform, number>,
      byContentType: byContentType as Record<ShareContentType, number>,
      completionRate: events.length > 0 ? (completed / events.length) * 100 : 0,
      topPlatform,
    };
  }

  /**
   * Fetch analytics summary from server
   */
  async fetchSummary(options?: {
    startDate?: string;
    endDate?: string;
    contentId?: string;
    userId?: string;
  }): Promise<ShareAnalyticsSummary | null> {
    try {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('start', options.startDate);
      if (options?.endDate) params.append('end', options.endDate);
      if (options?.contentId) params.append('contentId', options.contentId);
      if (options?.userId) params.append('userId', options.userId);

      const response = await fetch(`${this.apiEndpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch share analytics:', error);
      return null;
    }
  }
}

// Singleton instance
let analyticsInstance: ShareAnalytics | null = null;

/**
 * Get or create ShareAnalytics instance
 */
export function getShareAnalytics(apiEndpoint?: string): ShareAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new ShareAnalytics(apiEndpoint);
  }
  return analyticsInstance;
}

/**
 * Create a new ShareAnalytics instance
 */
export function createShareAnalytics(apiEndpoint?: string): ShareAnalytics {
  return new ShareAnalytics(apiEndpoint);
}
