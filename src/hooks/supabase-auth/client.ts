import { SupabaseClient } from '@supabase/supabase-js';
import { useCallback } from 'react';

import { createClient } from '@/lib/supabase/client';

/**
 * Hook to provide access to the shared Supabase browser client singleton.
 *
 * Uses the shared singleton from `src/lib/supabase/client.ts` to avoid
 * creating duplicate clients with separate auth listeners and sessions.
 * Token refresh is configured once, at client creation, and is not a
 * per-hook choice — which is why there is no option for it here.
 */
export function useSupabaseClient() {
  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    return createClient();
  }, []);

  return { getClient };
}
