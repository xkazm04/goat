import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ItemDetailResponse, ActivityTimelineData, ActivityEvent, TrajectoryPoint } from '@/types/item-details';
import type { TypedSupabaseClient } from '@/lib/supabase/types';
import type { ItemRow } from '@/types/database';


// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/items/:id/details - Get detailed item information
 *
 * Returns comprehensive item details including:
 * - Full metadata (year, tags, description, etc.)
 * - Related items (same category, similar tags)
 * - Community ranking distribution
 * - Recent rankings featuring this item
 * - External links (Wikipedia, IMDB, etc.)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Fetch the main item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching item:', itemError);
      return NextResponse.json(
        { error: itemError.message },
        { status: 500 }
      );
    }

    // Fetch related items from same category
    const relatedItems = await fetchRelatedItems(supabase, item);

    // Fetch ranking statistics (mock data for now, would aggregate from real rankings table)
    const rankingStats = await fetchRankingStats(supabase, id);

    // Fetch recent rankings
    const recentRankings = await fetchRecentRankings(supabase, id);

    // Generate external links based on item data
    const externalLinks = generateExternalLinks(item);

    // Fetch activity timeline
    const activityTimeline = await fetchActivityTimeline(supabase, id);

    const response: ItemDetailResponse = {
      item: {
        id: item.id,
        title: item.name || item.title || '',
        description: item.description ?? undefined,
        image_url: item.image_url ?? undefined,
        category: item.category ?? undefined,
        subcategory: item.subcategory ?? undefined,
        tags: item.tags || [],
        item_year: item.item_year ?? undefined,
        item_year_to: item.item_year_to ?? undefined,
        reference_url: item.reference_url ?? undefined,
        created_at: item.created_at ?? undefined,
        updated_at: item.updated_at ?? undefined,
        group_id: item.group_id ?? undefined,
        group_name: item.group ?? undefined,
        // DB engagement metrics
        view_count: item.view_count || 0,
        selection_count: item.selection_count || 0,
      },
      relatedItems,
      rankingStats,
      recentRankings,
      externalLinks,
      activityTimeline,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/items/:id/details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch related items based on category and tags
 */
async function fetchRelatedItems(
  supabase: TypedSupabaseClient,
  item: ItemRow
): Promise<ItemDetailResponse['relatedItems']> {
  const relatedItems: ItemDetailResponse['relatedItems'] = [];

  // Fetch items from same category (excluding current item)
  if (item.category) {
    const { data: categoryItems } = await supabase
      .from('items')
      .select('id, name, title, image_url')
      .eq('category', item.category)
      .neq('id', item.id)
      .limit(8);

    if (categoryItems) {
      categoryItems.forEach((related) => {
        relatedItems.push({
          id: related.id,
          title: related.name || related.title || '',
          image_url: related.image_url ?? undefined,
          similarity_reason: 'category',
        });
      });
    }
  }

  // If we have tags, try to find items with similar tags
  if (item.tags && item.tags.length > 0) {
    const { data: taggedItems } = await supabase
      .from('items')
      .select('id, name, title, image_url, tags')
      .neq('id', item.id)
      .contains('tags', [item.tags[0]]) // Match first tag
      .limit(4);

    if (taggedItems) {
      taggedItems.forEach((related) => {
        // Avoid duplicates
        if (!relatedItems.find(r => r.id === related.id)) {
          relatedItems.push({
            id: related.id,
            title: related.name || related.title || '',
            image_url: related.image_url ?? undefined,
            similarity_reason: 'tags',
          });
        }
      });
    }
  }

  return relatedItems.slice(0, 12); // Limit to 12 related items
}

/**
 * Fetch ranking statistics for an item.
 *
 * Priority order:
 * 1. item_consensus_cache (pre-computed, fast)
 * 2. Live aggregation from list_items (slower, always fresh)
 * 3. null (no ranking data available)
 */
async function fetchRankingStats(
  supabase: TypedSupabaseClient,
  itemId: string
): Promise<ItemDetailResponse['rankingStats']> {
  // 1. Try consensus cache first (table may not be in generated types yet)
  try {
    interface ConsensusCacheRow {
      total_rankings: number | null;
      average_position: number | null;
      median_position: number | null;
      distribution: Record<number, number> | null;
      volatility: number | null;
      confidence: number | null;
      percentiles: { p25?: number; p50?: number; p75?: number } | null;
    }

    const { data: cached } = await (supabase as any)
      .from('item_consensus_cache')
      .select('total_rankings, average_position, median_position, distribution, volatility, confidence, percentiles')
      .eq('item_id', itemId)
      .maybeSingle() as { data: ConsensusCacheRow | null };

    if (cached && cached.total_rankings && cached.total_rankings > 0) {
      const percentiles = cached.percentiles || {};
      return {
        totalRankings: cached.total_rankings,
        averagePosition: Number(cached.average_position) || 0,
        medianPosition: cached.median_position || 0,
        distribution: cached.distribution || {},
        volatility: Number(cached.volatility) || 0,
        confidence: Number(cached.confidence) || 0,
        percentiles: {
          p25: percentiles.p25 || 0,
          p50: percentiles.p50 || 0,
          p75: percentiles.p75 || 0,
        },
      };
    }
  } catch {
    // Table may not exist yet — fall through to live aggregation
  }

  // 2. Live aggregation from list_items
  try {
    const { data: rankings } = await supabase
      .from('list_items')
      .select('ranking')
      .eq('item_id', itemId);

    if (!rankings || rankings.length === 0) {
      // Return zeroed stats so the UI always shows the distribution panel
      return {
        totalRankings: 0,
        averagePosition: 0,
        medianPosition: 0,
        distribution: {},
        volatility: 0,
        confidence: 0,
        percentiles: { p25: 0, p50: 0, p75: 0 },
      };
    }

    const positions = rankings.map(r => r.ranking).sort((a, b) => a - b);
    const totalRankings = positions.length;

    // Build distribution
    const distribution: Record<number, number> = {};
    for (const pos of positions) {
      distribution[pos] = (distribution[pos] || 0) + 1;
    }

    // Compute stats
    const sum = positions.reduce((a, b) => a + b, 0);
    const averagePosition = sum / totalRankings;
    const medianPosition = positions[Math.floor(totalRankings / 2)];
    const p25 = positions[Math.floor(totalRankings * 0.25)];
    const p75 = positions[Math.floor(totalRankings * 0.75)];

    // Volatility: standard deviation
    const variance = positions.reduce((acc, pos) => acc + Math.pow(pos - averagePosition, 2), 0) / totalRankings;
    const volatility = Math.sqrt(variance);

    // Confidence: based on sample size and volatility
    const confidence = Math.min(0.95, (totalRankings / 200) * (1 - Math.min(volatility, 9) / 10));

    return {
      totalRankings,
      averagePosition,
      medianPosition,
      distribution,
      volatility,
      confidence: Math.max(0, confidence),
      percentiles: {
        p25: p25 || medianPosition,
        p50: medianPosition,
        p75: p75 || medianPosition,
      },
    };
  } catch {
    return {
      totalRankings: 0,
      averagePosition: 0,
      medianPosition: 0,
      distribution: {},
      volatility: 0,
      confidence: 0,
      percentiles: { p25: 0, p50: 0, p75: 0 },
    };
  }
}

/**
 * Fetch recent rankings featuring this item from list_items + lists tables
 */
async function fetchRecentRankings(
  supabase: TypedSupabaseClient,
  itemId: string
): Promise<ItemDetailResponse['recentRankings']> {
  try {
    const { data: listItems } = await supabase
      .from('list_items')
      .select('list_id, ranking, created_at')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!listItems || listItems.length === 0) return [];

    // Fetch list titles
    const listIds = listItems.map(li => li.list_id);
    const { data: lists } = await supabase
      .from('lists')
      .select('id, title')
      .in('id', listIds);

    const listMap = new Map((lists || []).map(l => [l.id, l.title]));

    return listItems.map(li => ({
      listId: li.list_id,
      listTitle: listMap.get(li.list_id) || 'Untitled List',
      position: li.ranking,
      rankedAt: li.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Generate external links based on item data
 */
function generateExternalLinks(item: ItemRow): ItemDetailResponse['externalLinks'] {
  const links: ItemDetailResponse['externalLinks'] = [];
  const title = item.name || item.title || '';

  // Wikipedia link (always add for most items)
  if (title) {
    links.push({
      type: 'wikipedia',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      label: 'Wikipedia',
    });
  }

  // Add reference URL if exists
  if (item.reference_url) {
    // Detect the type based on URL
    let type: 'imdb' | 'spotify' | 'youtube' | 'custom' = 'custom';
    if (item.reference_url.includes('imdb.com')) type = 'imdb';
    else if (item.reference_url.includes('spotify.com')) type = 'spotify';
    else if (item.reference_url.includes('youtube.com')) type = 'youtube';

    links.push({
      type,
      url: item.reference_url,
      label: type === 'custom' ? 'Official Link' : type.toUpperCase(),
    });
  }

  // Category-specific links
  const category = (item.category || '').toLowerCase();

  if (title && (category.includes('movie') || category.includes('film'))) {
    links.push({
      type: 'imdb',
      url: `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`,
      label: 'IMDB',
    });
  }

  if (title && (category.includes('music') || category.includes('album') || category.includes('song'))) {
    links.push({
      type: 'spotify',
      url: `https://open.spotify.com/search/${encodeURIComponent(title)}`,
      label: 'Spotify',
    });
  }

  return links;
}

/**
 * Fetch activity timeline for an item
 */
async function fetchActivityTimeline(
  supabase: TypedSupabaseClient,
  itemId: string
): Promise<ActivityTimelineData | undefined> {
  try {
    const { data: events, count } = await supabase
      .from('ranking_activities')
      .select('id, action, position_before, position_after, list_title, list_id, metadata, created_at', { count: 'exact' })
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!events || events.length === 0) return undefined;

    const activityEvents: ActivityEvent[] = events.map(e => ({
      id: e.id,
      action: e.action as ActivityEvent['action'],
      position_before: e.position_before,
      position_after: e.position_after,
      list_title: e.list_title,
      list_id: e.list_id,
      metadata: e.metadata as Record<string, unknown> | null,
      created_at: e.created_at,
    }));

    const positionEvents = events
      .filter(e => e.position_after != null && e.action !== 'remove')
      .reverse();

    const trajectory: TrajectoryPoint[] = positionEvents.map(e => ({
      date: e.created_at,
      position: e.position_after!,
    }));

    return {
      events: activityEvents,
      trajectory,
      totalEvents: count || 0,
    };
  } catch {
    // Non-critical — table may not exist yet
    return undefined;
  }
}

