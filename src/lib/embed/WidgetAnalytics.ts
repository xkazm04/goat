/**
 * WidgetAnalytics
 * Analytics tracking for embedded widgets
 * Tracks impressions, interactions, and click-throughs
 */

import type { WidgetAnalyticsEvent, WidgetConfig } from './types';

/**
 * Analytics endpoint
 */
const getAnalyticsEndpoint = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/embed/analytics`;
  }
  return process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/embed/analytics`
    : '/api/embed/analytics';
};

/**
 * Generate a hash from widget config for tracking
 */
function generateConfigHash(config: WidgetConfig): string {
  const str = `${config.listId}-${config.size}-${config.theme}-${config.displayStyle}-${config.itemCount}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get referrer domain
 */
function getReferrer(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  try {
    // In iframe, check parent origin via document.referrer
    if (document.referrer) {
      const url = new URL(document.referrer);
      return url.hostname;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * WidgetAnalytics class
 * Handles all widget analytics tracking
 */
export class WidgetAnalytics {
  private config: WidgetConfig;
  private configHash: string;
  private impressionTracked: boolean = false;
  private eventQueue: WidgetAnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.configHash = generateConfigHash(config);
  }

  /**
   * Track impression (view of the widget)
   * Only tracks once per instance
   */
  trackImpression(): void {
    if (this.impressionTracked) return;

    this.queueEvent({
      type: 'impression',
      listId: this.config.listId,
      configHash: this.configHash,
      referrer: getReferrer(),
      timestamp: Date.now(),
      metadata: {
        size: this.config.size,
        theme: this.config.theme,
        displayStyle: this.config.displayStyle,
        itemCount: this.config.itemCount,
      },
    });

    this.impressionTracked = true;
  }

  /**
   * Track interaction (hover, scroll, etc.)
   */
  trackInteraction(interactionType: string, itemRank?: number): void {
    this.queueEvent({
      type: 'interaction',
      listId: this.config.listId,
      configHash: this.configHash,
      referrer: getReferrer(),
      timestamp: Date.now(),
      metadata: {
        interactionType,
        ...(itemRank !== undefined && { itemRank }),
      },
    });
  }

  /**
   * Track click-through to full ranking
   */
  trackClickThrough(itemRank?: number, itemTitle?: string): void {
    this.queueEvent({
      type: 'click_through',
      listId: this.config.listId,
      configHash: this.configHash,
      referrer: getReferrer(),
      timestamp: Date.now(),
      metadata: {
        ...(itemRank !== undefined && { itemRank }),
        ...(itemTitle !== undefined && { itemTitle }),
      },
    });

    // Flush immediately for click-throughs
    this.flush();
  }

  /**
   * Track share action
   */
  trackShare(shareType: string): void {
    this.queueEvent({
      type: 'share',
      listId: this.config.listId,
      configHash: this.configHash,
      referrer: getReferrer(),
      timestamp: Date.now(),
      metadata: {
        shareType,
      },
    });
  }

  /**
   * Queue event for batched sending
   */
  private queueEvent(event: WidgetAnalyticsEvent): void {
    this.eventQueue.push(event);

    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, 5000); // Batch events for 5 seconds
    }

    // Flush immediately if queue is getting large
    if (this.eventQueue.length >= 10) {
      this.flush();
    }
  }

  /**
   * Flush event queue to server
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Use sendBeacon if available for reliability
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ events })], {
          type: 'application/json',
        });
        navigator.sendBeacon(getAnalyticsEndpoint(), blob);
      } else {
        // Fallback to fetch
        await fetch(getAnalyticsEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
          keepalive: true,
        });
      }
    } catch (error) {
      // Re-queue events on failure (up to a limit)
      if (this.eventQueue.length < 50) {
        this.eventQueue.push(...events);
      }
      console.error('Failed to send widget analytics:', error);
    }
  }

  /**
   * Cleanup (call on widget unmount)
   */
  destroy(): void {
    this.flush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

/**
 * Create widget analytics instance
 */
export function createWidgetAnalytics(config: WidgetConfig): WidgetAnalytics {
  return new WidgetAnalytics(config);
}

/**
 * Lightweight analytics for server-side tracking
 * Used by the embed API route
 */
export async function trackServerImpression(
  listId: string,
  referrer?: string,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  const event: WidgetAnalyticsEvent = {
    type: 'impression',
    listId,
    configHash: 'server',
    referrer,
    timestamp: Date.now(),
    metadata,
  };

  // In production, this would write to a database or analytics service
  // For now, we'll log it
  console.log('[Widget Analytics]', event);
}

/**
 * Aggregate analytics for a list
 */
export interface WidgetAnalyticsSummary {
  listId: string;
  totalImpressions: number;
  uniqueReferrers: number;
  topReferrers: { domain: string; count: number }[];
  clickThroughRate: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Get analytics summary for a list
 * This would query a database in production
 */
export async function getAnalyticsSummary(
  listId: string,
  periodDays: number = 30
): Promise<WidgetAnalyticsSummary | null> {
  // Placeholder - would query database
  return {
    listId,
    totalImpressions: 0,
    uniqueReferrers: 0,
    topReferrers: [],
    clickThroughRate: 0,
    periodStart: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  };
}
