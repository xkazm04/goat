import { NextRequest, NextResponse } from 'next/server';
import type { WidgetAnalyticsEvent } from '@/lib/embed';

/**
 * POST handler - receives analytics events from widgets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body as { events: WidgetAnalyticsEvent[] };

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Get referrer from request headers as backup
    const headerReferrer = request.headers.get('referer') || request.headers.get('origin');

    // Process events
    const processedEvents = events.map(event => ({
      ...event,
      referrer: event.referrer || (headerReferrer ? new URL(headerReferrer).hostname : undefined),
      processedAt: Date.now(),
    }));

    // In production, you would:
    // 1. Store events in a time-series database (InfluxDB, TimescaleDB)
    // 2. Or queue them for batch processing (Redis, SQS)
    // 3. Or send to an analytics service (Mixpanel, Amplitude)

    // For now, log the events
    processedEvents.forEach(event => {
      console.log('[Widget Analytics]', JSON.stringify(event));
    });

    // Return success
    return NextResponse.json(
      { success: true, processed: processedEvents.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to process analytics' },
      { status: 500 }
    );
  }
}

/**
 * GET handler - returns analytics summary for a list
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get('listId');
  const period = searchParams.get('period') || '30';

  if (!listId) {
    return NextResponse.json(
      { error: 'Missing listId parameter' },
      { status: 400 }
    );
  }

  // In production, query the database for aggregated analytics
  // For now, return mock data
  const summary = {
    listId,
    period: `${period}d`,
    metrics: {
      totalImpressions: 0,
      uniqueReferrers: 0,
      clickThroughs: 0,
      clickThroughRate: 0,
    },
    topReferrers: [],
    dailyImpressions: [],
  };

  return NextResponse.json(summary);
}
