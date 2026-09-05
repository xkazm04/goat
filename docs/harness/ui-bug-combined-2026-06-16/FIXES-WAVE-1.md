# Combined UI+Bug Fix Wave 1 — Data-integrity & crash criticals

> 6 commits, 6 critical findings closed.
> Baseline preserved: TypeScript 53 errors → 53 errors (zero regression). Test runner: Playwright e2e only (not run this wave). Lint: blocked by a pre-existing missing dep (`eslint-plugin-storybook`).
> Branch: `vibeman/ui-bug-wave1` (off `main`).

## Commits

| # | Commit | Finding closed | Severity | Files |
|---|---|---|---|---|
| 1 | `87e17ae` | ranking-engine-tiers #1 — pyramid tier NaN | critical | `RankingEngine.ts` |
| 2 | `66cb09b` | criteria-editor-scoring-config #1 — custom criteria dropped | critical | `studio-store.ts` |
| 3 | `0e1e905` | tournament-bracket-mode #1 — empty bracket hangs loader | critical | `BracketView.tsx`, `BracketSetup.tsx` |
| 4 | `4e894d8` | studio-authoring-workspace #1 — duplicate-title key collision | critical | `types/studio.ts`, `studio-store.ts`, `StudioItemsView.tsx`, `StudioItemCard.tsx` |
| 5 | `7d51aeb` | list-creation-composition #1 — orphaned `user_id` | critical | `list-intent-transformers.ts` |
| 6 | `7424426` | match-session-keyboard-control #1 — quick-assign re-picks placed item | critical | `session-store.ts`, `match-store.ts` |

## What was fixed

1. **Pyramid tier NaN.** `calculateTierMappings` hardcoded a 5-element pyramid weight array, so any `tierCount > 5` (the app ships 6- and 9-tier presets) read an undefined weight → NaN tier boundaries → the 6th tier and all tail-ranked items silently vanished from the tier view. Weights are now generated from `tierCount` (preserving the 1..n progression) and `tierSize` is clamped to a finite ≥1.

2. **Custom criteria dropped at publish.** `getCriteriaConfig()` gated its early `return null` on `!selectedProfileId`, which is *always* true in custom mode (only the preset path sets that id) — so the custom branch was dead code and every user-authored criteria set published as `criteria_config: null`. The guard now returns null only for mode `'none'`; preset resolution is guarded on `selectedProfileId` independently.

3. **Empty bracket hangs loader.** `handleSetupStart` flipped `isInitializing=true` then seeded the bracket inside a `setTimeout`; with 0 items `seedBracket` throws, and the uncaught throw inside the timer meant `setIsInitializing(false)` never ran — the branded loader spun forever. The Start button is now disabled (with a "need at least 2 items" hint) below 2 items, the handler bails early, and the deferred init is wrapped in `try/finally`.

4. **Studio duplicate-title key collision.** Both the React key (`item.title`) and the dnd-kit sortable id (`item-${db_item_id||title}`) keyed on title, while manual add / inline edit / template seed never dedup titles. Duplicates produced duplicate React keys (card vanish/flicker, wrong-card removal) and duplicate sortable ids (`indexOf` returns the first match → dragging the 2nd duplicate reorders the 1st). `EnrichedItem` now carries a client `uid` stamped at every creation site, and a shared `getStudioItemId()` derives both the key and the sortable id.

5. **Orphaned list `user_id`.** `listIntentToCreateRequest` folded the owner id only into a synthetic email and never set `user_id`, while the create route reads `body.user_id` → every list inserted `user_id: null` and never appeared in "My Lists". `CreateListRequest` now carries `user_id` and the transformer populates it; the route already inserts a provided id (matching how guest/temp UUIDs are stored elsewhere — no schema/user-creation change needed).

6. **Quick-assign re-picks placed item.** `getAvailableBacklogItems()` returned the full normalized set; the `used` flag is written to the backlog store on placement and never reconciled into the session's `normalizedData`, so "available" included already-placed items and `selectNextAvailableItem` re-selected index 0 (often the just-assigned item). It now filters out items the backlog store reports as used (via the same `require()` accessor grid-store uses) and advances relative to the cursor.

## Verification

| Gate | Before (B2 baseline) | After Wave 1 | Result |
|---|---|---|---|
| TypeScript (`tsc --noEmit`) | 53 errors | 53 errors | ✅ no regression |
| Tests (Playwright e2e) | not run | not run | n/a (e2e needs browsers + running app) |
| Lint (`next lint`) | n/a | blocked (`eslint-plugin-storybook` not installed) | ⚠️ pre-existing env gap |

Each fix was tsc-checked individually before commit; the full count never moved off 53.

## Patterns established (catalogue items 1–6)

1. **Caller-controlled count vs fixed-size literal** — when a config value (`tierCount`) drives iteration but the data table is a hardcoded literal, generate the table from the count. Fixed literals + caller-controlled bounds = `undefined`→NaN at the tail.
2. **Compound guard that subsumes a later branch** — `if (a || !b) return` placed before a branch that handles the `!b` case makes that branch dead code. Guard only the truly-terminal condition; gate the rest locally.
3. **Throwing inside a deferred callback** (`setTimeout`/`rAF`) strands any state flag set before it. Always wrap deferred work in `try/finally` that resets the in-flight flag, and guard the trigger.
4. **Title/label as identity** — never key React lists or dnd-kit sortables on user-editable, non-unique fields. Stamp a stable client `uid` at every creation site and derive all identities from one shared helper.
5. **Contract mismatch across a transformer boundary** — a client transformer that drops a field the server contract requires fails silently. Add the field to the request type and populate it where the value is in scope.
6. **Cross-store flag not reconciled** — when an authoritative flag lives in store A but a derived list is computed from store B's snapshot, the list goes stale. Read the flag from its owner (here via the codebase's `require()` accessor convention) at query time rather than trusting the stale copy.

## What remains (per INDEX themes)

- **T1 Security / trust boundaries (gated)** — 4 IDOR/auth criticals (mock API key, agent-bridge no-auth, bookmarks, merge-guest) + OG/embed injection. High risk/effort; needs explicit approval before a wave.
- **T2 Built-but-unwired (~22)** — OG route, comparison engine, collection toolbar filters, collections CRUD, award Share, clone API, etc.
- **T4 NaN math · T5 reduced-motion/a11y · T7 silent failures · T8 wrong-data-source · T3 counters · T9 timezone · T10 theming · T11 mobile · T12 leaks** — see INDEX "Suggested next-phase split".
- **Critical tally: 6 of 16 closed.** Remaining 10 criticals: Public API ×2 (auth bypass, agent-bridge), bookmarks IDOR, merge-guest IDOR, backlog mobile-swipe double-place, motion page-transition a11y, offline stranded ops, personalization interest-wipe, sharing OG route 404, drag-drop divergent engines.
