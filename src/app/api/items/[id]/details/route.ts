import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ItemDetailResponse } from '@/types/item-details';
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
 * Fetch ranking statistics for an item
 * Note: This generates mock data. In production, aggregate from rankings table.
 */
async function fetchRankingStats(
  _supabase: TypedSupabaseClient,
  itemId: string
): Promise<ItemDetailResponse['rankingStats']> {
  // Generate deterministic mock data based on item ID
  const seed = hashCode(itemId);
  const totalRankings = ((seed * 13) % 500) + 20;
  const baseRank = (seed % 30) + 1;
  const volatility = ((seed * 7) % 60) / 10;

  // Generate distribution
  const distribution: Record<number, number> = {};
  const spreadPositions = Math.min(15, Math.ceil(volatility * 2) + 3);

  for (let i = 0; i < spreadPositions; i++) {
    const position = Math.max(1, Math.min(50, baseRank + i - Math.floor(spreadPositions / 2)));
    // Bell curve-like distribution centered on baseRank
    const distance = Math.abs(position - baseRank);
    const count = Math.max(1, Math.floor(totalRankings / spreadPositions * Math.exp(-distance * 0.3)));
    distribution[position] = count;
  }

  const confidence = Math.min(0.95, (totalRankings / 300) * (1 - volatility / 10));

  return {
    totalRankings,
    averagePosition: baseRank + (volatility / 5),
    medianPosition: baseRank,
    distribution,
    volatility,
    confidence,
    percentiles: {
      p25: Math.max(1, baseRank - Math.floor(volatility)),
      p50: baseRank,
      p75: Math.min(50, baseRank + Math.floor(volatility)),
    },
  };
}

/**
 * Fetch recent rankings featuring this item
 * Note: Returns mock data. In production, query from rankings/lists tables.
 */
async function fetchRecentRankings(
  _supabase: TypedSupabaseClient,
  itemId: string
): Promise<ItemDetailResponse['recentRankings']> {
  // Mock recent rankings for now
  const seed = hashCode(itemId);
  const count = (seed % 5) + 2;

  const mockRankings: ItemDetailResponse['recentRankings'] = [];
  const listTitles = [
    'Top 10 All Time Favorites',
    'Best of 2024',
    'Personal Rankings',
    'Community Picks',
    'Critics\' Choice',
  ];

  for (let i = 0; i < count; i++) {
    mockRankings.push({
      listId: `list-${seed + i}`,
      listTitle: listTitles[i % listTitles.length],
      position: ((seed + i) % 10) + 1,
      rankedAt: new Date(Date.now() - (i * 86400000 * (i + 1))).toISOString(),
    });
  }

  return mockRankings;
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
 * Simple hash function for deterministic random values
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
