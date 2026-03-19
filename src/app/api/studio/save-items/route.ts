/**
 * POST /api/studio/save-items
 *
 * Saves new items to Supabase items table for future reuse.
 * Called when publishing a list to persist generated items.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleStudioError, StudioErrorCodes } from '@/lib/api/studio-utils';
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

    // Batch upsert all items in a single query
    // onConflict skips duplicates (name + category unique constraint)
    const rows = items.map((item) => ({
      name: item.name,
      category: item.category,
      description: item.description,
      image_url: item.image_url,
      reference_url: item.reference_url,
    }));

    const { data, error: upsertError } = await supabase
      .from('items')
      .upsert(rows, {
        onConflict: 'name,category',
        ignoreDuplicates: true,
      })
      .select('id');

    const savedCount = {
      success: data?.length ?? 0,
      skipped: items.length - (data?.length ?? 0),
      errors: upsertError ? 1 : 0,
    };

    if (upsertError) {
      console.warn('[Save Items] Batch upsert error:', upsertError.message);
      // Still return partial success if some items were saved
    }

    console.log(`[Save Items] Results: ${savedCount.success} saved, ${savedCount.skipped} skipped, ${savedCount.errors} errors`);

    return NextResponse.json({
      saved: savedCount.success,
      skipped: savedCount.skipped,
      errors: savedCount.errors,
      total: items.length,
    });
  } catch (error) {
    return handleStudioError(error, '[Save Items] Unexpected error', StudioErrorCodes.DATABASE_ERROR);
  }
}
