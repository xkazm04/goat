# Combined UI+Bug Fix Wave 19 — Low-severity tail

> 5 commits closing the diminishing low-severity tail carried across waves 13–18.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave19-tail` (off wave 18).

These were the loose ends left after the themed waves: each is small, isolated, and
in a context not otherwise touched. None blocked on infra/creds (unlike the security
+ migration deferrals), so they were all closeable in one sweep.

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `137ecb4` | templates-blueprints #3 — usage_count GET-decouple | medium | `blueprints/[slugOrId]/route.ts`, new `…/view/route.ts`, `use-blueprints.ts`, `blueprint/[slug]/page.tsx` |
| 2 | `91c3c6f` | ai-item-generation #1 — find-youtube Gemini schema | high | `studio/find-youtube/route.ts` |
| 3 | `285b501` | achievements-awards #3 — looping-animation motion gating | medium | `AchievementReveal.tsx`, `AchievementCard.tsx` |
| 4 | `b7de790` | faceted-search #4 — hierarchical depth | medium | `faceted-search/components/FacetPanel.tsx` |
| 5 | `531ad30` | challenges-streaks #1 — streak timezone/DST math | high | `StreakTracker.ts`, `challenges/[id]/submit/route.ts`, `challenges/streaks/route.ts` |

## What was fixed

1. **Blueprint view-count decoupled from GET (medium).** The detail GET incremented
   `usage_count` on every call, so React Query refetches/remounts and the clone +
   highlighted-template flows (which also read the blueprint) inflated a single real
   view. The atomic-increment half landed in wave 16; this closes the decouple half:
   GET is now side-effect-free, a dedicated `POST …/view` route does the atomic RPC
   increment (with the read-modify-write fallback for pre-migration deploys), and
   `trackBlueprintView()` fires once per deep-link visit, ref-guarded against
   StrictMode double-mount + refetch.

2. **find-youtube Gemini schema + fence-stripping (high).** The route requested
   `responseMimeType: 'application/json'` but passed no `responseJsonSchema` (unlike
   the generate route), and with the googleSearch tool attached Gemini frequently
   fences its JSON. `JSON.parse` then threw and the regex fallback only recovered a
   bare `watch?v=` URL, so a valid-but-fenced answer became a false "no video found".
   Added the response schema + a leading/trailing code-fence strip; kept the regex as
   a last resort.

3. **Achievement looping animations gated (medium, WCAG 2.3.3).** The confetti burst
   was gated in wave 15; the *infinitely looping* ambient motion (glow-ring pulse,
   trophy scale, the 3 pulsing rings, the toast icon pulse, AchievementCard sparkles +
   icon pulse) was not. All now gate on `useMotionCapabilities().allowAmbient`
   (full-tier only): under reduced/minimal motion the loops resolve to a static state
   and the pure-decoration rings/sparkles aren't rendered. The "Generating…" spinner
   in AchievementShareModal is intentionally left (functional loading indicator).

4. **Faceted hierarchical nodes selectable + expandable at any depth (medium).** The
   recursive `HierarchicalNodeItem` hardcoded `isExpanded={false}` /
   `onToggleExpand={() => {}}` and dropped `onDrillDown` at the recursion boundary, so
   child rows couldn't expand/drill and a 3rd level was unreachable. Worse, every node
   selected by its **bare leaf value** while the index keys child nodes by
   `parent/child` (FacetExtractor), so selecting a subcategory produced a selection
   that never matched the index. Now the shared `expandedNodes` set + `onToggleNode` +
   `onSelectValue` + `onDrillDown` are threaded through the recursion keyed by the full
   accumulated path; selection/drill-down use that full path. Top-level behavior is
   unchanged (path=[] → key == bare value).

5. **Streak day math is timezone-aware + DST-safe (high).** `getDateString` used
   `toISOString()` (always the UTC day), so a "daily" streak — a local-time concept —
   broke/double-counted for non-UTC users; and "yesterday" was now-minus-24h, which
   lands on the wrong day across DST (a local day can be 23h/25h). `getDateString` now
   computes the calendar day in the user's IANA zone via `Intl.DateTimeFormat`
   (defaults to UTC, falls back to UTC on a bad zone), and `getPreviousDateString`
   does DST-immune calendar subtraction on the date-only value. `recordActivity` /
   `isStreakAtRisk` accept an optional `timeZone`; the submit + streaks POST routes
   read it from the body so a client can send its resolved zone.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked at 53 before commit; no errors in any touched file.

## Patterns established (catalogue items 29–30)

29. **Side-effecting reads inflate counters.** A counter mutated inside a detail GET
    over-counts on every refetch/remount and on sibling flows that read the same
    resource. Keep GET idempotent; move "I was viewed/used" to a dedicated fire-once
    write, ref-guarded on the client against StrictMode + refetch.

30. **Local-time concepts need the client's zone, and "yesterday" is calendar math,
    not arithmetic.** A "daily" anything computed from `toISOString()` is UTC, not the
    user's day. Pass the IANA zone and format with `Intl`. Compute the previous day by
    subtracting a calendar day from a date-only value (DST-immune), never by
    subtracting 24h of milliseconds. (Plus: pass an LLM a `responseJsonSchema` AND
    strip fences — `responseMimeType` alone doesn't guarantee clean JSON once a tool
    is attached; and gate *looping* ambient motion, not just one-shot celebrations, on
    the reduced-motion tier.)

## What remains

- **Infra/security (still open, need tooling/creds):** RLS + `api_keys` table +
  guest-token hardening; the authored-but-unapplied counter-RPC migration
  `20260616000000_add_increment_counter_rpcs.sql` (blocked: no supabase CLI / psql /
  connection string).
- The challenges submit endpoint still has no client caller (built-but-unwired) — the
  streak fix is correct-by-construction whenever a client (or external caller) sends
  its zone.
- **Cumulative Waves 1–19:** 81 functional findings addressed + 4 security mitigated +
  4 decisions closed; TS held at 53 throughout; 0 regressions.
