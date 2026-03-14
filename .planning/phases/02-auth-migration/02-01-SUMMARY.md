---
phase: 02-auth-migration
plan: 01
subsystem: auth
tags: [supabase-auth, oauth, google, middleware, clerk-removal, guest-identity]

# Dependency graph
requires:
  - phase: 01-core-ranking-flow
    provides: working ranking flow that uses userId from stores
provides:
  - useAuthUser() hook -- unified auth identity for guests and authenticated users
  - Supabase middleware for session refresh (no route protection)
  - OAuth callback route at /auth/callback
  - Guest-to-user merge endpoint at /api/auth/merge-guest
  - Zero Clerk dependencies in codebase
affects: [02-auth-migration, 03-category-expansion, 04-share-flow]

# Tech tracking
tech-stack:
  added: []
  removed: [@clerk/nextjs, svix]
  patterns: [supabase-getUser-in-api-routes, middleware-session-refresh, guest-uuid-merge]

key-files:
  created:
    - src/hooks/use-auth-user.ts
    - src/app/auth/callback/route.ts
    - src/app/api/auth/merge-guest/route.ts
  modified:
    - src/middleware.ts
    - src/app/layout.tsx
    - src/hooks/supabase-auth/client.ts
    - src/hooks/index.ts
    - src/types/database.ts
    - src/app/api/challenges/route.ts
    - src/app/api/challenges/[id]/route.ts
    - src/app/api/challenges/[id]/chain/route.ts
    - src/app/api/challenges/[id]/invite/route.ts
    - src/app/api/challenges/[id]/leaderboard/route.ts
    - src/app/api/challenges/[id]/submit/route.ts
    - src/app/api/challenges/join/route.ts
    - src/app/api/challenges/streaks/route.ts
    - src/app/api/share/analytics/route.ts
    - .env.example
    - package.json
  deleted:
    - src/hooks/use-clerk-user.ts
    - src/app/api/webhooks/clerk/route.ts
    - middleware.ts (root-level Clerk middleware)

key-decisions:
  - "Refactored supabase-auth/client.ts to use shared browser client singleton from lib/supabase/client.ts (avoids duplicate clients)"
  - "Root-level middleware.ts (Clerk) deleted in favor of src/middleware.ts (Supabase) -- Next.js with src/ directory uses src/middleware.ts"
  - "Database schema types retain clerk_id columns (users, user_profiles, user_id_mapping) because they mirror the live DB schema needed for migration"
  - "Merge endpoint updates lists, shared_rankings, and list_collections (tables with user_id column); list_items excluded (uses list_id, not user_id)"

patterns-established:
  - "API route auth pattern: createClient() -> getUser() -> user.id (replaces Clerk auth())"
  - "useAuthUser() is the single consumer-facing auth hook -- components should not use useSupabaseAuth or useTempUser directly"
  - "Middleware only refreshes sessions, never protects routes (guests have full access)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 2 Plan 1: Auth Foundation & Clerk Removal Summary

**Supabase Auth foundation with useAuthUser() hook, session middleware, OAuth callback, guest merge endpoint, and complete Clerk removal across 10 API routes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T22:07:49Z
- **Completed:** 2026-03-14T22:16:15Z
- **Tasks:** 2
- **Files modified:** 21 (3 created, 3 deleted, 15 modified)

## Accomplishments
- useAuthUser() hook provides unified identity (guest UUID or Supabase user ID) with signInWithGoogle/signOut actions
- Supabase middleware refreshes sessions on every request without blocking any routes
- OAuth callback route exchanges authorization code for session at /auth/callback
- Guest-to-user merge endpoint at /api/auth/merge-guest migrates guest data on sign-up
- All 10 API routes migrated from Clerk auth() to Supabase getUser()
- @clerk/nextjs and svix packages uninstalled, zero Clerk imports remain
- ClerkProvider removed from layout.tsx
- TypeScript compiles cleanly with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAuthUser hook, middleware, OAuth callback, and merge endpoint** - `b1430d0` (feat)
2. **Task 2: Remove Clerk -- swap layout, replace API auth, delete files, uninstall packages** - `31d112c` (feat)

## Files Created/Modified

- `src/hooks/use-auth-user.ts` - Unified auth hook combining Supabase auth + guest identity
- `src/middleware.ts` - Supabase session refresh middleware (replaces Clerk middleware)
- `src/app/auth/callback/route.ts` - OAuth code exchange endpoint
- `src/app/api/auth/merge-guest/route.ts` - Guest-to-user data merge endpoint
- `src/hooks/supabase-auth/client.ts` - Refactored to use shared browser client singleton
- `src/app/layout.tsx` - ClerkProvider removed, no replacement wrapper needed
- `src/hooks/index.ts` - useClerkUser export replaced with useAuthUser
- `src/types/database.ts` - Added user_id_mapping table type for migration
- `src/app/api/challenges/*.ts` (8 files) - Replaced Clerk auth() with Supabase getUser()
- `src/app/api/share/analytics/route.ts` - Replaced Clerk auth() with Supabase getUser()
- `.env.example` - Clerk env var section removed
- `package.json` - @clerk/nextjs and svix removed

## Decisions Made

- Refactored supabase-auth/client.ts to use shared browser client singleton (avoids Pitfall 6 from research -- duplicate clients causing auth state desync)
- Discovered root-level middleware.ts with old Clerk middleware -- deleted it since src/middleware.ts is the correct location for Next.js with src/ directory
- Kept clerk_id columns in database.ts types because they mirror live DB schema needed for the user_id_mapping migration
- Merge endpoint excludes list_items table (uses list_id, not user_id)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted root-level middleware.ts (Clerk middleware)**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Root-level middleware.ts still contained Clerk middleware imports, causing tsc errors after package removal. The plan only mentioned rewriting src/middleware.ts but didn't account for the root-level copy.
- **Fix:** Deleted root middleware.ts -- src/middleware.ts is the correct location for Next.js projects with src/ directory
- **Files modified:** middleware.ts (deleted)
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** 31d112c (Task 2 commit)

**2. [Rule 1 - Bug] Fixed typed Supabase .from() in merge endpoint**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Using string loop variable with typed supabase.from() caused TS2769 -- Supabase client requires literal table names for type safety
- **Fix:** Replaced loop with explicit per-table update calls
- **Files modified:** src/app/api/auth/merge-guest/route.ts
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** b1430d0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for compilation. No scope creep.

## Issues Encountered
- .next/types/validator.ts cached reference to deleted Clerk webhook route caused false tsc error -- resolved by clearing .next cache

## User Setup Required
None - no new external service configuration required. Google OAuth provider must be configured in Supabase dashboard before testing, but that is deployment configuration, not code changes.

## Next Phase Readiness
- Auth infrastructure is complete and ready for Plan 02 (Auth UI components: modal, sign-in button, post-completion nudge)
- All API routes are on Supabase auth -- future routes should follow the same pattern
- useAuthUser() is ready for component consumption

## Self-Check

Verified all claims:

- [x] src/hooks/use-auth-user.ts exists and exports useAuthUser
- [x] src/middleware.ts uses @supabase/ssr createServerClient with getUser()
- [x] src/app/auth/callback/route.ts exists with GET export
- [x] src/app/api/auth/merge-guest/route.ts exists with POST export
- [x] src/hooks/use-clerk-user.ts deleted
- [x] src/app/api/webhooks/clerk/route.ts deleted
- [x] middleware.ts (root) deleted
- [x] npx tsc --noEmit passes with zero errors
- [x] grep for @clerk in .ts/.tsx source files returns zero results (excluding DB schema column names)
- [x] Commit b1430d0 exists
- [x] Commit 31d112c exists

## Self-Check: PASSED

---
*Phase: 02-auth-migration*
*Completed: 2026-03-14*
