# Combined UI-Perfectionist + Bug-Hunter Scan — goat, 2026-06-16

> A single combined design+reliability audit (🎨 UI Perfectionist + 🐛 Bug Hunter, blended) over **all 38 contexts** of the goat ranking app.
> 38 parallel subagent runs, batched in 5 waves of ≤8. Exactly 5 highest-value findings per context (combined across both lenses).

---

## Totals

| | Critical | High | Medium | Low | **Total** |
|---|---:|---:|---:|---:|---:|
| Across 38 contexts | 16 | 86 | 78 | 10 | **190** |
| Share | 8.4% | 45.3% | 41.1% | 5.3% | 100% |

Verified two ways: sum of `> Total:` headers = 190; count of `**Severity**:` bullets = 190 (match).

---

## Per-context breakdown

Sorted by criticals desc, then highs, then total. Every context = exactly 5 findings.

| # | Context | Group | C | H | M | L | Report |
|---|---|---|---:|---:|---:|---:|---|
| 1 | Public API & SDK (v1) | Platform Infra | 2 | 2 | 0 | 1 | `public-api-sdk-v1.md` |
| 2 | Authentication & User Accounts | Platform Infra | 1 | 2 | 1 | 1 | `authentication-user-accounts.md` |
| 3 | Backlog & Match Collections Panel | Collection & Backlog | 1 | 2 | 2 | 0 | `backlog-match-collections-panel.md` |
| 4 | Bookmarks, Saved Lists & Collections | Lists & Discovery | 1 | 2 | 2 | 0 | `bookmarks-saved-lists-collections.md` |
| 5 | Criteria Editor & Scoring Config | Studio | 1 | 2 | 2 | 0 | `criteria-editor-scoring-config.md` |
| 6 | List Creation & Composition | Lists & Discovery | 1 | 2 | 2 | 0 | `list-creation-composition.md` |
| 7 | Match Grid & Drag-Drop | Match & Ranking | 1 | 2 | 1 | 1 | `match-grid-drag-drop.md` |
| 8 | Match Session & Keyboard Control | Match & Ranking | 1 | 2 | 2 | 0 | `match-session-keyboard-control.md` |
| 9 | Motion & Gestures | Shared UI | 1 | 2 | 2 | 0 | `motion-gestures.md` |
| 10 | Personalization & Recommendations | Personalization | 1 | 2 | 2 | 0 | `personalization-recommendations.md` |
| 11 | Ranking Engine & Tiers | Match & Ranking | 1 | 2 | 2 | 0 | `ranking-engine-tiers.md` |
| 12 | Sharing & Social Embeds | Social | 1 | 2 | 2 | 0 | `sharing-social-embeds.md` |
| 13 | Studio Authoring Workspace | Studio | 1 | 2 | 1 | 1 | `studio-authoring-workspace.md` |
| 14 | Offline & Persistence | Platform Infra | 1 | 1 | 3 | 0 | `offline-persistence.md` |
| 15 | Tournament Bracket Mode | Match & Ranking | 1 | 1 | 2 | 1 | `tournament-bracket-mode.md` |
| 16 | Activity & Engagement Tracking | Personalization | 0 | 3 | 2 | 0 | `activity-engagement-tracking.md` |
| 17 | AI Item Generation | Studio | 0 | 3 | 2 | 0 | `ai-item-generation.md` |
| 18 | API Client & Data Sync | Platform Infra | 0 | 3 | 2 | 0 | `api-client-data-sync.md` |
| 19 | Challenges & Streaks | Social | 0 | 3 | 2 | 0 | `challenges-streaks.md` |
| 20 | Faceted Search & Filters | Collection & Backlog | 0 | 3 | 2 | 0 | `faceted-search-filters.md` |
| 21 | Item Enrichment Pipeline | Item Data | 0 | 3 | 2 | 0 | `item-enrichment-pipeline.md` |
| 22 | Item Inspector & Details | Collection & Backlog | 0 | 3 | 2 | 0 | `item-inspector-details.md` |
| 23 | Landing & List Browsing | Lists & Discovery | 0 | 3 | 2 | 0 | `landing-list-browsing.md` |
| 24 | List Preview & Prefetch | Lists & Discovery | 0 | 3 | 2 | 0 | `list-preview-prefetch.md` |
| 25 | Result Image & Share Card | Match & Ranking | 0 | 3 | 2 | 0 | `result-image-share-card.md` |
| 26 | Search & Command Palette | Lists & Discovery | 0 | 3 | 2 | 0 | `search-command-palette.md` |
| 27 | Top Groups & Backlog Source | Item Data | 0 | 3 | 2 | 0 | `top-groups-backlog-source.md` |
| 28 | Achievements & Awards | Social | 0 | 2 | 2 | 1 | `achievements-awards.md` |
| 29 | App Shell, Providers & Errors | Platform Infra | 0 | 2 | 2 | 1 | `app-shell-providers-errors.md` |
| 30 | Collection Panel & Item Cards | Collection & Backlog | 0 | 2 | 3 | 0 | `collection-panel-item-cards.md` |
| 31 | Consensus, Debate & Collaboration | Social | 0 | 2 | 3 | 0 | `consensus-debate-collaboration.md` |
| 32 | Creator Analytics Dashboard | Personalization | 0 | 2 | 2 | 1 | `creator-analytics-dashboard.md` |
| 33 | Design Tokens & Theming | Shared UI | 0 | 2 | 2 | 1 | `design-tokens-theming.md` |
| 34 | Item Comparison | Collection & Backlog | 0 | 2 | 3 | 0 | `item-comparison.md` |
| 35 | Templates & Blueprints | Studio | 0 | 2 | 3 | 0 | `templates-blueprints.md` |
| 36 | UI Primitives | Shared UI | 0 | 2 | 3 | 0 | `ui-primitives.md` |
| 37 | Visual & 3D Components | Shared UI | 0 | 2 | 2 | 1 | `visual-3d-components.md` |
| 38 | Wiki Images & Progressive Media | Item Data | 0 | 2 | 3 | 0 | `wiki-images-progressive-media.md` |

---

## All 16 critical findings — one-line summary

Grouped into themes for triage.

### A. Security / trust boundaries (4)
1. **Public API & SDK — API key validation is a mock.** `validateApiKey` accepts ANY `goat_*`-shaped string with no DB lookup → total auth bypass on every `/api/v1/*` route; `keyId` is attacker-controlled. `public-api.ts:233-294`
2. **Public API & SDK — Agent-bridge task API has zero auth + unbounded in-memory store.** Anyone can create/read/delete tasks; ~10GB DoS, metadata/output leak, cross-caller delete by ID. `agent-bridge/tasks/route.ts:101`, `task-memory-manager.ts:139-172`
3. **Bookmarks API trusts client-supplied `user_id`.** No `requireAuth()`; folder DELETE/PATCH don't even require it → IDOR read/delete of any user's bookmarks & folders. `api/bookmarks/route.ts:21,86,154,195`
4. **merge-guest trusts attacker-supplied `guest_id`.** No ownership proof + RLS `USING (true)` → any signed-in user reassigns another guest's lists/rankings/collections to themselves. `api/auth/merge-guest/route.ts:27-64`

### B. Data integrity / silent corruption (5)
5. **List creation always orphans the list.** Transformer sends `user:{email,name}` but no `user_id`; API reads `body.user_id` → every list inserted `user_id:null`, never appears in "My Lists". `list-intent-transformers.ts:103`
6. **Custom criteria silently dropped at publish.** `getCriteriaConfig()` early-returns null whenever `selectedProfileId` is null (always true in custom mode) → all user-authored criteria discarded. `studio-store.ts:552`
7. **Studio duplicate item titles collide on React keys + dnd-kit ids.** Removals delete the wrong card; drags reorder the wrong item (silent data corruption). `StudioItemsView.tsx:179`
8. **Two divergent `handleDragEnd` engines** implement contradictory occupied-slot semantics (displace vs silent-reject) depending on entry point. `grid-store.ts:872`, `grid-plans.ts:182`
9. **Mobile swipe-to-rank bypasses the item-assignment lock** the desktop drag path uses → two rapid swipes race for one slot, one placement silently lost. `MobileBacklogPanel.tsx:204`

### C. Crash / hang / NaN (4)
10. **Empty/under-filled bracket throws inside `setTimeout`** (no guard, no try/catch) → branded loader spins forever, app appears frozen. `BracketView.tsx:157-167`
11. **Pyramid tier mapping produces NaN boundaries for tierCount > 5** (hardcoded 5-element weight array) → tail-tier items silently vanish. `RankingEngine.ts:849`
12. **`processQueue` strands ops in `in_progress` forever** on a network drop mid-sync (catch only logs) → invisible to all future syncs = silent data loss. `OfflinePersistence.ts:328-380`
13. **Quick-assign auto-advance re-selects the same placed item** — the available list never excludes used items. `session-store.ts:407`

### D. Feature broken at the seam (2)
14. **OG image route `/api/og/[code]` does not exist** — every shared link's `og:image` 404s; the entire OGCardGenerator pipeline is dead code. `share/[code]/layout.tsx:68` (+4 callers)
15. **Interest decay silently wipes all interests for returning users** (hard `minScore` filter at init) → power-users demoted to generic "new user" path. `InterestTracker.ts:181`

### E. App-wide accessibility regression (1)
16. **PageTransition animates slide+scale+fade on every route change with no reduced-motion guard** — app-wide WCAG 2.3.3 failure, despite full reduced-motion plumbing existing. `page-transition.tsx:57-73`

---

## Triage themes (cross-cutting patterns detected across all 190)

These cluster the highs/mediums too — each is a coherent fix-wave with one mental model.

| Theme | Approx count | Why it's a wave, not isolated fixes |
|---|---:|---|
| **T1 · Security / trust boundaries** | ~8 | Missing `requireAuth`, client-trusted `user_id`/`guest_id`, mock API keys, wildcard CORS, unescaped OG/embed injection. One auth-discipline pass. |
| **T2 · Built-but-unwired / dead features** | ~22 | A dominant theme: shipped code with zero consumers — comparison engine, OG route, collection toolbar filters, collections dashboard CRUD, magnetic-snap hook, MiniTrajectoryChart, RankingProgressLayer, DebatePanel, award Share, clone API, ImageFallback, Save Draft. Each promises a feature that silently no-ops. |
| **T3 · Non-atomic counters & optimistic updates w/o rollback** | ~12 | Read-modify-write on view/fork/usage/vote counts; optimistic bookmark/toggle with no revert; lost updates under concurrency. |
| **T4 · Divide-by-zero / NaN math** | ~9 | Tier boundaries, center-of-mass, consensus/controversy, completion %, average-rank — empty/sparse inputs leak NaN into UI and prompts. |
| **T5 · Reduced-motion & a11y gaps** | ~14 | PageTransition, use3DTilt, RankingProgressLayer, AnimatedCounter SSR mismatch, clickable `div`s (landing), missing listbox/dialog ARIA, focus management. |
| **T6 · Stale-closure / race-during-async** | ~11 | Prefetch timeout-in-state, search debounce w/o sequence guard, circuit-breaker HALF_OPEN hang, reveal-sequence on rapid reopen, criteria sync. |
| **T7 · Silent failures / success theater** | ~13 | Activity feed fabricates demo data on fetch error; swallowed preview-capture; sync false-success on in-band `{error}`; rate-limiter non-enforcing; gemini JSON fallback. |
| **T8 · Orphaned / wrong-data-source rendering** | ~10 | CollectionView renders `filteredLists` not its own order; item-stats average over wrong subset; toolbar filters never reach grid; thumbnails order by wrong table. |
| **T9 · Timezone / clock correctness** | ~3 | Streak day math (UTC vs local/DST), season detection misses IANA zones. |
| **T10 · Dark-mode / theme correctness** | ~4 | Tokens are dark-only `:root` with no `.light` → light theme renders dark surfaces; undefined `z-9`. |
| **T11 · Mobile / responsive gaps** | ~9 | Studio 4-col phone grid, hero non-wrapping flex, mobile drawer drag fighting scroll, MasonryGrid JIT class collapse. |
| **T12 · Resource leaks (timers/listeners/scroll-lock)** | ~7 | Resize-handle doc listeners, abort listeners, body scroll-lock without cleanup, will-change GPU promotion, unbounded module caches. |

---

## Suggested next-phase split (fix waves)

Each wave ≈ 5–7 findings, single mental model, sessionable. Ordered by value/risk.

- **Wave 1 — Data-integrity & crash criticals (low-risk, self-contained):** #5 list orphan, #6 criteria dropped, #7 studio dup-key, #10 bracket hang, #11 tier NaN, #13 quick-assign. *(High value, contained code fixes — no infra/auth changes.)*
- **Wave 2 — Built-but-unwired core features (T2):** OG route #14, comparison engine, collection toolbar filters, collections dashboard CRUD, award Share, clone API. *(Each restores an advertised but dead feature.)*
- **Wave 3 — Security / trust boundaries (T1) — NEEDS APPROVAL (high risk/effort):** #1 mock API key, #2 agent-bridge auth, #3 bookmarks IDOR, #4 merge-guest IDOR, OG/embed injection. *(Touches auth/RLS/API-key infra — gated; see B5.)*
- **Wave 4 — Reduced-motion & a11y (T5):** #16 page-transition, use3DTilt, RankingProgressLayer, AnimatedCounter SSR, landing clickable divs, UniversalSelect ARIA.
- **Wave 5 — Silent failures & success theater (T7):** activity fake demo data, sync false-success #12-adjacent, preview-capture swallow, rate-limiter, circuit-breaker hang.
- **Wave 6 — NaN math & wrong-data-source (T4+T8):** consensus/center-of-mass NaN, completion %, item-stats average, CollectionView source, thumbnails ordering.
- **Wave 7+ — remaining highs/mediums by area** (T3 counters, T9 timezone, T10 theming, T11 mobile, T12 leaks).

---

## How this scan was run

- **Scanners:** combined `ui-perfectionist` (🎨) + `bug-hunter` (🐛) role-prompts from `vibeman/src/lib/prompts/registry/agents/`, fused into one per-context pass.
- **Scope:** all 38 contexts (10 groups), pure Next.js 16 web app (no Tauri split). 483 in-scope file paths.
- **Method:** 38 `general-purpose` subagents, 5 waves of ≤8. Each read its context's files read-only, returned exactly 5 findings + a terse stats reply. Orchestrator read only the replies, not the reports, during scanning.
- **Target findings:** 5 per context (combined) = 190 total. Achieved exactly.
- **Verification:** header-sum (190) == bullet-count (190). No malformed reports.
- **Health baseline:** TypeScript = 53 pre-existing errors (regression gate for fix waves). Test runner: Playwright e2e only (no unit tests).
- **Provenance:** `_manifest.json` (per-context file lists), `_triage.json` (parsed counts + criticals).
