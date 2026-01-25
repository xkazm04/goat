/**
 * Share Analytics API Route
 * Tracks share events and returns analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type {
  ShareEvent,
  SharePlatform,
  ShareContentType,
  ShareAnalyticsSummary,
} from '@/lib/sharing/types';

/**
 * In-memory store for share events (replace with database in production)
 */
const shareEvents: ShareEvent[] = [];

/**
 * POST /api/share/analytics
 * Track share events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body as { events: ShareEvent[] };

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid events array' },
        { status: 400 }
      );
    }

    // Get user ID if authenticated
    const { userId } = await auth();

    // Add events to store
    events.forEach((event) => {
      // Override userId if authenticated and not set
      if (userId && !event.userId) {
        event.userId = userId;
      }

      shareEvents.push(event);
    });

    // Trim old events (keep last 10000)
    if (shareEvents.length > 10000) {
      shareEvents.splice(0, shareEvents.length - 10000);
    }

    return NextResponse.json({ success: true, count: events.length });
  } catch (error) {
    console.error('Error tracking share events:', error);
    return NextResponse.json(
      { error: 'Failed to track events' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/share/analytics
 * Get share analytics summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const contentId = searchParams.get('contentId');
    const userId = searchParams.get('userId');

    // Filter events
    let filtered = [...shareEvents];

    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((e) => new Date(e.timestamp) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((e) => new Date(e.timestamp) <= end);
    }

    if (contentId) {
      filtered = filtered.filter((e) => e.contentId === contentId);
    }

    if (userId) {
      filtered = filtered.filter((e) => e.userId === userId);
    }

    // Calculate summary
    const byPlatform: Record<SharePlatform, number> = {} as Record<SharePlatform, number>;
    const byContentType: Record<ShareContentType, number> = {} as Record<ShareContentType, number>;
    let completed = 0;

    filtered.forEach((event) => {
      byPlatform[event.platform] = (byPlatform[event.platform] || 0) + 1;
      byContentType[event.contentType] = (byContentType[event.contentType] || 0) + 1;
      if (event.completed) completed++;
    });

    // Find top platform
    const sortedPlatforms = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);
    const topPlatform = (sortedPlatforms[0]?.[0] || 'twitter') as SharePlatform;

    const summary: ShareAnalyticsSummary = {
      totalShares: filtered.length,
      byPlatform,
      byContentType,
      completionRate: filtered.length > 0 ? (completed / filtered.length) * 100 : 0,
      topPlatform,
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString(),
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching share analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
