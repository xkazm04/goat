import { useRef, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hook to manage Supabase client initialization
 */
export function useSupabaseClient(autoRefresh: boolean) {
  const clientRef = useRef<SupabaseClient | null>(null);

  const getClient = useCallback(async (): Promise<SupabaseClient> => {
    if (clientRef.current) {
      return clientRef.current;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing. Please check your environment variables.');
    }

    clientRef.current = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: autoRefresh,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    return clientRef.current;
  }, [autoRefresh]);

  return { getClient, clientRef };
}
