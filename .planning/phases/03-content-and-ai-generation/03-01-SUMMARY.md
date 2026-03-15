---
phase: 03-content-and-ai-generation
plan: 01
subsystem: database, api
tags: [gemini, igdb, supabase, seeding, video-games, wikipedia]

# Dependency graph
requires:
  - phase: 01-core-ranking-flow
    provides: Landing page with category grid and MIN_CATEGORY_ITEMS gating
provides:
  - Idempotent video game category seed script (12 categories, 100+ items each)
  - Landing page hides underpopulated categories (threshold 50)
affects: [03-content-and-ai-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [concurrent-pipeline-with-fallback, idempotent-upsert-seeding]

key-files:
  created:
    - scripts/seed-categories.ts
  modified:
    - src/app/features/Landing/LandingMain.tsx

key-decisions:
  - "Used direct @supabase/supabase-js client with service role key for seed script (avoids Next.js request context dependency)"
  - "IGDB concurrency capped at 4, Wikipedia at 6, HEAD validation at 10 to respect rate limits"
  - "Upsert on name+group_id for item idempotency (onConflict with ignoreDuplicates)"
  - "Landing page filters out underpopulated categories entirely rather than showing Coming soon badges"

patterns-established:
  - "Seed script pattern: Gemini title generation -> IGDB enrichment -> Wikipedia fallback -> HEAD validation -> Supabase upsert"
  - "Category visibility gating: MIN_CATEGORY_ITEMS threshold filter in LandingMain.tsx"

requirements-completed: [CONT-01, CONT-05]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 03 Plan 01: Video Game Category Seeding Summary

**Automated seed pipeline using Gemini + IGDB + Wikipedia to populate 12 video game categories with 100+ items each, and landing page gating at 50-item threshold**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T23:58:21Z
- **Completed:** 2026-03-15T00:01:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created idempotent seed script with multi-source image enrichment pipeline (Gemini -> IGDB -> Wikipedia -> HEAD validation)
- Updated landing page to completely hide categories below 50-item threshold with empty state fallback
- Seed script supports --dry-run mode for safe preview

## Task Commits

Each task was committed atomically:

1. **Task 1: Create idempotent video game category seed script** - `fb3001f` (feat)
2. **Task 2: Update landing page to hide underpopulated categories** - `44ff707` (feat)

## Files Created/Modified
- `scripts/seed-categories.ts` - Seed script: Gemini generates titles, IGDB/Wikipedia provide images, Supabase upsert for persistence
- `src/app/features/Landing/LandingMain.tsx` - MIN_CATEGORY_ITEMS raised to 50, categories below threshold hidden entirely

## Decisions Made
- Used direct `@supabase/supabase-js` with service role key for the seed script since the Next.js server client requires request context (cookies)
- Capped IGDB at 4 concurrent requests, Wikipedia at 6, HEAD at 10 to stay within rate limits
- Used `onConflict: 'name,group_id'` with `ignoreDuplicates: true` for item idempotency
- Removed "Coming soon" badges entirely -- filtered categories out of the render array instead

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing `next build` failure due to CSS `@theme` block error in `globals.css` (Tailwind v4 compatibility). Not related to this plan's changes. Logged in `deferred-items.md`.

## User Setup Required

**External services require manual configuration before running the seed script:**

Required environment variables:
- `GEMINI_API_KEY` - from Google AI Studio API Keys
- `TWITCH_CLIENT_ID` - from Twitch Developer Console Applications
- `TWITCH_CLIENT_SECRET` - from Twitch Developer Console Applications
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

Run: `npx tsx scripts/seed-categories.ts`

## Next Phase Readiness
- Seed script ready for execution once API keys are configured
- Landing page gating logic in place -- will automatically show categories once seed data reaches threshold
- Pre-existing CSS build error needs resolution (separate from this plan)

---
*Phase: 03-content-and-ai-generation*
*Completed: 2026-03-15*
