# Architecture Patterns

**Domain:** Interactive ranking/list-building web app (production readiness)
**Researched:** 2026-03-14
**Overall confidence:** MEDIUM-HIGH

## Current Architecture Overview

The G.O.A.T. app has a sophisticated existing architecture that is well-suited for production. The key challenge is not rebuilding but integrating four new concerns into the existing system: auth migration, AI generation, sharing/image generation, and testing.

```
Current Provider Hierarchy:
ClerkProvider                    <-- REPLACE with SupabaseAuthProvider
  -> ThemeProvider
    -> BacklogProvider
      -> QueryProvider
        -> PrefetchProvider
          -> OfflineProvider
            -> CommandPaletteProvider
              -> App Content

Current State Layer:
GlobalOrchestrator (commands) -> 7+ Zustand stores (coordinated)
                              -> localStorage/IndexedDB (persistence)
                              -> TanStack Query (server state)
                              -> Supabase (database)

Current API Layer:
/api/lists          (CRUD)
/api/top/groups     (backlog items)
/api/studio/generate (AI generation - Gemini)
/api/match/generate-result-image (image composition)
/api/share/         (sharing endpoints)
/api/webhooks/clerk (auth sync - TO BE REMOVED)
```

## Recommended Architecture for Production Features

### Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| **Supabase Auth Layer** | Session management, token refresh, RLS enforcement | Middleware, Supabase client, all API routes | New (replaces Clerk) |
| **Auth Middleware** | Token refresh on every request, redirect unauthenticated users | Supabase Auth, Next.js router | New |
| **AI Generation Service** | Gemini-powered item generation with enrichment pipeline | `/api/studio/generate`, Supabase (item lookup), Wikipedia API | Exists, needs completion |
| **Image Generation Pipeline** | Result image composition from grid state | `/api/match/generate-result-image`, LayoutEngine, html2canvas (client) or @vercel/og (server) | Exists, needs dual-path |
| **Share System** | Platform-specific sharing, OG images, deep links | ShareManager, `/api/share/`, `/api/share/og-image` | Exists, needs wiring |
| **GlobalOrchestrator** | Atomic multi-store transactions, undo/redo | All Zustand stores | Exists, stable |
| **Zustand Store Layer** | Client state: grid, session, match, backlog, etc. | Each other via `getState()`, persistence layer | Exists, 7+ stores |
| **TanStack Query Layer** | Server state cache, mutations | Supabase, API routes | Exists |
| **Offline/Sync Engine** | Offline persistence, sync queue, conflict resolution | SyncEngine, localStorage/IndexedDB, Supabase | Exists |
| **Test Infrastructure** | Unit (Vitest), E2E (Playwright), store testing | All components | New |

### Data Flow

#### 1. Auth Flow (New - Supabase Auth)

```
Browser Request
  -> Next.js Middleware (token refresh via supabase.auth.getUser())
    -> Cookie updated with fresh session
      -> Server Component / API Route reads session from cookie
        -> Supabase RLS enforces row-level access
```

**Critical detail:** The existing `@supabase/ssr` client/server setup is already correctly configured for cookie-based auth. The migration is primarily about:
1. Replacing `ClerkProvider` with a Supabase auth context provider
2. Adding Next.js middleware for token refresh (currently no middleware exists)
3. Removing the Clerk webhook and `user_profiles.clerk_id` column
4. Adding Supabase Auth sign-up/sign-in UI (or using `@supabase/auth-ui-react`)

**Provider hierarchy after migration:**
```
SupabaseAuthProvider             <-- New: wraps auth state
  -> ThemeProvider
    -> BacklogProvider
      -> QueryProvider
        -> PrefetchProvider
          -> OfflineProvider
            -> CommandPaletteProvider
              -> App Content
```

#### 2. AI Generation Flow (Existing, needs completion)

```
Studio UI (client)
  -> POST /api/studio/generate
    -> Validate request (Zod schema)
    -> Google Gemini (structured JSON output with grounding)
    -> Search Supabase for existing items (dedup)
    -> EnrichmentPipeline (Wikipedia images, metadata)
    -> Return items with images + suggested title/description
  -> Studio store updates
  -> User saves list -> Supabase
```

**Architecture is sound.** The existing implementation uses:
- Zod schemas for request/response validation
- Bounded concurrency (`pLimit`) for Wikipedia fetches
- Supabase dedup to avoid re-generating existing items
- Enrichment pipeline with multiple image sources

**What needs completion:**
- Error recovery UX (what happens when Gemini fails mid-generation)
- Progress feedback to client (streaming or polling for long generations)
- Saving generated items to Supabase `items` table (currently items stay client-side)

#### 3. Image Generation / Sharing Flow

```
User completes ranking
  -> Client: Capture grid as image (html2canvas for rich result image)
  -> OR: Server: POST /api/match/generate-result-image (composition engine)
  -> Image stored: Supabase Storage bucket or returned as blob
  -> Share flow:
    -> ShareManager.share({ platform, content })
      -> Platform adapter (Twitter, clipboard, native share, embed)
      -> OG image: GET /api/share/og-image/[code] (for link previews)
      -> Deep link: /share/[code] -> server-rendered share page
      -> Analytics tracking
```

**Two image generation paths exist and both are needed:**
1. **Client-side (html2canvas):** For downloadable high-fidelity result images matching the actual grid UI. Already a dependency in package.json.
2. **Server-side (@vercel/og or satori):** For OG images in link previews. Next.js `ImageResponse` is the right choice here -- it runs on Edge/serverless without a browser.

**Share page architecture:**
```
/share/[code]/page.tsx (Server Component)
  -> Fetch ranking data from Supabase
  -> Render static share page with metadata
  -> OG meta tags point to /api/share/og-image/[code]
  -> Client hydration adds interactive elements
```

#### 4. Test Architecture

```
Test Pyramid:
  E2E (Playwright)          -- Critical user flows
    Integration (Vitest)    -- Store interactions, API routes
      Unit (Vitest)         -- Pure logic, utilities, individual stores

Store Testing Pattern:
  vi.mock('zustand') with auto-reset between tests
  Test stores in isolation first, then cross-store via GlobalOrchestrator

API Route Testing:
  Vitest with MSW for external service mocking (Supabase, Gemini)

E2E Priority:
  1. Complete ranking flow (backlog -> grid -> result)
  2. Auth flow (sign up -> sign in -> protected routes)
  3. Studio flow (generate -> customize -> save)
  4. Share flow (complete ranking -> generate image -> share link)
```

## Patterns to Follow

### Pattern 1: Supabase Auth Middleware (Token Refresh)

**What:** Middleware that refreshes auth tokens on every request using `supabase.auth.getUser()`.
**When:** Every request to protected routes.
**Why:** Server Components cannot write cookies. Middleware is the only place to refresh tokens and update cookies in Next.js App Router.
**Confidence:** HIGH (official Supabase docs pattern)

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession() for security
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users from protected routes
  if (!user && request.nextUrl.pathname.startsWith('/match')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)'],
}
```

### Pattern 2: Zustand Store Testing with Auto-Reset

**What:** Mock pattern that resets all Zustand stores between tests.
**When:** Every test file that touches Zustand state.
**Confidence:** HIGH (official Zustand testing docs)

```typescript
// test/setup.ts
import { act } from '@testing-library/react'
import { afterEach } from 'vitest'

const storeResetFns = new Set<() => void>()

// Monkey-patch zustand create to track stores
const { create: actualCreate } = await vi.importActual<typeof import('zustand')>('zustand')

vi.mock('zustand', () => ({
  create: (createState: any) => {
    const store = actualCreate(createState)
    const initialState = store.getState()
    storeResetFns.add(() => store.setState(initialState, true))
    return store
  },
}))

afterEach(() => {
  act(() => storeResetFns.forEach((fn) => fn()))
})
```

### Pattern 3: Server-Side OG Image Generation

**What:** Use Next.js `ImageResponse` for dynamic OG images.
**When:** Generating social media preview images for shared rankings.
**Confidence:** HIGH (built into Next.js)

```typescript
// src/app/api/share/og-image/[code]/route.tsx
import { ImageResponse } from 'next/og'

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const ranking = await fetchRankingByShareCode(params.code)

  return new ImageResponse(
    <div style={{ display: 'flex', /* ... */ }}>
      <h1>{ranking.title}</h1>
      {ranking.topItems.map((item, i) => (
        <div key={i}>#{i + 1} {item.name}</div>
      ))}
    </div>,
    { width: 1200, height: 630 }
  )
}
```

### Pattern 4: User Data Migration (Clerk ID -> Supabase Auth ID)

**What:** Migration script to link existing `user_profiles` (keyed by `clerk_id`) to new Supabase Auth users.
**When:** During auth migration phase.
**Confidence:** MEDIUM (depends on user count and approach)

```
Migration strategy:
1. Add `supabase_auth_id` column to `user_profiles`
2. Keep `clerk_id` column temporarily
3. On first sign-in with Supabase Auth, match by email -> link accounts
4. After migration period, drop `clerk_id` column
5. Update RLS policies to use auth.uid() instead of clerk_id lookups
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using `getSession()` in Server Code
**What:** Calling `supabase.auth.getSession()` in middleware, Server Components, or API routes.
**Why bad:** `getSession()` reads from local storage/cookies without revalidating the token. It can return an expired or tampered session. Security vulnerability.
**Instead:** Always use `supabase.auth.getUser()` in server-side code -- it makes a round-trip to Supabase Auth to verify the token.

### Anti-Pattern 2: Testing Stores Through Components Only
**What:** Only testing Zustand stores by rendering components that use them.
**Why bad:** With 7+ coordinated stores, component tests become fragile and slow. Store logic (especially cross-store orchestration) should be tested independently.
**Instead:** Test stores directly by calling their actions and asserting state changes. Test the GlobalOrchestrator commands as integration tests. Use component tests only for UI behavior.

### Anti-Pattern 3: Server-Side html2canvas for Result Images
**What:** Trying to use html2canvas in API routes or server components.
**Why bad:** html2canvas requires a DOM/browser environment. It cannot run in Node.js or Edge runtimes.
**Instead:** Use html2canvas on the client for downloadable result images. Use `ImageResponse`/satori on the server for OG images. These are two different use cases with different solutions.

### Anti-Pattern 4: Migrating Auth and RLS Simultaneously
**What:** Changing auth provider and adding RLS policies in the same phase.
**Why bad:** If something breaks, you cannot tell whether the issue is auth configuration or RLS policies. Two complex changes at once.
**Instead:** Phase 1: Migrate auth (Clerk -> Supabase Auth) with existing permission model. Phase 2: Add/tighten RLS policies once auth is stable.

## Component Integration Map

```
+------------------+     +-------------------+     +------------------+
|  Supabase Auth   |---->|   Middleware       |---->|  Server Client   |
|  (Provider)      |     |   (token refresh)  |     |  (createClient)  |
+------------------+     +-------------------+     +------------------+
        |                                                   |
        v                                                   v
+------------------+     +-------------------+     +------------------+
|  Auth UI         |     |  API Routes       |<--->|  Supabase DB     |
|  (sign in/up)    |     |  (protected)      |     |  (RLS enforced)  |
+------------------+     +-------------------+     +------------------+
                                |
                    +-----------+-----------+
                    |           |           |
                    v           v           v
            +----------+ +-----------+ +----------+
            | Studio   | | Match     | | Share    |
            | Generate | | Result    | | OG Image |
            | (Gemini) | | (compose) | | (satori) |
            +----------+ +-----------+ +----------+
                    |           |           |
                    v           v           v
            +----------+ +-----------+ +----------+
            | Enrichmt | | html2cnvs | | Supabase |
            | Pipeline | | (client)  | | Storage  |
            +----------+ +-----------+ +----------+

State Management (unchanged):
+--------------------+
| GlobalOrchestrator |----> grid-store
|   (commands)       |----> session-store
|                    |----> match-store
|                    |----> comparison-store
|                    |----> backlog-store
+--------------------+
        |
        v
+--------------------+     +-------------------+
| TanStack Query     |<--->| Supabase          |
| (server cache)     |     | (source of truth) |
+--------------------+     +-------------------+
```

## Scalability Considerations

| Concern | Current (dev) | At Launch (1K users) | At Scale (100K users) |
|---------|--------------|---------------------|----------------------|
| **Auth** | Clerk (hosted) | Supabase Auth (sufficient) | Supabase Auth (sufficient, no per-user cost) |
| **AI Generation** | Direct Gemini calls | Rate limit per user, queue long requests | Queue system (e.g., Supabase Edge Functions + pg_cron) |
| **Image Generation** | Client-side html2canvas | Works fine (client resources) | Consider server-side caching of popular rankings |
| **OG Images** | On-demand generation | Cache with CDN headers | Pre-generate on ranking save, serve from Supabase Storage |
| **Database** | Direct queries | Add indexes for share codes, user lookups | Read replicas, materialized views for popular rankings |
| **Sharing** | Basic link + image | Works fine | Add short URLs, embed widgets |

## Suggested Build Order (Dependencies)

The build order is critical because each system depends on previous ones being stable:

```
Phase 1: Fix Core Flow (no dependencies)
  -> Fix backlog item loading
  -> Fix grid save/restore
  -> Ensure end-to-end ranking works
  WHY FIRST: Nothing else matters if the core ranking flow is broken

Phase 2: Auth Migration (depends on: working core flow)
  -> Add middleware.ts for token refresh
  -> Replace ClerkProvider with Supabase Auth provider
  -> Add sign-in/sign-up pages using Supabase Auth UI
  -> Migrate user_profiles table (clerk_id -> auth.uid())
  -> Remove Clerk dependencies
  WHY SECOND: All subsequent features need auth to work

Phase 3: AI Generation Completion (depends on: auth)
  -> Wire studio generate to save items to Supabase
  -> Add user ownership to generated lists
  -> Error handling and progress UX
  WHY THIRD: Populates the database, makes the app useful

Phase 4: Sharing + Image Generation (depends on: auth, working rankings)
  -> Client-side result image generation (html2canvas)
  -> Share page with OG meta (/share/[code])
  -> Server-side OG image generation (ImageResponse)
  -> Platform sharing adapters (existing ShareManager)
  WHY FOURTH: Requires completed rankings to share

Phase 5: Testing (can start in Phase 2, full coverage by Phase 5)
  -> Vitest setup + store unit tests (start Phase 2)
  -> API route integration tests (start Phase 3)
  -> Playwright E2E for critical flows (start Phase 4)
  -> Coverage targets and CI integration
  WHY THROUGHOUT: Testing should be incremental, not a final phase
```

## Database Schema Implications

### Auth Migration Changes
```sql
-- Add Supabase auth user ID (nullable during migration)
ALTER TABLE user_profiles ADD COLUMN auth_id UUID REFERENCES auth.users(id);

-- After migration, make it the primary identifier
-- Drop clerk_id column after verification period

-- RLS policy pattern (after migration)
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Users can read own rankings"
  ON rankings FOR SELECT
  USING (auth.uid() = user_id);
```

### Sharing Schema Additions
```sql
-- Share codes table for public ranking links
CREATE TABLE shared_rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT UNIQUE NOT NULL,
  ranking_id UUID REFERENCES rankings(id),
  user_id UUID REFERENCES auth.users(id),
  og_image_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Public access policy (no auth required to view)
CREATE POLICY "Anyone can view shared rankings"
  ON shared_rankings FOR SELECT
  USING (true);
```

## Sources

- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official setup guide (HIGH confidence)
- [Supabase Auth Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) - Middleware patterns (HIGH confidence)
- [Supabase Creating SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - Client/server separation (HIGH confidence)
- [Zustand Testing Guide](https://zustand.docs.pmnd.rs/guides/testing) - Store testing patterns (HIGH confidence)
- [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response) - OG image generation (HIGH confidence)
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Unit testing setup (HIGH confidence)
- [Next.js Playwright Guide](https://nextjs.org/docs/pages/guides/testing/playwright) - E2E testing setup (HIGH confidence)
- [Clerk to Supabase Migration](https://dev.to/depfixer/how-to-migrate-from-clerk-to-supabase-auth-save-200month-2j4p) - Migration walkthrough (MEDIUM confidence)
- [html2canvas npm](https://www.npmjs.com/package/html2canvas) - Client-side image capture (HIGH confidence, already in dependencies)
