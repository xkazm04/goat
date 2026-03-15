# Codebase Concerns

**Analysis Date:** 2026-03-14

---

## Tech Debt

**Dual Auth System (Clerk + Supabase Auth in parallel):**
- Issue: The app runs both Clerk and a Supabase Auth implementation simultaneously. `src/hooks/useSupabaseAuth.ts` and `src/hooks/supabase-auth/` exist alongside Clerk imports in API routes. `src/hooks/index.ts` line 173 explicitly notes this as "being migrated to useSupabaseAuth" but the migration is unfinished.
- Files: `src/hooks/useSupabaseAuth.ts`, `src/hooks/supabase-auth/`, `src/app/api/challenges/[id]/submit/route.ts`, `src/app/api/challenges/[id]/invite/route.ts`
- Impact: Engineers must know which auth system applies to which route. New API routes could mistakenly use no auth or the wrong auth. Auth bugs surface only for certain users.
- Fix approach: Complete the Clerk → Supabase Auth migration. Pick one system and remove the other. See `.env.example` migration notes.

**Deprecated `TransferProtocol` class still shipped:**
- Issue: `src/lib/dnd/transfer-protocol.ts` is 657+ lines, more than half of which are marked `@deprecated` with "NOT CURRENTLY USED" comments. The class-based `TransferProtocol`, `createBacklogSource`, `createGridPositionReceiver`, `getGlobalTransferProtocol`, and factory functions are all dead code bundled in every build.
- Files: `src/lib/dnd/transfer-protocol.ts` (lines 186-657)
- Impact: Bundle bloat; confuses developers reading the file; risk of someone using deprecated paths.
- Fix approach: Delete deprecated sections, keep only active exports (`extractGridPosition`, `createGridReceiverId`, `isGridReceiverId`, `toTransferableItem`, type definitions).

**Deprecated sorting/type exports in `ranked-inventory.ts`:**
- Issue: `src/types/ranked-inventory.ts` exports `SortCriteria`, `SortDirection`, `SortConfig`, `SORT_PRESETS`, `computeSortValue`, `sortItems` — all marked `@deprecated` pointing to `@/lib/sorting`. `src/types/composition-to-api.ts` is also marked deprecated.
- Files: `src/types/ranked-inventory.ts`, `src/types/composition-to-api.ts`, `src/types/list-intent-transformers.ts`
- Impact: Consumers may pick up the deprecated symbol instead of the canonical one. Dead code maintained across refactors.
- Fix approach: Find all import sites with grep, update to `@/lib/sorting`, then remove the re-exports.

**`ListIntent` migration still in-flight:**
- Issue: `src/types/list-intent-transformers.ts` has four deprecated symbols (`ListIntentCompatHelper`, `buildListMetadata`, `getCompatiblePayload`, `buildCreateListPayload`) tagged "For migration only" and "For backward compatibility." The old shape is still actively imported.
- Files: `src/types/list-intent-transformers.ts`, `src/types/composition-to-api.ts`
- Impact: Two code paths for list creation; data shape mismatches possible in edge cases.
- Fix approach: Audit callers, migrate to `ListIntent` + `listIntentToCreateRequest`, delete compat helpers.

**`match-test` page accessible in production:**
- Issue: `src/app/match-test/page.tsx` is a developer test harness for the grid ("Access at: /match-test?list={listId}"). It is not behind any auth check or environment guard.
- Files: `src/app/match-test/page.tsx`
- Impact: Exposes an unpolished, unstyled debug page to all users. Could be used to test unauthorized list access.
- Fix approach: Add a `process.env.NODE_ENV !== 'production'` guard or delete the route if no longer needed.

**`listGridCache` grows unboundedly in localStorage:**
- Issue: `src/stores/grid-store.ts` `listGridCache` persists all per-list grid snapshots to localStorage under `grid-store`. Each new list adds an entry that is never evicted. A power user who opens many lists will accumulate megabytes of grid data in localStorage.
- Files: `src/stores/grid-store.ts` (lines 147-149, 227-241, 908-937)
- Impact: localStorage can hit its 5-10 MB browser quota. On quota exceeded, Zustand's persist middleware silently fails to save, causing session loss.
- Fix approach: Implement an LRU eviction policy with a configurable max (e.g., 10 cached lists). Remove entries beyond the limit before persisting.

**`GlobalOrchestrator` uses untyped `any` store references:**
- Issue: `src/lib/orchestration/GlobalOrchestrator.ts` declares its `storeRefs` object with `any` for every store (`grid: any; session: any; comparison: any; ...`). Lazy `require()` calls lack type assertions.
- Files: `src/lib/orchestration/GlobalOrchestrator.ts` (lines 38-45)
- Impact: TypeScript cannot catch wrong method names or argument types when using orchestrated commands. Runtime errors will not surface until the code path is exercised.
- Fix approach: Type each store reference with the imported store type (e.g., `grid: typeof import('@/stores/grid-store').useGridStore`).

**`immerSet as any` cast in backlog store:**
- Issue: `src/stores/backlog/store.ts` line 35 casts Immer's `set` to `any` as a workaround for middleware typing. This suppresses TypeScript for all mutation functions built on top of it.
- Files: `src/stores/backlog/store.ts`, `src/stores/backlog/actions-data.ts`
- Impact: Type errors in backlog actions are invisible at compile time.
- Fix approach: Use proper Immer + Zustand types with `StateCreator<BacklogState, [["zustand/immer", never]], []>`.

---

## Known Bugs / Incomplete Features

**`CompletionModalActions` "Save" is a stub:**
- Symptoms: Clicking "Save to collection" on the completion modal logs to the console and does nothing.
- Files: `src/components/app/modals/completion/CompletionModalActions.tsx` (lines 45-48)
- Trigger: Complete a ranking list and open the completion modal.
- Workaround: None; feature is absent.

**`/api/consensus/submit` does not persist data:**
- Symptoms: The endpoint accepts valid ranking submissions and returns `{ success: true }` but contains a comment saying "For now, just acknowledge the submission." No database writes occur.
- Files: `src/app/api/consensus/submit/route.ts` (lines 60-77)
- Trigger: Any client that submits a consensus ranking.
- Workaround: None; all consensus submissions are silently dropped.

**Offline sync is not implemented for backlog changes:**
- Symptoms: `src/stores/backlog/actions-offline.ts` line 72 has a comment "TODO: Add API calls to persist to backend when implementing sync." Offline backlog edits are never sent to Supabase.
- Files: `src/stores/backlog/actions-offline.ts`
- Trigger: User makes backlog changes while offline; on reconnect, changes do not sync.
- Workaround: None.

**Export-image error shows no user feedback:**
- Symptoms: When `captureAndDownload` throws, the error is logged to console but no toast, alert, or UI message is shown to the user.
- Files: `src/components/app/modals/completion/CompletionModalActions.tsx` (line 41)
- Trigger: Image export failure (e.g., html2canvas cross-origin issues).
- Workaround: None visible to user.

---

## Security Considerations

**Admin endpoint has no authentication:**
- Risk: `POST /api/admin/search-image` invokes the Gemini API using the server's `GEMINI_API_KEY`. There is no authentication check — any anonymous caller can trigger API calls that consume Gemini quota/credits.
- Files: `src/app/api/admin/search-image/route.ts`
- Current mitigation: None.
- Recommendations: Add `auth()` check from Clerk and verify the user has an admin role before proceeding.

**Several write endpoints accept `userId` from the request body:**
- Risk: `POST /api/lists` accepts `user_id` from `body.user_id` without verifying it matches the authenticated session. Same pattern in `POST /api/blueprints/[slugOrId]/clone` (uses `body.userId`). Any client can pass an arbitrary `user_id` to create or clone resources under another user's account.
- Files: `src/app/api/lists/route.ts` (line 101), `src/app/api/blueprints/[slugOrId]/clone/route.ts` (line 57)
- Current mitigation: None.
- Recommendations: Derive `userId` from `auth()` (Clerk) or the Supabase session on the server; never trust a client-supplied user ID for ownership assignment.

**`/api/consensus/submit` accepts a `userId` from the request body:**
- Risk: The endpoint takes `userId` from the POST body to attribute submissions. There is no auth verification step — the comment even notes "1. Verify user authentication" as a TODO.
- Files: `src/app/api/consensus/submit/route.ts` (lines 14, 61)
- Current mitigation: None (endpoint is a stub so no data is persisted yet, but this will matter when implemented).
- Recommendations: Before implementing persistence, add server-side auth verification and derive `userId` from the session.

**Debug store exposed on `window` in all environments:**
- Risk: `src/stores/backlog/store.ts` attaches `window.__backlogStore` with `clearCache`, `forceRefresh`, `debugImages`, and `clearIndexedDB` methods whenever `typeof window !== 'undefined'` — including in production builds. Any browser console user can invoke these methods.
- Files: `src/stores/backlog/store.ts` (lines 151-173)
- Current mitigation: None.
- Recommendations: Wrap in `if (process.env.NODE_ENV !== 'production')`.

**Gemini AI endpoint returns AI-suggested image URLs without allowlist enforcement at the fetch layer:**
- Risk: `POST /api/studio/find-image` calls Gemini which can return arbitrary URLs. `isValidImageUrl` validates the URL format and a short CDN allowlist, but the URL is returned directly to the client which then fetches it. If Gemini hallucinates a non-allowlisted HTTPS URL with an image extension, it passes validation.
- Files: `src/app/api/studio/find-image/route.ts` (lines 124, 206-228)
- Current mitigation: `isValidImageUrl` partial allowlist check.
- Recommendations: Enforce the CDN allowlist strictly (reject anything not from the listed hostnames) rather than falling back to the extension check.

---

## Performance Bottlenecks

**`studio/generate` fetches Wikipedia images serially within `Promise.all`:**
- Problem: `src/app/api/studio/generate/route.ts` wraps item image resolution in `Promise.all`, but each item can make up to 3 sequential `fetchWikipediaImage` calls (direct → URL-extracted title → title variations). For a 20-item list, worst-case means 60 serial Wikipedia API fetches inside the `maxDuration: 60` serverless timeout.
- Files: `src/app/api/studio/generate/route.ts` (lines 164-237)
- Cause: Sequential fallback strategy inside each parallel branch.
- Improvement path: Cache Wikipedia image lookups (e.g., in Supabase or Redis). Reduce variation attempts to 1-2. Add a short-circuit timeout per item.

**OG image route (`/api/og/[listId]`) is 1,056 lines:**
- Problem: A single route file with 1,056 lines renders multiple complex OG image layouts using Satori/JSX. It has no caching headers or CDN caching strategy visible in the file.
- Files: `src/app/api/og/[listId]/route.tsx`
- Cause: All layout variants and rendering logic in one file; no edge caching.
- Improvement path: Add `Cache-Control: public, max-age=86400` headers or use Next.js `revalidate`. Split layout variants into separate files already started at `src/lib/og/card-layouts/`.

**`ranking-store.ts` is 1,410 lines — single store for five ranking modes:**
- Problem: A single Zustand store manages Podium, GOAT, Rushmore, Bracket, and Tier List modes, plus bracket state, tier state, smart tier calculation, and all associated actions. Any state change triggers re-evaluation of subscribed components across all modes.
- Files: `src/stores/ranking-store.ts`
- Cause: Over-consolidation to achieve "single source of truth."
- Improvement path: Split bracket and tier state into dedicated stores with selectors, referencing ranking-store only for the canonical `ranking[]` array.

---

## Fragile Areas

**Multi-store synchronization relies on `getState()` side-effects:**
- Files: `src/stores/grid-store.ts`, `src/stores/session-store.ts`, `src/stores/match-store.ts`
- Why fragile: `grid-store` directly calls `useSessionStore.getState().updateSessionGridItems(...)` from inside its own `set()` callback. If session-store is not yet hydrated from IndexedDB when the first drag occurs, the sync silently fails. The lazy accessor retries up to 5 times with 20ms delay, but there is no guarantee the retry window closes before the user can drag.
- Safe modification: Always check that session store's `getActiveSession()` returns a non-null value before writing. Add a readiness flag to session-store that grid-store can poll.
- Test coverage: No tests for store interaction paths.

**Lazy `require()` for circular dependency resolution:**
- Files: `src/stores/grid-store.ts` (line 53), `src/lib/orchestration/GlobalOrchestrator.ts` (lines 53-58), `src/lib/orchestration/dragHandlers.ts` (lines 154, 248)
- Why fragile: Dynamic `require()` calls at runtime bypass TypeScript module resolution. If a store is renamed or moved, the error only surfaces at runtime when the code path is exercised — not at build time.
- Safe modification: Refactor to break the circular dependency at the module graph level (e.g., move shared types to a separate package), then use static imports.
- Test coverage: No tests.

**`@ts-ignore` in `adaptiveLoader.ts` for experimental browser APIs:**
- Files: `src/app/features/Collection/lib/adaptiveLoader.ts` (lines 148, 159, 202, 252)
- Why fragile: Four `@ts-ignore` suppressions cover `deviceMemory`, WebGL context types, Network Information API, and Memory API — all non-standard, Chrome-only APIs. No feature-detection wrappers or try/catch ensure graceful degradation when these APIs change or are absent.
- Safe modification: Wrap each access in a `try/catch` with a sensible default. Use proper type augmentation (`interface Navigator { deviceMemory?: number; }`) instead of `@ts-ignore`.
- Test coverage: None.

---

## Scaling Limits

**LocalStorage / IndexedDB as the only persistence for session and backlog:**
- Current capacity: Browser-dependent (typically 5-10 MB localStorage, ~250 MB IndexedDB quota).
- Limit: `listGridCache` grows per list indefinitely; backlog cache can hold large item sets. On quota exhaustion, Zustand's persist silently fails.
- Scaling path: Implement LRU eviction in `listGridCache` (see Tech Debt above). Add explicit quota checks using the Storage API (`navigator.storage.estimate()`) and warn the user before exhaustion.

**`GlobalOrchestrator` transaction history is in-memory, unbounded:**
- Current capacity: `private transactionHistory: Transaction[]` accumulates every command executed.
- Limit: Long sessions (power users) will accumulate thousands of entries.
- Scaling path: Add a max history length (e.g., 200 entries) with a rolling window, consistent with undo state limit.

---

## Dependencies at Risk

**`gemini-3-flash-preview` model name in production API calls:**
- Risk: `src/app/api/studio/generate/route.ts` and `src/app/api/studio/find-image/route.ts` use the model identifier `gemini-3-flash-preview`. Preview model versions can be deprecated with short notice by Google.
- Impact: AI generation and image search features break entirely with a 404/400 from the Gemini API.
- Migration plan: Pin to a stable GA model (e.g., `gemini-1.5-flash`) and track Gemini changelog for deprecations.

**Clerk Auth dependency during Supabase Auth migration:**
- Risk: The codebase is mid-migration from Clerk to Supabase Auth. Both are active dependencies. If the migration is abandoned, the parallel Supabase Auth implementation (`src/hooks/supabase-auth/`) becomes dead code. If Clerk is removed before migration is complete, authenticated API routes break.
- Impact: Auth failures across challenge, invite, and leaderboard endpoints.
- Migration plan: Complete migration end-to-end on a feature branch before removing Clerk.

---

## Missing Critical Features

**Rate limiting on AI-powered endpoints:**
- Problem: `/api/studio/generate`, `/api/studio/find-image`, `/api/generate-ai-image`, and `/api/admin/search-image` all make external AI API calls without rate limiting. Any user (or unauthenticated caller for the admin endpoint) can exhaust API quotas.
- Blocks: Cost control and fair usage enforcement.

**Error monitoring / observability:**
- Problem: `src/app/features/Collection/components/CollectionErrorBoundary.tsx` line 73 notes "TODO: In production, send to monitoring service" — no error tracking service (Sentry, Datadog, etc.) is wired up. API routes use only `console.error`.
- Blocks: Diagnosing production issues without user reports.

---

## Test Coverage Gaps

**Core drag-and-drop logic has zero tests:**
- What's not tested: `src/stores/grid-store.ts` `handleDragEnd`, `assignItemToGrid`, `moveGridItem`, `swapPositions`, and lock-based concurrency logic are entirely untested.
- Files: `src/stores/grid-store.ts`, `src/lib/dnd/transfer-protocol.ts`
- Risk: Regressions in the app's primary interaction model are caught only by manual testing.
- Priority: High

**Multi-store synchronization has zero tests:**
- What's not tested: The sequence of grid-store → session-store → backlog-store synchronization that occurs on every drag operation has no test coverage.
- Files: `src/stores/grid-store.ts`, `src/stores/session-store.ts`, `src/stores/backlog/store.ts`
- Risk: Store sync bugs (e.g., session not updated, backlog item double-placed) are invisible until found in production.
- Priority: High

**Overall test file count: 1:**
- What's not tested: The entire application has exactly one test file: `src/components/visual/__tests__/visual-components.test.tsx`. All stores, all API routes, all hooks, all utility libraries, and all feature components are untested.
- Risk: Any refactoring or new feature can introduce regressions with no safety net.
- Priority: High — establish at minimum unit tests for stores and API route handlers before further growth.

---

*Concerns audit: 2026-03-14*
