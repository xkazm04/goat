# Combined UI+Bug Fix Wave 17 — Scattered sweep #3

> 4 commits, 5 findings closed (2 high + 1 high + 1 medium + 1 low) across untouched contexts.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave17-sweep3` (off wave 16).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `d336f61` | list-creation #3 + #4 — double-submit + stuck creationStep | high + medium | `ListCreateButton.tsx` |
| 2 | `58fed7c` | challenges #2 — streak bonus not in leaderboard | high | `challenges/[id]/submit/route.ts` |
| 3 | `f640d06` | studio #5 — Save Draft drops listSize/allowCustomItems | low | `studio-store.ts` |
| 4 | `0a9b33b` | wiki-images #1 — hook reads store imperatively (image doesn't paint) | high | `use-progressive-wiki-image.ts` |

## What was fixed

1. **ListCreateButton double-submit + stuck button (high+medium).** `handleCreate` guarded only on `isButtonDisabled` (derived from async state set inside `onProgress`), so a fast double-click created two lists; added a synchronous `isCreatingRef`. And only the error branch reset `creationStep`, so a success whose navigation was blocked left the button permanently disabled — the flow is now in `try/finally` that clears the ref + `creationStep` on every exit.

2. **Streak bonus ignored by leaderboard (high).** The submit route returned `finalScore = base + bonus` but ranked the user by the stored *base* score (leaderboard sorts on `submission.score`), so "your score: 160" ranked as 80. `submitRanking` returns the stored object reference, so the bonused score is now written back before `getLeaderboard` — rank, response, and display agree.

3. **Save Draft data loss (low).** The persist `partialize` omitted `listSize` and `allowCustomItems`, so a returning user silently lost those choices despite the "return later" promise. Both added to the persisted set.

4. **Wiki image never paints (high).** `useProgressiveWikiImage` selected the store's getter functions (stable refs) and read `getImage(itemTitle)` imperatively, so a later `fetchImage` write into `state.images` never re-rendered the component (it painted only by accident via the local `isFetching` toggle, and not at all for consumers that don't auto-fetch or share a title). It now subscribes to the derived values (`state.images.get(title)`, `state.fetching.has(title)`), so store writes re-render deterministically.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 27)

27. **Subscribe to data, not getters; compute-then-display must agree with compute-then-rank.** Selecting a Zustand getter/action (stable ref) and calling it imperatively in render defeats the store's subscription — select the derived value so mutations re-render. And when a value shown to the user (bonused score) is computed separately from the value used for ranking/sorting (stored base score), the two silently diverge — write the displayed value back to the source of truth, or don't show it. (Plus the recurring sync-ref double-submit + finally-cleanup shapes.)

## What remains

- Diminishing low-sev tail: challenges streak timezone/DST math, faceted hierarchical depth, ai-item gemini schema, achievement looping-animation motion gating, blueprint usage_count GET-decouple; plus the decision/infra deferrals (comparison engine, collections reorder/picker, light mode, RLS/api_keys) and the authored-but-unapplied migration.
- Cumulative Waves 1–17: 73 functional findings addressed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
