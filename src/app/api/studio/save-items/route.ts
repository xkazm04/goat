/**
 * POST /api/studio/save-items
 *
 * Saves new items to Supabase items table for future reuse.
 * Called when publishing a list to persist generated items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  reference_url: z.string().url().optional(),
});

const requestSchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = requestSchema.parse(body);

    const supabase = await createClient();
    const savedCount = { success: 0, skipped: 0, errors: 0 };

    // Insert items one by one to handle duplicates gracefully
    for (const item of items) {
      try {
        // Check if item already exists (by name + category)
        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('name', item.name)
          .eq('category', item.category)
          .limit(1)
          .single();

        if (existing) {
          // Item already exists, skip
          savedCount.skipped++;
          continue;
        }

        // Insert new item
        const { error } = await supabase.from('items').insert({
          name: item.name,
          category: item.category,
          description: item.description,
          image_url: item.image_url,
          reference_url: item.reference_url,
        });

        if (error) {
          // Handle unique constraint violation gracefully
          if (error.code === '23505') {
            savedCount.skipped++;
          } else {
            console.warn('[Save Items] Insert error:', error.message);
            savedCount.errors++;
          }
        } else {
          savedCount.success++;
        }
      } catch (err) {
        console.warn('[Save Items] Error processing item:', item.name, err);
        savedCount.errors++;
      }
    }

    console.log(`[Save Items] Results: ${savedCount.success} saved, ${savedCount.skipped} skipped, ${savedCount.errors} errors`);

    return NextResponse.json({
      saved: savedCount.success,
      skipped: savedCount.skipped,
      errors: savedCount.errors,
      total: items.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Save Items] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to save items' },
      { status: 500 }
    );
  }
}
