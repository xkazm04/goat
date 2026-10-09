import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from './env';

type BrowserClient = ReturnType<typeof createBrowserClient>;

let client: BrowserClient | null = null;

/**
 * The one browser Supabase client for v2, bound to the goat_v2 schema.
 * Returns null when the public settings are missing (offline shell).
 */
export function getBrowserClient(): BrowserClient | null {
  if (!publicEnv) return null;
  client ??= createBrowserClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema: 'goat_v2' },
  });
  return client;
}
