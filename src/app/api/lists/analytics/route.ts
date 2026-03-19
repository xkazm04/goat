import { NextRequest } from 'next/server';

import {
  withErrorHandler,
  fromSupabaseError,
  successResponse,
  assertRequired,
} from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

import type { CreatorListAnalytics, CreatorAnalyticsSummary } from '@/types/top-lists';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lists/analytics - Get creator analytics for all lists owned by the authenticated user
 *
 * Query params:
 *   user_id (required) - The user whose lists to analyze
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  assertRequired(userId, 'user_id');

  // Fetch user's lists
  const { data: lists, error: listsError } = await supabase
    .from('lists')
    .select('id, title, category, size, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (listsError) throw fromSupabaseError(listsError);
  if (!lists || lists.length === 0) {
    const empty: CreatorAnalyticsSummary = {
      total_lists: 0,
      total_views: 0,
      total_shares: 0,
      total_rankers: 0,
      lists: [],
    };
    return successResponse(empty);
  }

  const listIds = lists.map((l) => l.id);

  // Run all aggregation queries in parallel
  const [sharesResult, activitiesResult, listItemsResult] = await Promise.all([
    // Shared rankings per list (views + share count)
    supabase
      .from('shared_rankings')
      .select('list_id, view_count, created_at')
      .in('list_id', listIds),

    // Ranking activities per list
    supabase
      .from('ranking_activities')
      .select('list_id, item_id, user_id, action, position_after, created_at')
      .in('list_id', listIds),

    // List items (ranked items per list)
    supabase
      .from('list_items')
      .select('list_id, item_id, ranking')
      .in('list_id', listIds),
  ]);

  if (sharesResult.error) throw fromSupabaseError(sharesResult.error);
  if (activitiesResult.error) throw fromSupabaseError(activitiesResult.error);
  if (listItemsResult.error) throw fromSupabaseError(listItemsResult.error);

  const shares = sharesResult.data || [];
  const activities = activitiesResult.data || [];
  const listItems = listItemsResult.data || [];

  // Collect unique item IDs to fetch names/images
  const allItemIds = new Set<string>();
  for (const a of activities) allItemIds.add(a.item_id);
  for (const li of listItems) allItemIds.add(li.item_id);

  const itemIds = Array.from(allItemIds);
  let itemMap: Record<string, { name: string; image_url: string | null }> = {};

  if (itemIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('items')
      .select('id, name, image_url')
      .in('id', itemIds.slice(0, 500)); // cap to avoid query limits

    if (itemsData) {
      for (const item of itemsData) {
        itemMap[item.id] = { name: item.name, image_url: item.image_url };
      }
    }
  }

  // Build per-list analytics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalViews = 0;
  let totalShares = 0;
  const uniqueRankerSet = new Set<string>();

  const analyticsLists: CreatorListAnalytics[] = lists.map((list) => {
    // Shares for this list
    const listShares = shares.filter((s) => s.list_id === list.id);
    const listViewCount = listShares.reduce((sum, s) => sum + (s.view_count || 0), 0);
    totalViews += listViewCount;
    totalShares += listShares.length;

    // Activities for this list
    const listActivities = activities.filter((a) => a.list_id === list.id);
    const listRankerIds = new Set(
      listActivities.filter((a) => a.user_id).map((a) => a.user_id as string)
    );
    listRankerIds.forEach((id) => uniqueRankerSet.add(id));

    // List items for this list
    const thisListItems = listItems.filter((li) => li.list_id === list.id);

    // Views over time (last 30 days) from shared_rankings created_at
    const viewsByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      viewsByDay[d.toISOString().split('T')[0]] = 0;
    }
    for (const share of listShares) {
      const day = share.created_at.split('T')[0];
      if (viewsByDay[day] !== undefined) {
        viewsByDay[day] += share.view_count || 0;
      }
    }
    const views_over_time = Object.entries(viewsByDay).map(([date, views]) => ({ date, views }));

    // Top items by activity count
    const itemActivityCount: Record<string, { count: number; positions: number[] }> = {};
    for (const a of listActivities) {
      if (!itemActivityCount[a.item_id]) {
        itemActivityCount[a.item_id] = { count: 0, positions: [] };
      }
      itemActivityCount[a.item_id].count++;
      if (a.position_after != null) {
        itemActivityCount[a.item_id].positions.push(a.position_after);
      }
    }

    const top_items = Object.entries(itemActivityCount)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([item_id, data]) => ({
        item_id,
        name: itemMap[item_id]?.name || 'Unknown',
        image_url: itemMap[item_id]?.image_url || null,
        activity_count: data.count,
        avg_position:
          data.positions.length > 0
            ? Math.round(
                (data.positions.reduce((s, p) => s + p, 0) / data.positions.length) * 10
              ) / 10
            : null,
      }));

    // Consensus: position variance per item
    const itemPositions: Record<string, number[]> = {};
    for (const a of listActivities) {
      if (a.position_after != null) {
        if (!itemPositions[a.item_id]) itemPositions[a.item_id] = [];
        itemPositions[a.item_id].push(a.position_after);
      }
    }

    const variances: { item_id: string; variance: number }[] = [];
    let totalVariance = 0;
    let varianceCount = 0;

    for (const [itemId, positions] of Object.entries(itemPositions)) {
      if (positions.length < 2) continue;
      const mean = positions.reduce((s, p) => s + p, 0) / positions.length;
      const variance =
        positions.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / positions.length;
      variances.push({ item_id: itemId, variance });
      totalVariance += variance;
      varianceCount++;
    }

    // Agreement rate: 1 - normalized average variance (higher = more agreement)
    const maxVariance = list.size * list.size; // theoretical max
    const avgVariance = varianceCount > 0 ? totalVariance / varianceCount : 0;
    const agreement_rate =
      maxVariance > 0 ? Math.round((1 - Math.min(avgVariance / maxVariance, 1)) * 100) / 100 : 1;

    const most_controversial = variances
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5)
      .map((v) => ({
        item_id: v.item_id,
        name: itemMap[v.item_id]?.name || 'Unknown',
        image_url: itemMap[v.item_id]?.image_url || null,
        position_variance: Math.round(v.variance * 100) / 100,
      }));

    return {
      list_id: list.id,
      title: list.title,
      category: list.category,
      size: list.size,
      created_at: list.created_at,
      total_views: listViewCount,
      share_count: listShares.length,
      unique_rankers: listRankerIds.size,
      total_activities: listActivities.length,
      items_ranked: thisListItems.length,
      views_over_time,
      top_items,
      consensus: {
        agreement_rate,
        most_controversial,
      },
    };
  });

  const summary: CreatorAnalyticsSummary = {
    total_lists: lists.length,
    total_views: totalViews,
    total_shares: totalShares,
    total_rankers: uniqueRankerSet.size,
    lists: analyticsLists,
  };

  return successResponse(summary);
});
