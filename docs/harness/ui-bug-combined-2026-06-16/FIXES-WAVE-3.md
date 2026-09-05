# Combined UI+Bug Fix Wave 3 — Remaining crash/data criticals

> 4 commits, 4 critical findings closed.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Tests: Playwright e2e only (not run). Lint: still blocked (`eslint-plugin-storybook` missing).
> Branch: `vibeman/ui-bug-wave3` (off `vibeman/ui-bug-wave2`). Net −33 LOC (duplicate drag engine removed).

## Commits

| # | Commit | Finding closed | Severity | Files |
|---|---|---|---|---|
| 1 | `47f77a0` | offline-persistence #1 — stranded in_progress ops | critical | `OfflinePersistence.ts` |
| 2 | `f2b8edc` | personalization #1 — interest decay wipes returning users | critical | `InterestTracker.ts` |
| 3 | `fb48147` | backlog-panel #1 — mobile swipe double-place / lost item | critical | `grid-store.ts`, `MobileBacklogPanel.tsx` |
| 4 | `b7fa886` | match-grid-drag-drop #1 — divergent drag-end engines | critical | `grid-store.ts` |

## What was fixed

1. **Offline stranded ops.** `processQueue` flipped pending ops to `in_progress` then awaited `fetch('/api/sync')`. A *thrown* fetch (network drop mid-sync — the common offline failure) hit a catch that only logged, leaving ops `in_progress` forever; `getPendingOperations` filters on `pending`, so they became invisible to every future sync = silent loss of unsynced edits. The catch now re-reads ops and reverts any still `in_progress` back to `pending` (retryCount+1) + notifies, so they retry when connectivity returns.

2. **Interest-decay wipe.** `applyInterestDecay` filtered out every interest below `minScore`; after a long gap all interests decay under the floor and the array empties. Personalization eligibility is gated on `interests.length`, so a returning loyal user was silently demoted to the generic "new user" path. Decay now always preserves the single highest-scoring interest, floored to `minScore`.

3. **Mobile swipe double-place / phantom success.** The swipe path hand-rolled slot-scan + `assignItemToGrid` + `markItemAsUsed` in the component, bypassing the desktop path's lock. Critically, `assignItemToGrid` silently no-ops on a filled slot, but the handler marked the item used regardless — so a contested slot removed the item from the backlog without placing it (lost item; the card animated away as accepted). Added an atomic `grid-store.assignToNextOpenSlot` action (lock → fresh slot read → assign → verify the slot became matched → only then mark used → return placed position or null); `MobileBacklogPanel` delegates and only confirms the swipe on a real placement.

4. **Divergent drag-end engines.** `grid-store.handleDragEnd` was a second, fully-implemented assign engine that *rejected* occupied-slot drops, while the live router path (`SimpleMatchGrid → getGridDragRouter().handleDragEnd`) *displaces* the occupant. Behavior depended on which path a caller invoked (verified: no live caller invokes the store engine, but the doc comment told components to). The store's `handleDragEnd` now delegates to the same router via the store's own `getStoreContext()` — one assign algorithm, one displacement rule. Ownership doc comment corrected (router owns drag-end; store owns grid state + atomic placement). −125 LOC of duplicate logic.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit; count never left 53. Note: removing the duplicate drag engine leaves a few helper imports (`getValidationAuthority`, `logValidationFailure`, ID-parse utils) now unused in grid-store; left in place (no tsc error — `noUnusedLocals` off — and removing risks touching something still referenced). A tidy-up pass could prune them once lint is restored.

## Patterns established (catalogue items 10–12)

10. **Thrown async in a status-machine strands the in-flight state.** When code flips records to an intermediate status before an `await` that can throw, the catch MUST revert them (or a finally re-reads and reverts) — otherwise they're invisible to any query that filters on the terminal/pending statuses. (Offline queue.)
11. **Decay/eviction with a hard floor and no ANCHOR can zero out a population.** Time-decay filters that gate a feature on "any survivors" must preserve at least the strongest signal, or a long absence silently disables the feature for exactly the most-engaged users. (Interest decay.)
12. **A silent no-op + unconditional follow-up = lost data.** When a mutation can silently no-op (filled-slot guard) and the caller performs an irreversible follow-up (mark used / animate away) regardless of success, the two desync into data loss. Return success and gate the follow-up on it; do it inside one atomic, fresh-state action. (Swipe assign.)

## What remains

- **4 security criticals (gated):** mock API key, agent-bridge no-auth, bookmarks IDOR, merge-guest IDOR (+ clone-route auth, OG/embed injection). Needs explicit approval — auth/RLS/API-key infra.
- **All 16 criticals now triaged: 10 closed (Wave 1: 6, Wave 3: 4), 4 security gated, 2 remaining are the OG-route-404 and page-transition-a11y** — both already grouped under later themed waves (T2 unwired / T5 a11y).
- Themes T3–T12 (counters, NaN math, reduced-motion/a11y, silent failures, wrong-source, timezone, theming, mobile, leaks) plus the deferred Wave-2 items (`followups-2026-06-16.md`).
