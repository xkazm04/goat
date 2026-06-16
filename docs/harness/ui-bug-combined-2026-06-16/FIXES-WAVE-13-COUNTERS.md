# Combined UI+Bug Fix Wave 13 — Non-atomic counters / concurrency (T3)

> 3 commits, 3 findings closed + 1 deferred (needs a migration). All self-contained.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave13-counters` (off wave 12).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `d5f383f` | sharing #2 — non-atomic view/challenge counters | high | `share/[code]/route.ts`, `share/route.ts` |
| 2 | `adb24b1` | bookmarks #4 — optimistic add desync on alreadyExists | medium | `use-bookmarks.ts` |
| 3 | `81a0231` | consensus #5 — debate quick-reply double-submit | medium | `DebatePanel.tsx` |

## What was fixed

1. **Atomic share counters (high).** `view_count` (share/[code] GET + share GET) and `challenge_count` (share/[code] POST) were incremented with a JS read-modify-write (`update view_count = data.view_count + 1`), so concurrent requests both read N and wrote N+1, silently losing increments — systematically under-counting the social-proof stats the more viral a ranking got. Switched to the **existing** atomic `increment_share_view_count` / `increment_share_challenge_count` Postgres RPCs (no migration needed). *(The `fork_count` increment has no RPC — deferred.)*

2. **Bookmark optimistic desync (medium).** The add-bookmark `onSuccess` always toasted "Saved / List bookmarked!" even when the POST returned `{ alreadyExists: true }` (200; e.g. already bookmarked in another tab) — a misleading confirmation for a no-op. `onSuccess` now branches on `data.alreadyExists` ("Already saved"); the optimistic temp row still reconciles via `onSettled` invalidation.

3. **Debate quick-reply double-submit (medium).** Quick-reply buttons called `onReply` directly and the typed submit guarded only on `isLoading` (React state, set a tick after the call), so two fast clicks — or a quick-reply alongside a typed submit — could both pass and queue duplicate turns + concurrent Gemini calls (out-of-order AI responses clobbering scores). Added a synchronous `submittingRef` shared by both submit paths, reset when `isLoading` clears.

## Deferred (documented in `followups-2026-06-16.md` #7)

- **share fork_count** — needs an `increment_share_fork_count` RPC (migration) mirroring the view/challenge functions.
- **blueprint usage_count** (templates #3) — incremented via read-modify-write on every detail GET (non-atomic + double-counts on React Query refetch). Proper fix needs an atomic RPC + a dedicated fire-once tracking call; removing the GET increment would freeze the `sort=popular` signal, so not done unilaterally.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 23)

23. **Counters need atomic increments; submits need synchronous guards.** A `read value → value+1 → write` in app code loses concurrent updates (use a DB `SET x = x + 1` / RPC). A side-effecting increment on a GET double-counts under cache refetch — keep GETs side-effect-free and track via a dedicated call. And re-entrancy must be guarded **synchronously** (a ref), not via async React state, or a fast double-click slips through before the state flips.

## What remains

- Deferred items: fork_count + blueprint usage_count RPCs (migrations), Wave-2 architectural items, StatsCard color, focus-trap, thumbnails-order (schema), light-mode palette, duplicate MobileFacetDrawer.
- Cumulative Waves 1–13: 56 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
