/**
 * Personalization Tracking API
 * Server-side event tracking for analytics
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Event type definition
 */
interface TrackingEvent {
  type: string;
  category: string;
  subcategory?: string;
  itemId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// In-memory event buffer (would use analytics service in production)
const eventBuffer: TrackingEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Upper bound on events accepted in ONE request. The buffer trims itself to
 * MAX_BUFFER_SIZE after the push, but `eventBuffer.push(...validEvents)` first
 * spreads the whole array onto the stack and into memory — a 10^6-event body
 * from an unauthenticated caller is a crash, not a trim. The client engine
 * flushes in batches of a few dozen. Not exported: Next rejects non-handler
 * exports from a route module at build time; the 413 body carries the value,
 * and route.test.ts pins it there.
 */
const MAX_EVENTS_PER_REQUEST = 100;

/**
 * POST /api/personalization/track
 * Track user behavior events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'events array is required' },
        { status: 400 }
      );
    }

    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `at most ${MAX_EVENTS_PER_REQUEST} events per request`,
          received: events.length,
          max: MAX_EVENTS_PER_REQUEST,
        },
        { status: 413 }
      );
    }

    // Validate and store events
    const validEvents: TrackingEvent[] = events
      .filter((event: Partial<TrackingEvent>): event is TrackingEvent & { type: string; category: string } => {
        return typeof event.type === 'string' && typeof event.category === 'string';
      })
      .map((event) => ({
        ...event,
        timestamp: event.timestamp || Date.now(),
      }));

    // Add to buffer
    eventBuffer.push(...validEvents);

    // Trim buffer if too large
    if (eventBuffer.length > MAX_BUFFER_SIZE) {
      eventBuffer.splice(0, eventBuffer.length - MAX_BUFFER_SIZE);
    }

    // In production, would send to analytics service:
    // await analyticsService.track(validEvents);

    return NextResponse.json({
      success: true,
      tracked: validEvents.length,
    });
  } catch (error) {
    console.error('Error tracking events:', error);
    return NextResponse.json(
      { error: 'Failed to track events' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/personalization/track
 * Get aggregated tracking stats (for admin/analytics dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const since = searchParams.get('since');

    let filtered = [...eventBuffer];

    // Filter by category
    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }

    // Filter by type
    if (type) {
      filtered = filtered.filter((e) => e.type === type);
    }

    // Filter by time
    if (since) {
      const sinceTime = parseInt(since, 10);
      filtered = filtered.filter((e) => e.timestamp >= sinceTime);
    }

    // Aggregate stats
    const stats = {
      totalEvents: filtered.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      recentEvents: filtered.slice(-10),
    };

    for (const event of filtered) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching tracking stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
