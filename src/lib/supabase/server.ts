import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Rate-limiter: log cookie errors at most once per 10 seconds
let lastCookieWarnTime = 0
const COOKIE_WARN_INTERVAL_MS = 10_000

/**
 * Strip characters that have special meaning in PostgREST filter strings
 * (commas separate conditions, parentheses denote grouping).
 * Use this before interpolating user input into `.or()` filter strings.
 */
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()\\]/g, '')
}

/**
 * Escape SQL ILIKE/LIKE wildcard characters in user-supplied input.
 * Prevents `%` and `_` in user input from being interpreted as wildcards.
 * Use this before wrapping a value in `%...%` for `.ilike()` calls.
 *
 * @example
 * ```ts
 * .ilike('title', `%${escapeIlikeWildcards(userInput)}%`)
 * ```
 */
export function escapeIlikeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

/**
 * Create a type-safe Supabase server client
 *
 * This client is configured with the Database generic for full type safety.
 * Use this in API routes and server components.
 *
 * @returns Type-safe Supabase client with cookie handling
 */
export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions — but log it rate-limited for diagnostics.
          const now = Date.now()
          if (now - lastCookieWarnTime >= COOKIE_WARN_INTERVAL_MS) {
            lastCookieWarnTime = now
            console.warn('[supabase/server] cookie setAll failed', {
              cookieCount: cookiesToSet.length,
              cookieNames: cookiesToSet.map(c => c.name),
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      },
    },
  })
}

/**
 * Require an authenticated user for protected API routes.
 *
 * Returns the authenticated user's ID, or a 401 NextResponse if unauthenticated.
 * Usage:
 * ```ts
 * const auth = await requireAuth();
 * if (auth.error) return auth.error;
 * const userId = auth.userId;
 * ```
 */
export async function requireAuth(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  return { userId: user.id, error: null }
}
