/**
 * POST /api/studio/match-items
 *
 * Matches generated item titles against existing database items.
 * Returns existing item data (id, image_url) for matches.
 * This allows reusing existing items instead of creating duplicates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { StudioApiError } from '@/types/studio';

export const dynamic = 'force-dynamic';

const matchItemsRequestSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
  })),
  category: z.string(),
});

interface MatchedItem {
  title: string;
  matched: boolean;
  db_item?: {
    id: string;
    name: string;
    image_url: string | null;
    description: string | null;
    category: string;
  };
}

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, category } = matchItemsRequestSchema.parse(body);

    const supabase = getSupabaseClient();

    // Normalize titles for matching (lowercase, trim)
    const normalizedTitles = items.map(item => item.title.toLowerCase().trim());

    // Query existing items by name and category
    // Using ilike for case-insensitive matching
    const { data: existingItems, error } = await supabase
      .from('items')
      .select('id, name, image_url, description, category')
      .eq('category', category)
      .in('name', items.map(i => i.title)); // Exact match first

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error('Database query failed');
    }

    // Create a map of lowercase names to DB items for quick lookup
    const dbItemMap = new Map<string, typeof existingItems[0]>();
    if (existingItems) {
      for (const dbItem of existingItems) {
        dbItemMap.set(dbItem.name.toLowerCase().trim(), dbItem);
      }
    }

    // If exact match didn't find all, try fuzzy matching with ILIKE
    const unmatchedTitles = normalizedTitles.filter(t => !dbItemMap.has(t));

    if (unmatchedTitles.length > 0) {
      // Try to find items that might have slightly different names
      for (const title of unmatchedTitles) {
        const { data: fuzzyMatches } = await supabase
          .from('items')
          .select('id, name, image_url, description, category')
          .eq('category', category)
          .ilike('name', `%${title}%`)
          .limit(1);

        if (fuzzyMatches && fuzzyMatches.length > 0) {
          // Check if it's a close enough match (title contains or is contained)
          const match = fuzzyMatches[0];
          const matchName = match.name.toLowerCase().trim();
          if (matchName.includes(title) || title.includes(matchName)) {
            dbItemMap.set(title, match);
          }
        }
      }
    }

    // Build response with match status for each item
    const matchedItems: MatchedItem[] = items.map(item => {
      const normalizedTitle = item.title.toLowerCase().trim();
      const dbItem = dbItemMap.get(normalizedTitle);

      if (dbItem) {
        return {
          title: item.title,
          matched: true,
          db_item: {
            id: dbItem.id,
            name: dbItem.name,
            image_url: dbItem.image_url,
            description: dbItem.description,
            category: dbItem.category,
          },
        };
      }

      return {
        title: item.title,
        matched: false,
      };
    });

    const matchCount = matchedItems.filter(m => m.matched).length;

    return NextResponse.json({
      items: matchedItems,
      total: items.length,
      matched: matchCount,
      unmatched: items.length - matchCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse: StudioApiError = {
        error: 'Invalid request',
        details: error.errors,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('Match items error:', error);
    const errorResponse: StudioApiError = {
      error: error instanceof Error ? error.message : 'Matching failed',
      code: 'MATCH_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
