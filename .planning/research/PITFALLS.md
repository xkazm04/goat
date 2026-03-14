# Domain Pitfalls

**Domain:** Interactive ranking/list-building web app (Next.js + Supabase + Zustand)
**Researched:** 2026-03-14

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or launch-blocking issues.

---

### Pitfall 1: Clerk-to-Supabase Auth Migration Destroys User Sessions and Data Links

**What goes wrong:** Migrating authentication providers mid-project breaks the link between user IDs and their data. Clerk user IDs (e.g., `user_2abc123`) are embedded throughout the database -- in lists, rankings, sessions, and webhooks. Supabase Auth generates completely different UUIDs. If you swap auth without a user ID mapping layer, every existing user loses access to their data.

**Why it happens:** Developers treat auth migration as "swap the provider" when it is actually a data migration. The Clerk webhook route (`/api/webhooks/clerk`) syncs user data, and 22+ files reference Clerk's `useAuth`/`useUser` hooks. The blast radius is large.

**Consequences:**
- All existing user data becomes orphaned (lists, rankings, sessions)
- Active sessions are invalidated with no recovery path
- Password hashes are incompatible -- Clerk uses bcrypt, Supabase uses its own hashing
- RLS policies referencing `auth.uid()` will not match old Clerk IDs
- Provider hierarchy in `layout.tsx` (ClerkProvider at root) means the swap touches every page

**Prevention:**
1. Create a `user_id_mapping` table: `clerk_id -> supabase_id` before migrating anything
2. Write a migration script that updates all foreign keys across tables
3. Build the Supabase Auth integration alongside Clerk behind a feature flag first
4. Abstract auth behind a `useAuthUser()` hook that wraps the provider (the existing `useClerkUser` hook is a good starting point -- generalize it)
5. Plan for password-less auth (magic link/OAuth) to avoid the bcrypt hash problem entirely
6. Send email to users 24-48 hours before cutover explaining they will need to re-login

**Detection:** Check if any table has a `user_id` column with Clerk-formatted IDs. If yes, migration script is mandatory.

**Phase:** Should be addressed in the auth migration phase, before any other production features depend on Supabase Auth. Do NOT attempt this alongside other major changes.

**Confidence:** HIGH -- based on official Supabase/Clerk docs and multiple migration reports.

---

### Pitfall 2: 21 Persisted Zustand Stores Create Hydration Mismatches and Stale State in Production

**What goes wrong:** The app has 21 stores using Zustand's `persist` middleware writing to localStorage/IndexedDB. On the Next.js server, these stores have no persisted state (returns defaults). On the client, they hydrate with potentially stale cached data. The mismatch causes React hydration errors, flash-of-wrong-content, and -- worst case -- users seeing another session's data.

**Why it happens:** Zustand persist is designed for SPAs, not SSR frameworks. The project has accumulated 26+ stores (7 core documented, many more undocumented), and stores cross-reference each other via `getState()`. When one store hydrates before another, the cross-references read stale or default data.

**Consequences:**
- React hydration errors in production (visible as console warnings or broken UI)
- Grid shows items from a previous session before loading current data
- Store coordination bugs where grid-store, session-store, and backlog-store disagree on current state
- Schema changes between deployments leave serialized state in localStorage that doesn't match new types, causing runtime crashes

**Prevention:**
1. Use the existing `useHydrationSafe` hook consistently across ALL components that read from persisted stores
2. Add a `version` field to every persisted store's `persist` config and implement `migrate` functions for schema changes
3. Create a global hydration gate -- do not render match/grid UI until ALL required stores confirm hydration complete
4. Test the "fresh user" flow (cleared localStorage) and "returning user" flow (stale localStorage) as separate test scenarios
5. Consider reducing the number of persisted stores -- not every store needs persistence. Audit which stores truly need to survive page refreshes

**Detection:** Open the app in incognito, interact with it, then open a second tab. If state bleeds between tabs or shows flash of old data, the hydration strategy is broken.

**Phase:** Should be addressed during testing/stabilization phase before production launch. Add hydration tests early.

**Confidence:** HIGH -- this is a well-documented Next.js + Zustand problem with 21 persisted stores making it acute.

---

### Pitfall 3: Serverless Image Generation Hits Timeout and Memory Limits on Vercel

**What goes wrong:** The result image generation route (`/api/match/generate-result-image`) calls Gemini API, processes layout calculations, and generates composition data -- all in a single serverless function. On Vercel's free tier, functions timeout after 10 seconds. Even on Pro, the default is 15 seconds. A Top 50 list with image fetching and AI processing will regularly exceed this.

**Why it happens:** The current implementation chains: request parsing -> grid item filtering -> layout engine -> balance optimizer -> color analysis -> Gemini API call -> response composition. Each step adds latency, and the Gemini API call alone can take 5-15 seconds.

**Consequences:**
- Users complete a ranking, hit "generate image," wait 10+ seconds, and get a timeout error
- The Gemini API fallback path still returns composition data, but the "AI enhanced" sharing image was the value proposition
- Vercel bills for execution time even on timeouts
- No retry mechanism means users must manually retry

**Prevention:**
1. Set `maxDuration` in the route config (already done for studio/generate at 60s -- do the same for image generation)
2. Split the flow: generate composition data synchronously, queue the AI enhancement as a background job
3. Use optimistic UI -- show the non-AI composition immediately, then upgrade when AI completes
4. Cache generated images in Supabase Storage so repeat views don't regenerate
5. Consider client-side image generation using HTML Canvas/html2canvas for the base image, with AI enhancement as optional upgrade
6. Set up Vercel Fluid Compute if using Pro plan for longer execution windows

**Detection:** Test image generation with a full Top 50 grid (all items with images). If it takes more than 8 seconds in development, it will timeout in production on free tier.

**Phase:** Must be addressed before the sharing/result generation feature ships.

**Confidence:** HIGH -- Vercel timeout limits are well-documented, and the current code has no timeout protection.

---

### Pitfall 4: Gemini API Rate Limits and Cost Blow Up at Scale

**What goes wrong:** The app calls Gemini API for both item generation (studio/generate) and image generation. As of December 2025, Google cut free tier quotas significantly -- Flash models now get 15 RPM (requests per minute) on free tier. If 16 users generate lists simultaneously, the 16th gets a 429 error. On paid tier, costs can spike unexpectedly since rate limits are per-project, not per-key.

**Why it happens:** AI features are easy to build but hard to operate. The studio/generate endpoint calls Gemini with structured output + Google Search grounding, which counts as a more expensive request. There is no rate limiting, no request queuing, and no cost monitoring in the current implementation.

**Consequences:**
- 429 errors during traffic spikes kill the user experience at the worst moment (during list creation)
- No server-side rate limiting means a single user could exhaust the entire project quota
- Cost surprises when paid tier usage exceeds expectations
- The current error handling returns generic errors -- users have no idea the AI service is rate-limited

**Prevention:**
1. Implement server-side rate limiting per user (use Supabase or Upstash Redis for distributed rate limiting)
2. Add a request queue with exponential backoff for Gemini calls
3. Cache AI-generated items -- if someone asks for "Top 50 Horror Movies," cache that result and serve it for subsequent identical requests
4. Set budget alerts in Google Cloud Console
5. Show clear UI feedback: "Generating items..." with a progress indicator, and "Service busy, retrying..." on 429s
6. Pre-generate popular category items and store in the database, reducing AI calls for common use cases
7. Use Flash-Lite model for simpler requests to reduce cost

**Detection:** Monitor the `[Studio Generate]` console logs. If you see Gemini errors during moderate testing (5+ concurrent users), rate limiting is needed before launch.

**Phase:** Rate limiting should be in the production readiness phase. Caching should be in the database population phase.

**Confidence:** HIGH -- Google's December 2025 quota reductions are documented and affect all free-tier users.

---

## Moderate Pitfalls

---

### Pitfall 5: dnd-kit Mobile Touch Interaction is Broken by Default

**What goes wrong:** The drag-and-drop system using @dnd-kit has well-documented issues on mobile touch devices. Items get stuck during drags, iOS 3D Touch/Haptic Touch interferes with drag initiation, and scrollable containers become unscrollable after the first drag operation.

**Prevention:**
1. Configure `TouchSensor` with appropriate `activationConstraint` (delay of 200-250ms, tolerance of 5-8px) to distinguish drag from scroll
2. Test on actual iOS Safari and Android Chrome -- emulators miss touch-specific bugs
3. Add `touch-action: none` CSS to draggable elements to prevent browser default touch behaviors
4. Consider a "tap to select, tap to place" alternative interaction for mobile instead of drag-and-drop
5. Test with iOS Haptic Touch enabled -- this is the most reported failure mode

**Detection:** Use Chrome DevTools mobile emulation for initial testing, then test on physical iPhone (especially iPhone 12+ with Haptic Touch).

**Phase:** UI/UX polish phase. Mobile interaction must be validated before launch since PWA is the mobile strategy.

**Confidence:** HIGH -- multiple open issues on dnd-kit GitHub confirm these as unresolved platform bugs.

---

### Pitfall 6: Database Population Strategy Creates Empty or Inconsistent Category Experiences

**What goes wrong:** The database is "partially populated" -- some categories have items, others are empty. Users who pick an empty category see a blank backlog with nothing to rank. This is the single fastest way to lose a new user. Additionally, AI-generated items may have inconsistent quality, missing images, or duplicates across categories.

**Prevention:**
1. Define a "minimum viable category" standard: at least 100 items with images per category before that category goes live
2. Use a seed script (not manual inserts) that can be re-run idempotently as data improves
3. Validate image URLs before inserting -- Wikipedia image URLs expire or change format
4. Implement a category readiness flag in the database -- only show categories in the UI that pass the minimum threshold
5. For launch, pick 5-8 strong categories and hide the rest rather than showing 50 half-empty ones
6. Store image URLs in Supabase Storage (proxied) rather than hotlinking Wikipedia/external URLs that may break

**Detection:** Run a query: `SELECT category, COUNT(*), COUNT(image_url) FROM items GROUP BY category`. Any category with fewer than 50 items or less than 70% image coverage is not launch-ready.

**Phase:** Database population phase. This is pre-requisite work before the ranking flow can be tested end-to-end.

**Confidence:** MEDIUM -- based on project context stating "some categories have items, others are empty."

---

### Pitfall 7: Multi-Store Testing is Exceptionally Difficult Without a Reset Strategy

**What goes wrong:** With 26+ Zustand stores and no automated tests, adding tests later is harder than it sounds. Zustand stores are singletons that persist across test runs in the same process. Tests pollute each other's state, leading to flaky test suites that pass individually but fail when run together.

**Prevention:**
1. Set up Zustand's test reset utility from their official testing docs -- create a `beforeEach` that resets all stores
2. For the 7 core coordinated stores (match, grid, session, comparison, list, item, backlog), write integration tests that test the orchestration flow, not individual stores in isolation
3. Use the `GlobalOrchestrator` as the test entry point since it already coordinates multi-store transactions
4. Mock the persistence middleware in tests -- never let tests write to actual localStorage
5. Start with the critical path: "user opens list -> backlog loads -> user drags item -> grid updates -> session saves." If this flow has test coverage, most regressions will be caught

**Detection:** If the first test you write passes alone but fails when run with other tests, the store reset strategy is missing.

**Phase:** Testing phase. Set up the reset infrastructure before writing any test cases.

**Confidence:** HIGH -- documented Zustand testing pattern, and the 26-store count makes this more acute than typical projects.

---

### Pitfall 8: Result Image Sharing Generates Text Descriptions, Not Actual Images

**What goes wrong:** The current `generate-result-image` endpoint does not actually generate an image. It generates a text description of what an image should look like (via Gemini), plus composition metadata. There is no actual image file (PNG/JPG) being created. Users expecting a shareable image will get nothing they can post to social media.

**Prevention:**
1. Use a server-side rendering approach: `@vercel/og` (Satori) for generating OG-image-style shareable cards
2. Or use Puppeteer/Playwright on a dedicated service (not Vercel serverless) to screenshot an HTML template
3. Or generate images client-side with `html2canvas` or Canvas API for instant results
4. The Gemini "design concept" output can inform the HTML template styling, but an actual rendering pipeline is needed
5. Store generated images in Supabase Storage with a shareable URL
6. Generate at standard social media sizes: 1200x630 (Open Graph), 1080x1080 (Instagram), 1200x675 (Twitter)

**Detection:** Call the `/api/match/generate-result-image` endpoint and check the response. If there is no binary image data or image URL in the response, only JSON metadata, the image generation pipeline is incomplete.

**Phase:** This is a core feature gap that must be addressed in the result sharing phase. Do not ship "sharing" without actual image output.

**Confidence:** HIGH -- confirmed by reading the current route implementation.

---

### Pitfall 9: Legacy Code Duplication Creates Confusion and Regression Risk

**What goes wrong:** The codebase has both `Match` and `matching` feature directories (documented as "Legacy/alternate match implementation"). There are 60+ API routes, many of which appear to be speculative features (challenges, consensus, embed, personalization, v1 API, agent-bridge) that are not part of the active scope. Developers will waste time maintaining or accidentally breaking unused code.

**Prevention:**
1. Audit all API routes against the active requirements list -- disable or remove routes that are not needed for launch
2. Delete the `matching` directory if `Match` is the canonical implementation
3. Flag speculative stores (challenge-store, consensus-store, criteria-store, etc.) as unused -- do not test or maintain them pre-launch
4. Create a `DEPRECATED.md` or add comments to routes/stores that exist but are out of scope
5. Do NOT delete everything at once -- move to a `_legacy/` directory first so it can be recovered

**Detection:** Run `grep -r "from.*matching" src/` -- if nothing imports from the legacy directory, it is safe to remove.

**Phase:** Should be addressed during initial stabilization before adding new features, to reduce cognitive load.

**Confidence:** HIGH -- confirmed by codebase inspection showing duplicate features and 60+ API routes.

---

## Minor Pitfalls

---

### Pitfall 10: Position Indexing Off-by-One Between Stores and UI

**What goes wrong:** Grid positions are 0-based internally and 1-based in the UI. The image generation code does `item.position + 1` for display. If any new code or test forgets this conversion, items appear in wrong positions.

**Prevention:** Create a single `toDisplayPosition(index: number)` and `toStorePosition(display: number)` utility. Use TypeScript branded types if possible (`type StorePosition = number & { __brand: 'StorePosition' }`).

**Phase:** Can be addressed incrementally during development.

**Confidence:** HIGH -- documented in CLAUDE.md as a known gotcha.

---

### Pitfall 11: Wikipedia Image URLs Are Unreliable for Production Display

**What goes wrong:** The studio/generate endpoint fetches images from Wikipedia, which can return SVGs, tiny thumbnails, or URLs that break when Wikipedia updates its CDN paths. Image quality varies wildly between articles.

**Prevention:**
1. Validate image dimensions and format before storing (reject SVGs, images under 200px)
2. Download and re-host images in Supabase Storage rather than hotlinking
3. Implement a fallback image system -- category-appropriate placeholder when no good image is available
4. The enrichment pipeline already exists as a multi-source fallback -- ensure it is enabled in production (`ENABLE_ENRICHMENT_PIPELINE=true`)

**Phase:** Database population phase.

**Confidence:** MEDIUM -- based on code review showing multiple fallback strategies already, suggesting this has been a known problem.

---

### Pitfall 12: No Error Monitoring Means Production Issues Are Invisible

**What goes wrong:** The `.env.example` has `NEXT_PUBLIC_SENTRY_DSN` commented out. Console.error calls in API routes go to Vercel function logs, which are limited in retention and hard to search. When the Gemini API starts returning errors or stores get into bad state, there is no alerting.

**Prevention:**
1. Set up Sentry (already referenced in env) or a similar error monitoring service before launch
2. Add structured logging to critical paths: session initialization, drag operations, AI generation, image generation
3. Set up Vercel Analytics for basic performance monitoring
4. Create a `/api/health` endpoint (already exists) and set up uptime monitoring

**Phase:** Production readiness phase.

**Confidence:** HIGH -- standard production requirement, confirmed missing by env inspection.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth Migration | User data orphaned when Clerk IDs replaced (Pitfall 1) | Build ID mapping table first, migrate behind feature flag |
| Database Population | Empty categories kill first-use experience (Pitfall 6) | Set minimum-item thresholds, hide incomplete categories |
| AI Generation | Rate limits at 15 RPM on free tier (Pitfall 4) | Add server-side rate limiting and caching layer |
| Result Sharing | No actual image is generated (Pitfall 8) | Implement real image rendering via Satori/@vercel/og or Canvas |
| Image Generation | Vercel timeout at 10s free / 15s pro (Pitfall 3) | Set maxDuration, split sync/async, cache results |
| UI/UX Polish | Mobile drag-and-drop broken on iOS (Pitfall 5) | Test on physical devices, add tap-to-place fallback |
| Testing | 26 stores leak state between tests (Pitfall 7) | Set up store reset utility before writing any tests |
| Stabilization | Legacy code creates confusion (Pitfall 9) | Audit and remove unused features before adding new ones |
| Production Readiness | No error monitoring (Pitfall 12) | Set up Sentry before launch |
| Hydration | 21 persisted stores cause SSR mismatches (Pitfall 2) | Use hydration gate, version all persist configs |

## Sources

- [Supabase Docs: Clerk Integration](https://supabase.com/docs/guides/auth/third-party/clerk)
- [How to Migrate from Clerk to Supabase Auth](https://dev.to/depfixer/how-to-migrate-from-clerk-to-supabase-auth-save-200month-2j4p)
- [Supabase Auth Troubleshooting](https://supabase.com/docs/guides/auth/troubleshooting)
- [Zustand: Multiple Stores Discussion](https://github.com/pmndrs/zustand/discussions/2496)
- [Zustand: Testing Guide](https://docs.pmnd.rs/zustand/guides/testing)
- [Zustand: Hydration Errors Discussion](https://github.com/pmndrs/zustand/discussions/1382)
- [Vercel: Function Timeout Limits](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)
- [Vercel: Fluid Compute Announcement](https://vercel.com/changelog/serverless-functions-can-now-run-up-to-5-minutes)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [dnd-kit: Touch Screen Issues](https://github.com/clauderic/dnd-kit/issues/834)
- [dnd-kit: iOS Haptic Touch Bug](https://github.com/clauderic/dnd-kit/issues/791)
- [Supabase: Database Seeding](https://supabase.com/docs/guides/local-development/seeding-your-database)
- [Fixing Hydration Errors with Zustand Persist](https://medium.com/@judemiracle/fixing-react-hydration-errors-when-using-zustand-persist-with-usesyncexternalstore-b6d7a40f2623)
