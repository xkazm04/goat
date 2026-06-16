# goat — harness learnings

Accumulated structural facts discovered by Vibeman pipeline runs. Read this first on future runs.

## Structural facts
- **2026-06-16** — Two backlog stores coexist: `src/stores/backlog-store.ts` is a backward-compat shim that re-exports `useBacklogStore` + selectors from the modular `src/stores/backlog/` (`store.ts` + `actions-items.ts` + `selectors.ts`). The composed store owns the authoritative item `used` flag and `isItemUsed()`/`markItemAsUsed()`.
- **2026-06-16** — The item **`used`/placement flag is authoritative in the backlog store, not in `session-store.normalizedData`** — the two never reconcile. Anything deriving "available" items from `NormalizedOps.getAllItems(normalizedData)` must additionally filter via `useBacklogStore.getState().isItemUsed(id)`.
- **2026-06-16** — `user_id` columns store **guest/temp UUIDs directly with no strict FK** (see `shared_rankings.user_id UUID` + RLS `user_id IS NULL OR user_id = auth.uid()`). `useTempUser` mints a plain UUID in localStorage. `/api/lists/create-with-user` already inserts a provided `body.user_id` as-is — no users-table row is required.
- **2026-06-16** — `EnrichedItem` (studio) now carries a stable client `uid`; use `getStudioItemId(item)` (in `src/types/studio.ts`) for both React keys and dnd-kit sortable ids. Never key studio item lists on `title`.
- **2026-06-16** — TypeScript baseline = **53 pre-existing errors** (`tsc --noEmit`). Regression gate for any wave.

## Conventions enforced
- **2026-06-16** — Cross-store access that risks a circular import uses the `require('@/stores/backlog-store').useBacklogStore` accessor pattern (grid-store does this; session-store now follows it). Prefer this over a static import when touching store↔store edges.
- **2026-06-16** — Atomic per-finding commits with a `Refs: docs/harness/<scan>/<context>.md finding #N` trailer; scan artifacts committed under `docs/harness/`.

## Anti-patterns to avoid
- **2026-06-16** — Hardcoded fixed-size tables driven by a caller-controlled count (e.g. pyramid weights `[1,2,3,4,5]` vs `tierCount` up to 10) → `undefined`→NaN at the tail. Generate from the count.
- **2026-06-16** — Compound early-return guards that subsume a later branch (`if (a || !b) return` before a branch handling `!b`) silently make that branch dead code.
- **2026-06-16** — Keying React lists / dnd-kit sortables on user-editable, non-unique fields (titles) → duplicate keys, wrong-card removal, wrong-item reorder.
- **2026-06-16** — Throwing inside a `setTimeout`/`rAF` callback after setting an in-flight flag strands the flag. Wrap deferred work in try/finally.
- **2026-06-16** — "Built-but-unwired" is this codebase's dominant defect theme (~22 of 190 scan findings): shipped features with zero consumers (comparison engine, OG `/api/og/[code]` route, collection toolbar filters, collections CRUD, award Share, clone API, magnetic-snap hook, MiniTrajectoryChart, RankingProgressLayer, DebatePanel, ImageFallback, Save Draft). When adding a feature, grep for its consumer before assuming it works.

## Tooling notes
- **2026-06-16** — Test runner is **Playwright e2e only** (`npm run test:e2e`) — no vitest/unit runner. e2e needs browsers + a running app, so it's not a cheap per-wave gate.
- **2026-06-16** — `npx eslint` / `next lint` currently **fails to start**: `eslint.config.mjs` imports `eslint-plugin-storybook` which is not installed. Lint gate unavailable until that dep is restored.

## Open follow-ups (from the 2026-06-16 combined UI+Bug scan, Wave 4)
Wave 4 (silent failures / success theater) closed 5: sync DELETE_SESSION false-success (in-band Supabase error ignored → dropped offline op = data loss), activity feed demo-fabrication on real errors, activity timeline error state, share preview-capture error surfacing, and the client external-signal abort-listener leak.
- New anti-pattern: **in-band error channels (supabase-js `{data,error}`) pass a try/catch silently** — always destructure and check `error`, or a failed write reports success. Grep for `await supabase.from(...).(delete|update|insert|upsert)(` without a `{ error }` check.
- New anti-pattern: **a fallback that fires on every failure becomes a lie** — demo/placeholder data is OK for one-shot "feature absent" (404) but never on transient errors in a poll loop.
- Cumulative Waves 1–4: 19 findings closed, TS held at 53, 0 regressions.

## Open follow-ups (from the 2026-06-16 combined UI+Bug scan, Wave 3)
Wave 3 (remaining crash/data criticals) closed 4: offline stranded-ops revert, interest-decay top-preservation, atomic mobile swipe-to-rank (`grid-store.assignToNextOpenSlot`), and collapsing the duplicate `grid-store.handleDragEnd` engine into the single DragOperationRouter (−125 LOC).
- **Critical tally: 10/16 closed** (Wave 1: 6, Wave 3: 4). Remaining: 4 security (gated), OG-route-404 (T2), page-transition a11y (T5).
- New structural fact: **`grid-store.handleDragEnd` no longer reimplements assign — it delegates to `getGridDragRouter().handleDragEnd(event, get().getStoreContext())`.** The router (src/lib/dnd/operations) is the single drag-end engine; grid-store owns grid state + atomic placement (`assignItemToGrid`, `moveGridItem`, `assignToNextOpenSlot`).
- Tidy-up follow-up: removing the duplicate engine left `getValidationAuthority`/`logValidationFailure`/ID-parse helpers possibly unused in grid-store — prune once lint is restored.

## Open follow-ups (from the 2026-06-16 combined UI+Bug scan, Wave 2)
Wave 2 (built-but-unwired) closed 4 high findings: template rating click-through, branded ImageFallback wiring, Award Share button, collections list-removal + ordering source-of-truth. **Deferred** (architectural / needs decision — see `docs/harness/followups-2026-06-16.md`): collection toolbar filters → grid (shared filter state + FilterEngine across 4+ files); collections drag-reorder + Add-List picker (no DndContext / no picker exists); comparison-engine wire-or-delete (product call); clone-API wiring (bundle with security wave — unauth IDOR).
- New anti-pattern: **optional callback prop = silent dead feature** — a child gating an affordance on an optional callback the parent forgets to pass compiles clean but ships an inert control (Award Share, collections CRUD). Audit these when a feature "doesn't appear."

## Open follow-ups (from the 2026-06-16 combined UI+Bug scan, Wave 1)
Full triage: `docs/harness/ui-bug-combined-2026-06-16/INDEX.md` (190 findings). Wave 1 closed 6 of 16 criticals. Still open:
- **Security (gated, high-risk):** mock API-key validation = total `/api/v1/*` auth bypass (`public-api.ts:233`); agent-bridge task API no auth + unbounded store (`agent-bridge/tasks/route.ts`); bookmarks IDOR (`api/bookmarks/route.ts`); merge-guest IDOR (`api/auth/merge-guest/route.ts`); unescaped OG/embed injection.
- **Crash/data criticals not in Wave 1:** offline `processQueue` strands `in_progress` ops (`OfflinePersistence.ts:328`); mobile swipe double-place (`MobileBacklogPanel.tsx:204`); divergent `handleDragEnd` engines (`grid-store.ts:872` vs `grid-plans.ts:182`); personalization interest-wipe (`InterestTracker.ts:181`); sharing OG route 404 (`/api/og/[code]` missing); page-transition reduced-motion a11y (`page-transition.tsx:57`).
- **Themes:** T2 built-but-unwired (~22), T3 non-atomic counters, T4 NaN math, T5 reduced-motion/a11y, T7 silent failures, T8 wrong-data-source, T9 timezone, T10 dark-mode/theming, T11 mobile, T12 leaks.
