# Combined UI+Bug Fix Wave 14 — Scattered low-severity sweep

> 4 commits, 5 findings closed (3 high + 2 medium) across previously-untouched contexts. All self-contained.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave14-sweep` (off wave 13).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `f86c03d` | search-command #1 + #4 — Escape conflict + domain-filter slicing | high + medium | `CommandPalette.tsx` |
| 2 | `38804ac` | app-shell #3 — DeferredProviders rAF timer leak | medium | `DeferredProviders.tsx` |
| 3 | `087ea8b` | app-shell #1 — ErrorBoundary analytics no-op on cold load | high | `ErrorBoundary.tsx` |
| 4 | `8b2b0d8` | search-command #5 — fuzzy duplicate highlight indices | medium | `fuzzy.ts` |

## What was fixed

1. **Palette Escape + domain filter (high + medium).** A global document Escape handler fired alongside the component's and unconditionally closed the palette, so the "Escape clears the category filter, then closes" affordance was dead — users lost their whole session. The component's Escape branch now `stopPropagation()`s. Separately `parseDomainFilter` matched on the lowercased+trimmed query but sliced the prefix off the *raw* query, so leading whitespace shifted the offset and the prefix leaked into the search term — it now slices the trimmed query (preserving case).

2. **DeferredProviders rAF leak (medium).** The no-`requestIdleCallback` fallback returned a cleanup from inside the rAF callback (swallowed by rAF) and the inner `setTimeout` was never cleared, leaking a timer and risking `setReady(true)` on an unmounted component on Safari/webviews. Both ids are now captured and cleared from the single effect cleanup.

3. **ErrorBoundary analytics no-op (high).** `trackError` only fired if `window.__GOAT_ERROR_TRACKER__` existed — but that global is installed solely as a transitive import of optional feature modules, so early-render/pre-hydration crashes (the most severe) were caught but never recorded. It now calls the analytics module's `trackError` directly (mapping GoatError's code/category/severity/traceId), which also installs the tracker eagerly on the critical path.

4. **Fuzzy highlight dedupe (medium).** The word-start matcher advanced its cursor regardless of match and used `indexOf(word)`, so repeated words resolved to the wrong occurrence and pushed duplicate/misaligned highlight indices (and over-scored repetitive titles). It now tokenizes with exact offsets (`/\S+/g`, handling multi-space/tab), lets each pattern word claim at most one title word, dedupes via a Set, and returns sorted indices — fixing the shared ranker used by the palette, API, and SearchFilterBar.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 24)

24. **Two handlers for one key, side effects in the wrong cleanup scope, and globals installed by lazy imports.** Recurring shapes: a component handler that must own a key needs `stopPropagation()` against a global document listener; a cleanup `return`ed from a rAF/timer callback is swallowed (capture ids and clear from the `useEffect` cleanup); and a side-effect global probed via `if (window.__X__)` silently no-ops whenever the module that installs it hasn't been imported yet — call the module directly so it's installed eagerly. Also: index/offset math over tokenized strings must use the *same normalized string* it matched against.

## What remains

- Deferred/infra items only: migrations (fork_count/usage_count RPCs, light tokens, RLS/api_keys), architectural decisions (toolbar filters, collections reorder/picker, comparison engine), schema-dependent (thumbnails-order), StatsCard color, ItemDetailPopup focus-trap, duplicate MobileFacetDrawer, and remaining scattered low-sev report items (challenges timezone, top-groups chunking, ai-item gemini schema, etc.).
- Cumulative Waves 1–14: 61 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
