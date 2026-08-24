import { NextRequest } from 'next/server';

import { withErrorHandler, successResponse } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lists/thumbnails?ids=a,b,c
 * Returns the first image_url for each requested list in a single query.
 * Collapses N+1 individual list fetches into one batch request.
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const idsParam = request.nextUrl.searchParams.get('ids');

  if (!idsParam) {
    return successResponse({});
  }

  const ids = idsParam.split(',').filter(Boolean).slice(0, 200);

  if (ids.length === 0) {
    return successResponse({});
  }

  const supabase = await createClient();

  // Query list_items joined with items to get image URLs per list
  const { data, error } = await supabase
    .from('list_items')
    .select('list_id, items!inner(image_url)')
    .in('list_id', ids)
    .order('ranking', { ascending: true });

  if (error) {
    console.error('Thumbnails query error:', error);
    return successResponse({});
  }

  // Build map: first image per list_id
  const thumbnails: Record<string, string> = {};
  if (data) {
    for (const row of data as Array<{ list_id: string; items: { image_url: string | null } }>) {
      const imageUrl = row.items?.image_url;
      if (!thumbnails[row.list_id] && imageUrl) {
        thumbnails[row.list_id] = imageUrl;
      }
    }
  }

  return successResponse(thumbnails);
});
