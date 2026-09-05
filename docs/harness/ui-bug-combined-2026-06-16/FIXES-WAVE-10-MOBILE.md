# Combined UI+Bug Fix Wave 10 — Mobile / responsive (T11)

> 5 commits, 5 findings closed (4 high + 1 medium). All self-contained responsive/layout fixes.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave10-mobile` (off wave 9).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `a10ec8c` | ui-primitives #1 — MasonryGrid columns collapse (Tailwind JIT) | high | `masonry-grid.tsx` |
| 2 | `5c799a6` | studio #2 — items grid 4-col on phones | high | `StudioItemsView.tsx` |
| 3 | `97308eb` | landing #3 — hero tables non-wrapping flex | high | `FloatingShowcase.tsx` |
| 4 | `d392bbf` | landing #4 — onboarding cards 3-up flex | medium | `OnboardingHero.tsx` |
| 5 | `2b05ca7` | faceted #5 — mobile drawer drag vs scroll | medium | `MobileFacetDrawer.tsx` |

## What was fixed

1. **MasonryGrid collapse (high, shared primitive).** The grid built columns via interpolated `grid-cols-${n}` / `sm:grid-cols-${n}` strings. Tailwind 4 JIT only emits CSS for statically-visible class names, so these were never generated and the grid silently collapsed to one column in production — for every consumer. Now resolves the count via the existing `useMasonryColumns` hook (SSR-safe) and sets `gridTemplateColumns` inline, independent of Tailwind scanning.

2. **Studio phone grid (high).** `DEFAULT_GRID_CLASS` started at `grid-cols-4` with no smaller base → four ~70px cards on a 360px phone, truncated titles, untappable affordances. Base is now `grid-cols-2`, scaling up (sm:4 md:6 lg:8 xl:10); the loading skeleton uses the same class.

3. **Hero tables non-wrapping (high).** `FloatingShowcase`'s three `CategoryTable`s sat in a non-wrapping `flex gap-4` with no breakpoint → ~110px columns on mobile, on the most important above-the-fold module. Switched to a responsive grid (1 → 2 at sm → 3 at lg) so they stack on phones.

4. **Onboarding cards 3-up (medium).** The onboarding hero's three `PreviewCard`s were forced into a fixed flex row, truncating sample names for the new-user mobile audience. Switched to `flex-col sm:flex-row` so they stack on phones (preserving the existing flex-1 row behavior on larger screens).

5. **Facet drawer drag vs scroll (medium).** The mobile facet drawer set `drag="y"` on the whole sheet while the body scrolls, so a downward swipe in the facet list competed with native scroll and could accidentally drag-dismiss the drawer. The handle already starts drag via `dragControls`, so added `dragListener={false}` to restrict dismissal to the handle.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 20)

20. **Dynamic Tailwind class names silently produce no CSS.** Interpolated utilities (`grid-cols-${n}`, `sm:grid-cols-${md}`) are invisible to the JIT scanner — the rule never ships and the element falls back to browser defaults (here, one column in prod, passing in dev only by coincidence). Use inline `style` for dynamic values, a hardcoded literal lookup, or a safelist. And: desktop-first fixed multi-column rows (`flex`/`grid-cols-4` with no smaller base or breakpoint) reliably break on the largest traffic segment — always set the *phone* base first and scale up.

## Notes / deferred

- The faceted breadcrumb `onRemove={onToggleValue}` (also in finding #5) is correct in practice because breadcrumbs derive from `selections` (they can't show an unselected value); a true single-value remove would need a new parent callback — low priority, not changed.
- A near-duplicate `MobileFacetDrawer` exists at `src/lib/filters/facets/components/` — only the `faceted-search` one (per the finding) was fixed; verify whether the filters/facets copy is live and apply the same `dragListener={false}` if so.

## What remains

- Non-critical themes: T5 a11y/reduced-motion, T3 non-atomic counters + the deferred Wave-2 items, thumbnails-order (schema), light-mode palette.
- Cumulative Waves 1–10: 43 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
