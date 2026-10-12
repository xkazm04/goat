import { createClient } from '@supabase/supabase-js';

import { publicEnv } from '@/v2/db/env';
import { loadListBySlug, type LoadedList } from '@/v2/list/sync';

import { isSlug } from './slug';

/**
 * Public reads on the server (the share page, the embed, the social card and
 * oEmbed). It uses the anon key, so row-level security is what decides what a
 * stranger can see; there is no service-role key in this path.
 */
export async function loadPublished(slug: string): Promise<LoadedList | null> {
  if (!publicEnv || !isSlug(slug)) return null;
  const client = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema: 'goat_v2' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const loaded = await loadListBySlug(client, slug);
    return loaded && loaded.published ? loaded : null;
  } catch {
    return null;
  }
}

/** The site's own origin, for absolute links in metadata, embeds and oEmbed. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}
