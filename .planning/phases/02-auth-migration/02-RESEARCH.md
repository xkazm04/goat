# Phase 2: Auth Migration - Research

**Researched:** 2026-03-14
**Domain:** Authentication (Clerk to Supabase Auth migration, Google OAuth, guest identity)
**Confidence:** HIGH

## Summary

This phase replaces Clerk authentication with Supabase Auth across the entire codebase. The project already has substantial Supabase Auth infrastructure in place -- `src/hooks/supabase-auth/` provides a full hook with OAuth, session management, and state tracking. The browser and server Supabase clients (`@supabase/ssr` 0.7.0, `@supabase/supabase-js` 2.76.1) are already configured and working. Guest identity via `useTempUser()` already generates UUIDs stored in localStorage.

The migration touches three layers: (1) the middleware and provider layer (ClerkProvider in layout.tsx, clerkMiddleware in middleware.ts), (2) the API route layer (10 files import `@clerk/nextjs/server`, all in challenges/ and share/analytics), and (3) the client hook layer (useClerkUser consumed in 2 files). The database has two tables with Clerk references: `users.clerk_id` and `user_profiles.clerk_id`. A `user_id_mapping` table is needed for the Clerk-to-Supabase ID migration.

**Primary recommendation:** Build useAuthUser() hook wrapping existing useSupabaseAuth() + useTempUser(), swap ClerkProvider for a lightweight Supabase auth listener, replace middleware.ts with Supabase session refresh, create OAuth callback route, then sweep all Clerk imports.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Google OAuth only -- no email/password (overrides AUTH-02, simplifies to single provider)
- Anonymous UUID stored in localStorage tracks guest identity
- On sign-up, all rows tagged with the guest UUID are silently auto-merged to the new Supabase user_id -- no prompt, no friction
- Guests have full access -- no limits, no sign-up gates
- Auth UI is a modal overlay -- user stays in context, can dismiss and continue as guest
- Sign-up prompt triggered after first completed ranking (dismissible nudge, not blocking)
- Combined single form: enter email or click Google (but Google-only means just the Google button)
- After successful sign-up: modal closes, "Welcome! Your rankings are saved." toast notification, user stays on same page
- Big bang removal -- abstract auth behind useAuthUser() hook first, then swap ClerkProvider for Supabase Auth in one go
- useAuthUser() hook is Supabase-aware -- exposes Supabase session, tokens, and auth methods directly (no provider abstraction layer)
- Delete Clerk webhook route entirely
- Create user_id_mapping table to map old Clerk IDs to new Supabase IDs, with a migration script for existing data
- Complete removal of @clerk/nextjs, svix, and all Clerk-related imports across the codebase
- Custom-styled Google button matching app design language (Google icon + "Continue with Google" text)
- Simple sign-out via user avatar dropdown in header -- signs out and returns to landing as guest, rankings stay in localStorage

### Claude's Discretion
- Exact middleware implementation for Supabase Auth session handling
- user_id_mapping table schema and migration script approach
- Toast notification implementation (use existing Radix toast or new approach)
- Auth modal component structure and animations
- How to handle edge cases (e.g., Google account already linked to different guest UUID)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can start ranking without creating an account (guest mode) | useTempUser() already generates guest UUIDs; useAuthUser() will unify guest/auth identity. Middleware must NOT protect /match routes. |
| AUTH-02 | User can sign up with email/password via Supabase Auth | OVERRIDDEN by user decision: Google OAuth only. Requirement satisfied by Google OAuth. |
| AUTH-03 | User can sign up with Google OAuth via Supabase Auth | Existing useSupabaseAuth().signInWithOAuth('google') already implemented. Need callback route at /auth/callback, Google Cloud Console config, Supabase dashboard provider config. |
| AUTH-04 | User session persists across browser refresh | @supabase/ssr handles cookie-based session persistence. Middleware refreshes tokens on each request. Existing client has persistSession: true. |
| AUTH-05 | Guest rankings sync to user account after sign-up | useTempUser().upgradeToRegisteredUser() exists. Need DB migration script to UPDATE rows WHERE user_id = guest_uuid SET user_id = supabase_user_id. onAuthStateChange callback triggers merge. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.76.1 | Auth client, session management, OAuth | Already installed, provides signInWithOAuth, onAuthStateChange |
| @supabase/ssr | ^0.7.0 | Server-side auth with cookie handling | Already installed, handles Next.js App Router cookie-based sessions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^13.0.0 | Guest UUID generation | Already used by useTempUser() |
| zustand | ^5.0.5 | Auth state if needed beyond React state | Already the project state pattern |
| framer-motion | ^12.23.24 | Auth modal animations | Already installed, project animation standard |
| lucide-react | ^0.554.0 | Icons (Google icon may need custom SVG) | Already installed |

### Packages to Remove
| Package | Reason |
|---------|--------|
| @clerk/nextjs (^7.0.4) | Replaced by Supabase Auth |
| svix (^1.80.0) | Only used by Clerk webhook verification |

**Installation:**
```bash
npm uninstall @clerk/nextjs svix
```

No new packages needed -- all Supabase Auth infrastructure is already installed.

## Architecture Patterns

### Recommended Changes Structure
```
src/
  hooks/
    use-auth-user.ts          # NEW: unified auth hook (Supabase + guest)
    use-clerk-user.ts          # DELETE
    use-temp-user.ts           # KEEP (consumed by use-auth-user)
    supabase-auth/             # KEEP (foundation for use-auth-user)
  app/
    layout.tsx                 # MODIFY: remove ClerkProvider, add Supabase auth listener
    auth/
      callback/
        route.ts               # NEW: OAuth callback handler (code exchange)
    api/
      webhooks/clerk/route.ts  # DELETE
      challenges/*.ts          # MODIFY: replace auth() with Supabase getUser()
      share/analytics/route.ts # MODIFY: replace auth() with Supabase getUser()
  middleware.ts                # REWRITE: Supabase session refresh instead of Clerk
  components/
    auth/
      AuthModal.tsx            # NEW: Google OAuth modal overlay
      AuthPrompt.tsx           # NEW: post-completion nudge
      UserMenu.tsx             # NEW: avatar dropdown with sign-out
  types/
    database.ts                # MODIFY: add user_id_mapping table type
```

### Pattern 1: useAuthUser() Hook
**What:** Single hook that provides current user identity (guest or authenticated), sign-in/out actions, and auth state.
**When to use:** Every component that needs to know who the user is.
**Example:**
```typescript
// Source: Project pattern combining existing hooks
export function useAuthUser() {
  const { user, session, isLoading, signInWithOAuth, signOut } = useSupabaseAuth();
  const { tempUserId, isLoaded: guestLoaded, isTempUser, upgradeToRegisteredUser } = useTempUser();

  // Effective user ID: Supabase user if authenticated, guest UUID otherwise
  const userId = user?.id ?? tempUserId;
  const isAuthenticated = !!user && !!session;
  const isGuest = !isAuthenticated && !!tempUserId;

  const signInWithGoogle = useCallback(async () => {
    await signInWithOAuth('google');
  }, [signInWithOAuth]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    // Rankings stay in localStorage -- user becomes guest again
  }, [signOut]);

  return {
    userId,           // always available (guest UUID or Supabase ID)
    user,             // Supabase User | null
    session,          // Supabase Session | null
    isAuthenticated,
    isGuest,
    isLoading: isLoading || !guestLoaded,
    signInWithGoogle,
    signOut: handleSignOut,
  };
}
```

### Pattern 2: Supabase Middleware for Session Refresh
**What:** Middleware that refreshes Supabase auth tokens on every request via cookie exchange.
**When to use:** Replaces Clerk middleware. Does NOT protect routes (guests have full access).
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: use getUser() not getSession() for security
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### Pattern 3: OAuth Callback Route
**What:** Server-side route that exchanges the OAuth authorization code for a session.
**When to use:** After Google redirects back to the app post-authentication.
**Example:**
```typescript
// src/app/auth/callback/route.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error -- redirect to home with error indication
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
```

### Pattern 4: Guest-to-User Merge on Auth State Change
**What:** When a user signs in, merge all their guest data to their new Supabase user ID.
**When to use:** Inside onAuthStateChange callback when event is 'SIGNED_IN'.
**Example:**
```typescript
// Inside useAuthUser or a dedicated merge hook
onAuthStateChange: async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const guestId = localStorage.getItem('temp_user_id');
    if (guestId && guestId !== session.user.id) {
      // Call merge API endpoint
      await fetch('/api/auth/merge-guest', {
        method: 'POST',
        body: JSON.stringify({ guest_id: guestId, user_id: session.user.id }),
      });
      // Update localStorage
      upgradeToRegisteredUser(session.user.id);
    }
  }
}
```

### Pattern 5: Server-Side Auth in API Routes
**What:** Replace Clerk's `auth()` with Supabase `getUser()` in API routes.
**When to use:** All API routes that need authenticated user identity.
**Example:**
```typescript
// Before (Clerk):
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();

// After (Supabase):
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id ?? null;
```

### Anti-Patterns to Avoid
- **Using getSession() for auth checks in server code:** getSession() reads from cookies without validation. Always use getUser() which validates the JWT with the Supabase Auth server.
- **Protecting /match routes:** Guests must have full access. The middleware should only refresh sessions, never redirect unauthenticated users.
- **Creating a generic auth abstraction layer:** User decision explicitly says useAuthUser() is Supabase-aware. Do not create a provider-agnostic interface.
- **Keeping Clerk environment variables:** Remove NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, WEBHOOK_SECRET from .env files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session token refresh | Custom token refresh logic | @supabase/ssr middleware cookie handling | Handles JWT refresh, cookie rotation, race conditions |
| OAuth flow | Custom OAuth state machine | supabase.auth.signInWithOAuth + callback route | PKCE flow, CSRF protection, state validation built-in |
| Guest UUID generation | Custom ID scheme | uuid v4 (already in useTempUser) | Cryptographically random, no collisions |
| Toast notifications | Custom notification system | Existing use-toast.ts hook | Already implemented, matches project patterns |

## Common Pitfalls

### Pitfall 1: getSession() vs getUser() in Server Code
**What goes wrong:** Using `supabase.auth.getSession()` in middleware or API routes to verify auth. Session data comes from cookies and can be tampered with.
**Why it happens:** getSession() is simpler to call and returns user data, so it looks sufficient.
**How to avoid:** Always use `supabase.auth.getUser()` in server-side code. It makes a network call to Supabase Auth to validate the token.
**Warning signs:** API routes reading session without getUser() call.

### Pitfall 2: OAuth Redirect URL Mismatch
**What goes wrong:** Google OAuth fails with "redirect_uri_mismatch" error after clicking "Continue with Google".
**Why it happens:** The redirect URL in Google Cloud Console doesn't match what Supabase sends, or Supabase's Site URL / redirect allow list is wrong.
**How to avoid:** Configure three places in sync: (1) Google Cloud Console authorized redirect URIs must include the Supabase callback URL from the Supabase dashboard, (2) Supabase Auth dashboard Site URL must match the app's production URL, (3) Supabase redirect allow list must include your app's /auth/callback path.
**Warning signs:** OAuth works in development but fails in production, or vice versa.

### Pitfall 3: Cookie Not Set After OAuth Redirect
**What goes wrong:** User completes Google sign-in but arrives back at the app unauthenticated.
**Why it happens:** The /auth/callback route doesn't properly exchange the code for a session, or the Supabase server client isn't configured with cookie handling.
**How to avoid:** The callback route MUST use the server-side createClient (with cookie handling) to call exchangeCodeForSession. The middleware must also be in place to pass cookies through.
**Warning signs:** Code parameter present in URL but user not logged in.

### Pitfall 4: Guest Data Merge Race Condition
**What goes wrong:** User signs in, but the guest-to-user merge hasn't completed before they navigate away. Some rankings still tagged with guest UUID.
**Why it happens:** The merge is async and the UI continues before it finishes.
**How to avoid:** The merge API call should be awaited before updating localStorage. Show a brief loading state during merge. The onAuthStateChange handler should block UI updates until merge completes.
**Warning signs:** Some rankings appear as guest after sign-up.

### Pitfall 5: Middleware Running on Static Assets
**What goes wrong:** Every image, CSS file, and JS bundle triggers Supabase auth token refresh, causing unnecessary latency.
**Why it happens:** Middleware matcher is too broad (current Clerk matcher catches everything).
**How to avoid:** Use a restrictive matcher that excludes static assets, _next, and public files.
**Warning signs:** Slow page loads, excessive Supabase auth API calls.

### Pitfall 6: Duplicate Supabase Clients
**What goes wrong:** The supabase-auth/client.ts hook creates its own client via `createClient` from `@supabase/supabase-js` while `src/lib/supabase/client.ts` creates a different singleton via `createBrowserClient` from `@supabase/ssr`.
**Why it happens:** Two separate client initialization paths exist in the codebase.
**How to avoid:** useAuthUser() should use the singleton browser client from `src/lib/supabase/client.ts`, not create a separate one. The existing supabase-auth/client.ts hook needs to be refactored to use the shared client.
**Warning signs:** Auth state out of sync with data queries, session appearing in one client but not another.

## Code Examples

### Existing Code to Leverage

**useTempUser() -- already handles guest identity:**
```typescript
// src/hooks/use-temp-user.ts -- KEEP AS-IS
// Already generates UUID, stores in localStorage, has upgradeToRegisteredUser()
```

**Supabase browser client singleton -- already configured:**
```typescript
// src/lib/supabase/client.ts -- KEEP AS-IS
// createBrowserClient<Database> with singleton pattern
```

**Supabase server client with cookies -- already configured:**
```typescript
// src/lib/supabase/server.ts -- KEEP AS-IS
// createServerClient<Database> with cookie handling
```

**useSupabaseAuth() -- existing foundation:**
```typescript
// src/hooks/supabase-auth/ -- REFACTOR
// Has signInWithOAuth, onAuthStateChange, session management
// Needs: use shared browser client instead of creating its own
```

### API Route Auth Replacement Pattern

Files that need `auth()` replaced (10 total, all use same pattern):
```typescript
// BEFORE (all challenge routes + share/analytics):
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// AFTER:
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const userId = user.id;
```

### Database Migration: user_id_mapping Table

```sql
-- Recommended schema for Clerk-to-Supabase ID mapping
CREATE TABLE user_id_mapping (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id text NOT NULL UNIQUE,
  supabase_id uuid NOT NULL,
  migrated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_supabase_user FOREIGN KEY (supabase_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Migration script: update all tables with clerk_id references
-- Run after user_id_mapping is populated
UPDATE users SET id = m.supabase_id
  FROM user_id_mapping m WHERE users.clerk_id = m.clerk_id;

UPDATE lists SET user_id = m.supabase_id
  FROM user_id_mapping m WHERE lists.user_id = m.clerk_id;

-- Eventually drop clerk_id columns and user_profiles table
```

### Guest Merge API Endpoint

```typescript
// src/app/api/auth/merge-guest/route.ts
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, assertRequired } from '@/lib/errors';

export const POST = withErrorHandler(async (request) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { guest_id } = await request.json();
  assertRequired(guest_id, 'guest_id');

  // Update all tables where user_id = guest_id
  const tables = ['lists', 'list_items']; // add others as needed
  for (const table of tables) {
    await supabase.from(table).update({ user_id: user.id }).eq('user_id', guest_id);
  }

  return Response.json({ merged: true });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | auth-helpers is deprecated; project already uses @supabase/ssr |
| getSession() for server auth | getUser() for server auth | 2024 | Security fix -- getSession reads unvalidated cookies |
| ClerkProvider wrapping entire app | Supabase onAuthStateChange listener | This migration | Removes Clerk dependency entirely |
| Separate Clerk webhook for user sync | Supabase Auth handles user records | This migration | No webhook needed -- Supabase Auth manages auth.users table |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.57.0 (E2E) |
| Config file | playwright.config.ts (assumed) |
| Quick run command | `npx playwright test --grep "auth" --project=chromium` |
| Full suite command | `npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Guest can complete ranking without account | E2E | `npx playwright test tests/auth-guest.spec.ts -x` | No -- Wave 0 |
| AUTH-02 | Google OAuth sign-in works (overridden to Google-only) | E2E (manual-only for real OAuth) | Manual: verify in browser | N/A -- manual |
| AUTH-03 | Google OAuth sign-in works | E2E (manual-only for real OAuth) | Manual: verify in browser | N/A -- manual |
| AUTH-04 | Session persists across refresh | E2E | `npx playwright test tests/auth-session.spec.ts -x` | No -- Wave 0 |
| AUTH-05 | Guest data merges on sign-up | Integration | `npx playwright test tests/auth-merge.spec.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test --grep "auth" --project=chromium`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `tests/auth-guest.spec.ts` -- covers AUTH-01 (guest can rank without account)
- [ ] `tests/auth-session.spec.ts` -- covers AUTH-04 (session persistence after refresh)
- [ ] `tests/auth-merge.spec.ts` -- covers AUTH-05 (guest-to-user data merge, can use mocked auth)
- [ ] OAuth testing (AUTH-02/03) is manual-only -- real Google OAuth cannot be automated in CI without service account credentials

## Open Questions

1. **Database tables with user_id columns beyond lists and users**
   - What we know: `lists.user_id` and `users.clerk_id` are confirmed. `user_profiles` has `clerk_id`.
   - What's unclear: Are there other tables (collections, shares, etc.) with user_id columns that reference Clerk IDs?
   - Recommendation: Run `SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%user_id%' OR column_name LIKE '%clerk%'` against the Supabase DB before writing the migration script.

2. **Existing users in production**
   - What we know: user_id_mapping table is planned for Clerk-to-Supabase migration.
   - What's unclear: How many existing users have Clerk IDs? Will they need to re-authenticate with Google?
   - Recommendation: Yes, existing Clerk users will need to sign in again with Google. The mapping table lets us link their old data. First sign-in creates a new Supabase Auth user; if their email matches a Clerk user, the migration script links the data.

3. **Google OAuth redirect URL for development vs production**
   - What we know: Need to configure Google Cloud Console and Supabase dashboard.
   - What's unclear: Does the developer have Google Cloud Console access? Is there a Supabase project with Google OAuth already configured?
   - Recommendation: Check Supabase dashboard Authentication > Providers > Google. If not configured, this is a prerequisite task.

## Sources

### Primary (HIGH confidence)
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) -- middleware setup, getUser() vs getSession()
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Google provider setup, signInWithOAuth, callback route
- Codebase analysis: src/hooks/supabase-auth/, src/lib/supabase/, middleware.ts, layout.tsx, all Clerk imports

### Secondary (MEDIUM confidence)
- [Supabase Auth Quickstart for Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs) -- general setup patterns
- [Supabase JavaScript API Reference](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) -- signInWithOAuth API

### Tertiary (LOW confidence)
- user_id_mapping migration approach -- based on general database migration patterns, not verified against actual production data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed, versions confirmed in package.json
- Architecture: HIGH -- existing code analyzed, patterns derived from codebase conventions
- Pitfalls: HIGH -- documented from official Supabase docs (getUser vs getSession) and codebase analysis (duplicate clients)
- Migration scope: MEDIUM -- 10 API files with Clerk imports confirmed, but DB tables with user_id need live audit

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- Supabase Auth API is mature)
