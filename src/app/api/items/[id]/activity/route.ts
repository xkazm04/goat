import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ActivityTimelineData, ActivityEvent, TrajectoryPoint } from '@/types/item-details';

export const dynamic = 'force-dynamic';

/**
 * GET /api/items/:id/activity - Fetch activity timeline for an item
 *
 * Query params:
 * - limit: number of events (default 20, max 50)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const supabase = await createClient();

    // Fetch activity events for this item
    const { data: events, error, count } = await supabase
      .from('ranking_activities')
      .select('id, action, position_before, position_after, list_title, list_id, metadata, created_at', { count: 'exact' })
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activityEvents: ActivityEvent[] = (events || []).map(e => ({
      id: e.id,
      action: e.action as ActivityEvent['action'],
      position_before: e.position_before,
      position_after: e.position_after,
      list_title: e.list_title,
      list_id: e.list_id,
      metadata: e.metadata as Record<string, unknown> | null,
      created_at: e.created_at,
    }));

    // Build trajectory from position-setting events (assign, move, swap, rank_change)
    const positionEvents = (events || [])
      .filter(e => e.position_after != null && e.action !== 'remove')
      .reverse(); // chronological order for trajectory

    const trajectory: TrajectoryPoint[] = positionEvents.map(e => ({
      date: e.created_at,
      position: e.position_after!,
    }));

    const response: ActivityTimelineData = {
      events: activityEvents,
      trajectory,
      totalEvents: count || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/items/:id/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/items/:id/activity - Log a ranking activity event
 *
 * Body: { action, list_id?, list_title?, position_before?, position_after?, metadata? }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { action, list_id, list_title, position_before, position_after, metadata } = body;

    if (!action || !['assign', 'move', 'swap', 'remove', 'rank_change'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('ranking_activities')
      .insert({
        item_id: id,
        action,
        list_id: list_id || null,
        list_title: list_title || null,
        position_before: position_before ?? null,
        position_after: position_after ?? null,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error logging activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in POST /api/items/:id/activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
