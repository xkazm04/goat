import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/items/stats - Get statistics for items including average ranking
 * Query params:
 *   - item_ids: comma-separated list of item IDs
 *   - category: filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const itemIdsParam = searchParams.get('item_ids');
    const category = searchParams.get('category');

    // Build query
    let query = supabase.from('items').select('id, name, selection_count, view_count, image_url');

    // Apply filters
    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(',').filter(Boolean);
      if (itemIds.length > 0) {
        query = query.in('id', itemIds);
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching item stats:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate average ranking based on selection_count
    // Higher selection_count = better (lower) ranking
    const items = data || [];

    // Sort by selection_count descending to get rankings
    const sortedItems = [...items].sort((a, b) =>
      (b.selection_count || 0) - (a.selection_count || 0)
    );

    // Create ranking map
    const stats = sortedItems.map((item, index) => ({
      item_id: item.id,
      name: item.name,
      image_url: item.image_url,
      selection_count: item.selection_count || 0,
      view_count: item.view_count || 0,
      average_ranking: index + 1, // Ranking position (1-based)
      percentile: items.length > 0 ? Math.round((1 - index / items.length) * 100) : 0,
    }));

    return NextResponse.json({
      stats,
      total_items: items.length,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/items/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/items/stats - Update item image URL
 * Body:
 *   - item_id: string (required) - The item ID to update
 *   - image_url: string (required) - The new image URL
 * 
 * Or for batch updates:
 *   - updates: Array<{ item_id: string, image_url: string }>
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Support both single update and batch updates
    if (body.updates && Array.isArray(body.updates)) {
      // Batch update
      const results: { success: string[]; failed: string[] } = {
        success: [],
        failed: []
      };

      for (const update of body.updates) {
        const { item_id, image_url } = update;
        
        if (!item_id || image_url === undefined) {
          results.failed.push(item_id || 'unknown');
          continue;
        }

        const { error } = await supabase
          .from('items')
          .update({ image_url, updated_at: new Date().toISOString() })
          .eq('id', item_id);

        if (error) {
          console.error(`Error updating item ${item_id}:`, error);
          results.failed.push(item_id);
        } else {
          results.success.push(item_id);
        }
      }

      return NextResponse.json({
        message: `Updated ${results.success.length} items, ${results.failed.length} failed`,
        results
      });
    } else {
      // Single update
      const { item_id, image_url } = body;

      if (!item_id) {
        return NextResponse.json(
          { error: 'item_id is required' },
          { status: 400 }
        );
      }

      if (image_url === undefined) {
        return NextResponse.json(
          { error: 'image_url is required' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('items')
        .update({ image_url, updated_at: new Date().toISOString() })
        .eq('id', item_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating item image:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Item image updated successfully',
        item: data
      });
    }
  } catch (error) {
    console.error('Unexpected error in PATCH /api/items/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/items/stats/sync-images - Sync local game images with database
 * This endpoint scans local image files and matches them with games in the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Check if this is a sync request
    if (body.action === 'sync-local-images') {
      const category = body.category || 'games';
      const imageFolder = body.imageFolder || '/games';
      const imageMap = body.imageMap as Record<string, string> | undefined;

      if (!imageMap || Object.keys(imageMap).length === 0) {
        return NextResponse.json(
          { error: 'imageMap is required - mapping of item names to image filenames' },
          { status: 400 }
        );
      }

      // Fetch all items in the category
      const { data: items, error: fetchError } = await supabase
        .from('items')
        .select('id, name, image_url')
        .eq('category', category);

      if (fetchError) {
        console.error('Error fetching items:', fetchError);
        return NextResponse.json(
          { error: fetchError.message },
          { status: 500 }
        );
      }

      const results: { 
        matched: { name: string; image_url: string }[]; 
        notFound: string[];
        skipped: string[];
      } = {
        matched: [],
        notFound: [],
        skipped: []
      };

      // Match items with image map
      for (const item of items || []) {
        const normalizedName = item.name.toLowerCase().trim();
        
        // Try to find a matching image
        let matchedImage: string | null = null;
        
        for (const [imageName, imageFile] of Object.entries(imageMap)) {
          if (normalizedName === imageName.toLowerCase().trim()) {
            matchedImage = `${imageFolder}/${imageFile}`;
            break;
          }
        }

        if (matchedImage) {
          // Update the item with the new image URL
          const { error: updateError } = await supabase
            .from('items')
            .update({ image_url: matchedImage, updated_at: new Date().toISOString() })
            .eq('id', item.id);

          if (updateError) {
            console.error(`Error updating ${item.name}:`, updateError);
            results.notFound.push(item.name);
          } else {
            results.matched.push({ name: item.name, image_url: matchedImage });
          }
        } else if (item.image_url) {
          results.skipped.push(item.name);
        } else {
          results.notFound.push(item.name);
        }
      }

      return NextResponse.json({
        message: `Synced ${results.matched.length} items, ${results.notFound.length} not found, ${results.skipped.length} skipped (already have images)`,
        results
      });
    }

    return NextResponse.json(
      { error: 'Unknown action. Use action: "sync-local-images"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/items/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
