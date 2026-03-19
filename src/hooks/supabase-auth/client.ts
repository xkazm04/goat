import { SupabaseClient } from '@supabase/supabase-js';
import { useCallback } from 'react';

import { createClient } from '@/lib/supabase/client';

/**
 * Hook to provide access to the shared Supabase browser client singleton.
 *
 * Uses the shared singleton from `src/lib/supabase/client.ts` to avoid
 * creating duplicate clients with separate auth listeners and sessions.
 *
 * The `autoRefresh` parameter is accepted for API compatibility but
 * has no effect -- the shared client is configured once at creation.
 */
export function useSupabaseClient(_autoRefresh?: boolean) {
  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    return createClient();
  }, []);

  return { getClient };
}
