# Project Research Summary

**Project:** G.O.A.T. (Greatest Of All Time)
**Domain:** Interactive ranking/list-building web application (production readiness)
**Researched:** 2026-03-14
**Confidence:** HIGH

## Executive Summary

G.O.A.T. is a ranked-list builder that differentiates from TierMaker and Topsters through three specific advantages: AI-generated item lists from text prompts, numbered 1-N positioning (definitive ordering vs. vague tier groupings), and visually polished shareable result images. The core architecture — Next.js App Router, Zustand stores, @dnd-kit, Supabase — is sound and does not need rebuilding. The work required is production readiness: fixing a broken core ranking flow, migrating auth from Clerk to Supabase, completing the AI generation pipeline, and implementing real image generation and sharing. Each of these is an integration task on an existing codebase, not greenfield development.

The recommended approach is strictly sequential. The end-to-end ranking flow must be fixed before anything else ships — every feature downstream (sharing, AI lists, profiles) is worthless if items do not load into the grid correctly. Auth migration follows because all user-facing features need a stable identity layer. AI generation completes the database population strategy. Sharing and image generation close the viral loop. Testing runs concurrently throughout. This order is not arbitrary: it follows hard dependency chains, and violating it (e.g., shipping sharing before auth is stable) creates compounding debt.

The biggest risk is the Clerk-to-Supabase auth migration. This is a data migration, not just a library swap — existing user records are keyed by Clerk-format IDs, and every table with a user_id column requires a mapping script before the cutover. The second highest risk is the result image generation endpoint, which currently produces JSON metadata, not an actual image file. Both of these are confirmed gaps in the current implementation that must be resolved before launch. Beyond those two blockers, the other risks (Vercel timeouts, Gemini rate limits, Zustand hydration mismatches, mobile drag-and-drop, empty categories) are solvable with known patterns documented in the research.

## Key Findings

### Recommended Stack

The existing stack is appropriate for production with targeted additions. No framework changes are needed. The migrations are: remove Clerk (replace with @supabase/ssr, already installed), remove html2canvas (replace with @zumer/snapdom, 148x faster, actively maintained), and add Vitest for unit testing (Playwright is already installed but unused). Add @sentry/nextjs for error monitoring and @vercel/analytics + @vercel/speed-insights for observability. Google Gemini (@google/genai ^1.38.0) and Zod (^4.3.6) are already installed and pair correctly for structured AI output.

**Core technologies:**
- `@supabase/ssr ^0.7.0`: Auth middleware and SSR client — already installed, enables cookie-based sessions compatible with Next.js App Router and Supabase RLS
- `@google/genai ^1.38.0`: AI item generation — already installed, stable GA release with native Zod structured output support
- `@zumer/snapdom ^2.0.1`: Client-side result image capture — replaces unmaintained html2canvas, zero dependencies, 148x faster
- `vitest ^4.1.0` + `@testing-library/react`: Unit/component testing — fastest feedback loop for 7+ Zustand stores, Jest-compatible API
- `@sentry/nextjs ^10.43.0`: Error monitoring — official Next.js SDK, auto-instruments client/server/edge, required for production visibility
- `@vercel/analytics ^2.0.1` + `@vercel/speed-insights ^2.0.0`: Observability — zero-config on Vercel, privacy-friendly, free tier sufficient for launch

**Remove:**
- `@clerk/nextjs` — replaced by @supabase/ssr
- `svix` — Clerk webhook verification, no longer needed
- `html2canvas` — replaced by @zumer/snapdom

### Expected Features

The market leader is TierMaker (1M+ templates, S/A/B/C tier groupings). G.O.A.T. cannot compete on template volume. It competes on creation speed (AI prompts), ranking precision (numbered positions), and visual quality (shareable images). The core ranking flow is currently broken — items do not load correctly into the grid — making this the single highest-priority fix before any other feature work.

**Must have (table stakes):**
- End-to-end ranking flow — the core promise; nothing else works without it; currently broken
- Pre-populated item catalog (10-15 categories minimum) — empty categories cause immediate abandonment
- Shareable result image (PNG export) — users create rankings to share them; no sharing = no completion motivation
- Shareable link with OG preview — enables viral growth loop; requires working rankings first
- No-account guest usage — zero friction to start; gate saving/sharing behind auth, not creation
- Supabase Auth (sign up to save permanently) — Google + email; currently Clerk, migration required
- Mobile-responsive grid — majority of shared-link traffic is mobile; PWA exists but touch drag-and-drop needs validation
- Search and browse landing page — discoverability; GlobalSearchBar exists, needs populated data

**Should have (competitive):**
- AI-generated custom lists — type any topic, get rankable items; key differentiator; Gemini integration exists but is incomplete
- Numbered position display in result images — makes results "debatable" and more shareable than tier groupings
- Comparison modal polish — built (comparison-store.ts exists), needs discoverability
- User profile pages with completed rankings — enables repeat engagement after first completion
- Cloud sync across devices for authenticated users — expected after sign-up

**Defer (v2+):**
- Community template creation — requires moderation infrastructure
- Real-time multiplayer ranking — WebSocket complexity far exceeds launch value
- Social feed / following — turns a creative tool into a social network; different product
- Achievement/badge system — premature without retention data
- Embed widget — niche, WidgetGenerator already partially built but not launch-critical

### Architecture Approach

The existing architecture (7+ coordinated Zustand stores, TanStack Query for server state, GlobalOrchestrator for multi-store transactions, Supabase as source of truth) is well-suited for production and should not be restructured. The four new concerns — auth migration, AI generation completion, image generation pipeline, and testing infrastructure — each integrate into this existing architecture rather than replacing parts of it. Two image generation paths are required and distinct: client-side (@zumer/snapdom) for downloadable high-fidelity result images, and server-side (Next.js `ImageResponse`) for OG link preview cards. These are different use cases that cannot share an implementation.

**Major components:**
1. **Supabase Auth Layer** — replaces ClerkProvider; middleware handles token refresh via `getUser()` (not `getSession()`); provider hierarchy unchanged except top-level swap
2. **AI Generation Service** — Gemini structured output + Zod schema validation + enrichment pipeline (Wikipedia images); needs completion: save items to Supabase, add progress UX, handle errors
3. **Image Generation Pipeline** — two paths: client (@zumer/snapdom for downloadable PNG) + server (ImageResponse for OG previews); current endpoint generates JSON metadata only, not actual images
4. **Share System** — ShareManager + /share/[code] server-rendered page + OG meta tags; wiring exists, needs the image generation path to be real
5. **GlobalOrchestrator + Zustand Store Layer** — unchanged; 7 core coordinated stores; must add Vitest reset infrastructure before testing can begin
6. **Test Infrastructure** — Vitest (unit/component) + Playwright (E2E); test pyramid: store unit tests first, then API integration tests, then critical-path E2E flows

### Critical Pitfalls

1. **Clerk-to-Supabase auth migration orphans user data** — All existing user records are keyed by Clerk-format IDs (`user_2abc123`). Supabase Auth generates UUIDs. Create a `user_id_mapping` table and migration script before touching auth. Migrate behind a feature flag. Abstract auth behind a `useAuthUser()` hook before swapping the provider. Plan for OAuth/magic link to avoid bcrypt hash incompatibility.

2. **Result image endpoint produces JSON, not images** — The `/api/match/generate-result-image` endpoint returns Gemini-generated composition metadata, not a binary image. Use @zumer/snapdom client-side for downloadable images and Next.js `ImageResponse` server-side for OG previews. Do not ship the sharing feature until actual image output exists.

3. **21 persisted Zustand stores cause SSR hydration mismatches** — Server renders with default state; client hydrates with potentially stale cached data. Use the existing `useHydrationSafe` hook consistently. Add a `version` field and `migrate` function to every persisted store config. Create a global hydration gate before rendering grid/match UI.

4. **Serverless timeout on image generation (Vercel: 10s free / 15s Pro)** — The generate-result-image route chains multiple async operations; a full Top 50 list regularly exceeds this. Set `maxDuration` in the route config (already done for studio/generate at 60s — apply the same). Use optimistic UI: show non-AI composition immediately, upgrade asynchronously. Cache results in Supabase Storage.

5. **Gemini free tier: 15 RPM — any concurrent usage causes 429 errors** — No rate limiting or queuing exists in the current implementation. Add per-user server-side rate limiting before launch. Cache AI-generated item sets by topic (identical prompts return stored results). Pre-generate popular categories to reduce AI calls at runtime.

## Implications for Roadmap

Based on combined research, the dependency chain is strict. Each phase unblocks the next. Skipping phases or parallelizing the wrong things creates data integrity risk (auth migration) or ships incomplete features (sharing without real images).

### Phase 1: Core Flow Stabilization

**Rationale:** The end-to-end ranking flow is broken. Items do not load correctly into the grid. Every other feature is worthless until a user can complete a ranking. Additionally, legacy code duplication (Match vs matching directories, 60+ API routes including speculative features) adds cognitive load and regression risk. Fix the foundation before building on it.

**Delivers:** A working ranking flow: backlog loads items, user drags to grid, grid saves to session, ranking completes. Clean codebase with legacy code quarantined.

**Addresses:** End-to-end ranking flow (P1), No-account guest usage (P1), Save progress/resume later (already built but verify)

**Avoids:**
- Legacy code confusion (Pitfall 9) — audit and quarantine unused Match/matching duplication before new features
- Position indexing off-by-one (Pitfall 10) — create `toDisplayPosition` / `toStorePosition` utilities now

### Phase 2: Auth Migration (Clerk to Supabase)

**Rationale:** All user-facing features that persist data — saved rankings, profile pages, cloud sync — require a stable, correct auth identity. Migrating auth after those features are built creates compounding debt. Migrating auth before database population means generated items will correctly carry user ownership from day one.

**Delivers:** Supabase Auth sign-in/sign-up (Google + email). Working middleware with token refresh. User profiles linked by auth.uid(). Clerk and svix removed.

**Addresses:** User accounts with saved rankings (P1), Progressive engagement guest-to-user flow (P2), RLS enforcement for data privacy

**Avoids:**
- User data orphaned during migration (Pitfall 1) — build user_id_mapping table first, migrate behind feature flag, abstract auth behind useAuthUser() hook
- Migrating auth and RLS simultaneously (Architecture anti-pattern) — migrate auth first, tighten RLS in a later phase

**Uses:** @supabase/ssr (already installed), Next.js middleware pattern (Pattern 1 from ARCHITECTURE.md)

### Phase 3: Database Population and AI Generation

**Rationale:** The app needs pre-populated categories to be useful. AI generation is the mechanism for both populating the database and enabling custom list creation (the key differentiator). Auth must be stable first so generated items carry correct user ownership. This phase makes the app substantively useful rather than technically functional.

**Delivers:** 10-15 fully populated categories (100+ items with images each). Working AI generation flow from Studio UI (type prompt, get items, save to Supabase). Category readiness gating (only show categories meeting minimum thresholds).

**Addresses:** Pre-populated item catalog (P1), AI-generated custom lists (P2, the key differentiator), Supabase item dedup to avoid regenerating existing content

**Avoids:**
- Empty categories destroying first-use experience (Pitfall 6) — define minimum-item threshold, hide incomplete categories, use idempotent seed scripts
- Gemini rate limits crashing at low concurrency (Pitfall 4) — add per-user rate limiting, cache by topic, pre-generate popular categories
- Wikipedia image URL unreliability (Pitfall 11) — validate dimensions/format, re-host in Supabase Storage, enable enrichment pipeline

### Phase 4: Result Sharing and Image Generation

**Rationale:** The viral growth loop closes here. Users complete a ranking, export a branded image, share a link. This phase requires working rankings (Phase 1) and working auth (Phase 2) to correctly attribute and persist shared content. The image generation endpoint is currently a stub — this is not polish, it is a missing feature.

**Delivers:** Real PNG/JPG result image download (@zumer/snapdom client-side). /share/[code] server-rendered page with OG meta tags. Server-side OG image generation (Next.js ImageResponse). Platform sharing (Twitter, clipboard, native share API).

**Addresses:** Shareable result image (P1), Shareable link with OG preview (P1), Beautiful branded result images (P2)

**Avoids:**
- Shipping "sharing" without real image output (Pitfall 8) — confirmed the current endpoint is a stub; implement @zumer/snapdom + ImageResponse
- Serverless timeout on image generation (Pitfall 3) — set maxDuration, use optimistic UI, cache in Supabase Storage
- Server-side html2canvas usage (Architecture anti-pattern) — client for download, satori/ImageResponse for OG

**Uses:** @zumer/snapdom (replaces html2canvas), Next.js ImageResponse (Pattern 3 from ARCHITECTURE.md), Supabase Storage for image caching

### Phase 5: Testing Infrastructure and Production Readiness

**Rationale:** Tests should be written incrementally throughout phases 2-4, but this phase ensures coverage is complete, CI is wired, and all production readiness requirements are met before launch. Error monitoring and analytics must be in place before launch — invisible production failures are a hard blocker.

**Delivers:** Vitest unit test suite for 7 core stores and utilities. Playwright E2E tests for 4 critical flows (ranking, auth, studio generation, sharing). Sentry error monitoring. Vercel Analytics + Speed Insights. Hydration stability across all persisted stores.

**Addresses:** Test coverage, error monitoring (Pitfall 12), production observability

**Avoids:**
- 26 stores leaking state between tests (Pitfall 7) — implement store reset utility before writing any tests (Pattern 2 from ARCHITECTURE.md)
- 21 persisted stores causing SSR hydration mismatches (Pitfall 2) — version all persist configs, implement hydration gate, use useHydrationSafe consistently
- No error monitoring making production issues invisible (Pitfall 12) — Sentry via wizard before launch

**Uses:** vitest ^4.1.0, @testing-library/react, @playwright/test (already installed), @sentry/nextjs, @vercel/analytics, @vercel/speed-insights

### Phase Ordering Rationale

- **Phase 1 before everything:** The core ranking flow being broken is not a bug, it is a missing product. No other feature can be validated against it.
- **Phase 2 (auth) before Phase 3 (AI generation):** Generated items need correct user ownership from the start. Retrofitting ownership onto orphaned items after auth migration adds unnecessary complexity.
- **Phase 3 (database) before Phase 4 (sharing):** You cannot share an impressive result from an empty category. The sharing flow is only compelling if the ranked content is real.
- **Phase 4 (sharing) closes the viral loop:** This is the user acquisition mechanism. It should be complete and polished before any growth efforts.
- **Phase 5 runs throughout but formalizes at end:** Store unit tests begin in Phase 2 (as stores get modified for auth), API tests in Phase 3, E2E in Phase 4. Phase 5 is the checkpoint, not the start.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:

- **Phase 2 (Auth Migration):** The Clerk ID to Supabase UUID mapping migration is complex and depends on the actual schema. The data migration script needs to be written against the real database structure. Plan a research step to audit every table with a user_id or clerk_id column.
- **Phase 3 (AI Generation + Database Population):** The enrichment pipeline (Wikipedia image fetching with pLimit concurrency) and Gemini structured output schema for items need validation against the current API contracts. Google's rate limit changes in December 2025 may require schema or quota adjustments.
- **Phase 4 (Image Generation):** @zumer/snapdom is a newer library (v2.0.1, January 2026) with less battle-testing than html2canvas. If custom font rendering or complex CSS is involved, validate rendering fidelity before committing.

Phases with standard patterns (research optional):

- **Phase 1 (Core Flow Stabilization):** Pure debugging and cleanup. No new patterns, all existing code.
- **Phase 5 (Testing + Production Readiness):** Vitest + Playwright setup is well-documented by Next.js official guides. Sentry setup is a wizard. Standard patterns apply.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All key packages verified against official docs and npm. @zumer/snapdom is MEDIUM (newer library, less battle-tested). All other stack decisions backed by official sources. |
| Features | HIGH | Competitor analysis (TierMaker, Topsters, Canva, TierBuddy) is thorough. Table stakes, differentiators, and anti-features are clearly defined with rationale. |
| Architecture | HIGH | All patterns verified against official Supabase SSR docs, Next.js docs, and Zustand testing docs. Code-level implementation details included. |
| Pitfalls | HIGH | Critical pitfalls confirmed by codebase inspection (not inference): result image endpoint is confirmed a stub, Clerk IDs are confirmed in database, 21 persisted stores confirmed, 60+ API routes confirmed. |

**Overall confidence:** HIGH

### Gaps to Address

- **Actual database schema for user_id columns:** The auth migration script must be written against the real table structure. Audit every table for `clerk_id`, `user_id`, and `created_by` columns before writing the migration. Approach: run a schema introspection query during planning.
- **Current state of the broken ranking flow:** Research confirms items do not load correctly into the grid, but does not identify the specific cause. This needs a debugging step at the start of Phase 1 before fixes can be planned.
- **@zumer/snapdom rendering edge cases:** Newer library with less documented behavior for complex grid layouts. May need a proof-of-concept build in Phase 4 before committing to it as the final solution. html-to-image is the confirmed fallback if needed.
- **Gemini quota tier:** The current implementation targets the free tier (15 RPM). If the project is on a paid tier, rate limits are higher but cost monitoring becomes critical. Confirm Google Cloud billing tier before Phase 3 planning.
- **Category population status:** Research notes "some categories have items, others are empty" but does not have exact counts. Run the diagnostic query (`SELECT category, COUNT(*), COUNT(image_url) FROM items GROUP BY category`) before Phase 3 scope is finalized.

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — auth middleware patterns, cookie-based sessions
- [Supabase Auth Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) — middleware token refresh
- [Supabase Creating SSR Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — client/server separation
- [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response) — server-side OG image generation
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) — unit testing setup
- [Next.js Playwright Guide](https://nextjs.org/docs/pages/guides/testing/playwright) — E2E testing
- [Zustand Testing Guide](https://docs.pmnd.rs/zustand/guides/testing) — store reset pattern
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) — SDK version and stability
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) — Zod schema integration
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) — 15 RPM free tier confirmed
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — error monitoring setup
- [@vercel/analytics npm](https://www.npmjs.com/package/@vercel/analytics) — analytics integration
- [@vercel/speed-insights npm](https://www.npmjs.com/package/@vercel/speed-insights) — Core Web Vitals monitoring
- [Vercel Function Timeout Limits](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) — 10s/15s limits confirmed

### Secondary (MEDIUM confidence)
- [@zumer/snapdom GitHub](https://github.com/zumerlab/snapdom) — performance benchmarks (148x vs html2canvas), feature list
- [Clerk to Supabase Migration walkthrough](https://dev.to/depfixer/how-to-migrate-from-clerk-to-supabase-auth-save-200month-2j4p) — migration approach patterns
- [TierMaker](https://tiermaker.com/) — competitor feature baseline
- [Topsters](https://topsters.org/) — competitor feature baseline
- [TierBuddy](https://tierbuddy.com/) — competitor feature baseline
- [8 Best Tier List Makers 2026](https://simplified.com/blog/ai-design/tier-list-maker) — market landscape

### Tertiary (LOW confidence)
- dnd-kit GitHub issues #834, #791 — iOS touch/Haptic Touch drag bugs (unresolved, reported by community)
- Zustand GitHub discussions #2496, #1382 — hydration error patterns with persist middleware

---
*Research completed: 2026-03-14*
*Ready for roadmap: yes*
