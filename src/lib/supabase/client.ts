import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Create a type-safe Supabase browser client
 *
 * This client is configured with the Database generic for full type safety.
 * Use this in client components and hooks.
 *
 * @returns Type-safe Supabase client for browser usage
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
