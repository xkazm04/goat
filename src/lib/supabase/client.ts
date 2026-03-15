import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Module-level singleton for the browser Supabase client.
// Unlike the server client (which needs fresh cookies per request),
// the browser client can safely be reused across the app lifetime.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Get the singleton type-safe Supabase browser client
 *
 * This client is configured with the Database generic for full type safety.
 * Uses a module-level singleton to avoid re-initializing auth listeners,
 * WebSocket connections, and internal state on every call.
 *
 * @returns Type-safe Supabase client for browser usage
 */
export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return browserClient
}
