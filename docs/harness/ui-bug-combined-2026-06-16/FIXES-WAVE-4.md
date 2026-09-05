# Combined UI+Bug Fix Wave 4 — Silent failures / success theater (T7)

> 5 commits, 5 findings closed (1 critical-grade data loss + 4 high/medium).
> Baseline preserved: TypeScript 53 → 53 (zero regression). Tests: Playwright e2e only (not run). Lint: still blocked (`eslint-plugin-storybook` missing).
> Branch: `vibeman/ui-bug-wave4` (off `vibeman/ui-bug-wave3`).

## Commits

| # | Commit | Finding closed | Severity | Files |
|---|---|---|---|---|
| 1 | `7276bfe` | api-client-data-sync #4 — sync DELETE_SESSION false-success | high (data loss) | `api/sync/route.ts` |
| 2 | `37da54e` | activity #1 — feed fabricates demo data on real errors | high | `activity-store.ts` |
| 3 | `2647e00` | activity #4 — timeline shows empty state on error | medium | `ActivityTimeline.tsx` |
| 4 | `a3fa662` | result-image #3 — preview-capture failure swallowed | high | `ShareModal.tsx` |
| 5 | `fa0730a` | api-client-data-sync #5 — external-signal abort listener leak | medium | `api/client.ts` |

## What was fixed

1. **Sync false-success (silent data loss).** `processDeleteSession` awaited `supabase…delete()` under only a try/catch, but supabase-js returns errors *in-band* (doesn't throw) — so a failed delete (RLS/transient) returned `success:true`. The offline queue treats `success:true` as committed and drops the op locally → permanent loss. Now destructures `{error}` and returns `success:false` on a real failure.

2. **Activity feed fabricated fake data.** The fetch catch injected a random `generateDemoActivities()` entry with a now-timestamp on *every* 10s poll during any backend hiccup, and cleared the error — the feed showed events that never happened, with no outage signal, crowding out real ones. Real errors now set the error state and stop fabricating; demo data is reserved for the 404 "feature absent" path, which now seeds only once instead of every poll.

3. **Timeline error = empty state.** `ActivityTimeline`'s fetch had an empty catch and ignored non-ok responses, so a backend failure rendered the cheerful "No activity yet" — indistinguishable from a truly empty history, no retry. Added an `error` state set on non-ok/throw and a distinct error block with a Retry button; the empty state is now reserved for a successful zero-event response.

4. **Share preview-capture swallowed.** `handleGeneratePreview`'s catch only `console.error`ed, so a snapdom failure (offline import, tainted cross-origin image, CSP) just bounced the button back to "Generate Preview" with no explanation — a dead-end on step 1. Now sets the existing `shareError` state (cleared per attempt) and the theme step renders the existing red error panel.

5. **Abort-listener leak.** `ApiClient.request()` added an anonymous `'abort'` listener to a caller-supplied `options.signal` and never removed it; on a reused/long-lived signal every request accumulated a listener (each pinning a per-request controller + timeout) — slow leak + O(n) fan-out. Now a named handler registered `{ once: true }` and removed in a `finally` on every exit path.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit. (Two `@zumer/snapdom` "cannot find module" errors in ShareModal are pre-existing in the 53 baseline — the package ships without types — and sit on import lines untouched by this wave.)

## Patterns established (catalogue items 13–14)

13. **In-band error channels masquerade as success.** Clients that return errors as a value (supabase-js `{data, error}`) rather than throwing will pass a try/catch silently — every such call must destructure and check `error`, or a failure is reported as success (here: dropped offline ops = data loss).
14. **A fallback that fires on *every* failure becomes a lie.** Demo/placeholder data is fine for "feature absent" (one-shot, e.g. 404) but must never be injected on transient errors on a poll loop — it fabricates a believable stream of fake state and hides the outage. Distinguish "absent" from "failing", and gate demo behind an explicit one-shot flag.

## What remains

- **Security wave (gated):** 4 IDOR/auth criticals — the only remaining *exploitable* criticals.
- Themes: T4 NaN math, T5 a11y/reduced-motion, T3 non-atomic counters, T8 wrong-data-source, T10 theming, T11 mobile, T12 leaks — plus the deferred Wave-2 items (`followups-2026-06-16.md`).
- Cumulative across Waves 1–4: 19 findings closed (10/16 criticals + 9 high/medium), 0 regressions, TS held at 53 throughout.
