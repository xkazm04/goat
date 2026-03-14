---
phase: 01-core-ranking-flow
plan: 01
subsystem: state-management
tags: [zustand, drag-drop, hydration, lru-cache, playwright, e2e]

# Dependency graph
requires: []
provides:
  - Working item loading pipeline (match-store triggers backlog loading)
  - Session store hydration gate (_hydrated flag)
  - Grid-to-session sync gated on hydration readiness
  - LRU eviction for listGridCache (max 15 entries)
  - Wave 0 E2E test stubs for FLOW-03, FLOW-05, FLOW-07
  - Production guard on match-test page
  - Dev-only guard on window.__backlogStore
affects: [01-02, 02-auth-migration, 03-data-population]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hydration gate pattern: _hydrated flag in persisted stores, checked before cross-store sync"
    - "LRU cache eviction: separate order array + pure eviction function"
    - "syncGridToSession helper centralizes all grid-to-session sync with hydration check"

key-files:
  created:
    - e2e/ranking-completion.spec.ts
    - e2e/session-persistence.spec.ts
    - e2e/list-search.spec.ts
  modified:
    - src/stores/session-store.ts
    - src/stores/grid-store.ts
    - src/stores/match-store.ts
    - src/stores/backlog/store.ts
    - src/app/match-test/page.tsx

key-decisions:
  - "Hydration gate uses skip-not-queue pattern: if session not hydrated, sync is skipped rather than queued, because next user action will catch up"
  - "LRU eviction uses separate order array (listGridCacheOrder) rather than timestamps for O(1) eviction"
  - "Deprecated type re-exports in ranked-inventory.ts and composition-to-api.ts left in place due to active importers in consensus-store, CommandPalette, etc."

patterns-established:
  - "Hydration gate: check _hydrated before cross-store writes in persisted stores"
  - "syncGridToSession: single entry point for all grid-to-session sync"

requirements-completed: [FLOW-01, FLOW-02, FLOW-05]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 1 Plan 01: Core Store Fixes Summary

**Fixed broken backlog item loading in match-store, added session hydration gate to prevent sync data loss, implemented LRU eviction (max 15) for listGridCache, created 10 E2E test stubs across 3 files**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T20:15:36Z
- **Completed:** 2026-03-14T20:23:36Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Fixed root cause of broken item loading: match-store.initializeMatchSession now triggers backlog-store.initializeGroups when groups are empty
- Added _hydrated flag to session-store with onRehydrateStorage callback, gating all grid-to-session syncs to prevent overwriting persisted data during hydration
- Implemented LRU eviction for listGridCache with MAX_CACHE_SIZE=15, preventing localStorage quota exhaustion
- Created 10 Playwright E2E test stubs across 3 files (ranking-completion, session-persistence, list-search)
- Added production guard on match-test page (notFound) and dev-only guard on window.__backlogStore

## Task Commits

Each task was committed atomically:

1. **Task 0: Create Wave 0 E2E test stubs** - `1a1598d` (test)
2. **Task 1: Fix broken item loading + hydration gate** - `d5abd61` (fix)
3. **Task 2: LRU eviction + legacy cleanup** - `9d95bcb` (feat)

## Files Created/Modified
- `e2e/ranking-completion.spec.ts` - 4 skipped tests for FLOW-03 completion modal
- `e2e/session-persistence.spec.ts` - 3 skipped tests for FLOW-05 session persistence
- `e2e/list-search.spec.ts` - 3 skipped tests for FLOW-07 list search
- `src/stores/session-store.ts` - Added _hydrated flag, onRehydrateStorage, useSessionHydrated selector
- `src/stores/grid-store.ts` - Added syncGridToSession helper, LRU eviction (evictOldestCacheEntries, touchLRUOrder, listGridCacheOrder)
- `src/stores/match-store.ts` - initializeMatchSession now triggers backlog loading
- `src/stores/backlog/store.ts` - Wrapped window.__backlogStore in dev-only guard
- `src/app/match-test/page.tsx` - Added notFound() production guard

## Decisions Made
- Hydration gate uses skip-not-queue: if session not hydrated, sync is skipped (next action catches up)
- LRU uses order array rather than timestamps for O(1) eviction
- Deprecated type re-exports left in place (consensus-store, CommandPalette actively import them)
- match-store imports backlog-store dynamically (async import) to avoid circular dependencies

## Deviations from Plan

None - plan executed exactly as written. Deprecated type cleanup was explicitly conditional ("only clean up if it does not break the build") and was skipped due to active importers.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Core store fixes in place: item loading, hydration gate, LRU cache
- Plan 01-02 can build on this to implement completion modal and share flow
- E2E stubs ready for flesh-out in later plans

## Self-Check: PASSED

All 8 files found. All 3 commits found. All 6 must-have artifacts verified.

---
*Phase: 01-core-ranking-flow*
*Completed: 2026-03-14*
