# Combined UI+Bug Fix Wave 8 — Theming / dark-mode (T10)

> 4 commits, 5 findings closed (2 high + 2 medium + 1 low). All self-contained.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave8-theme` (off wave 7).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `00f7597` | design-tokens #3 — z-9 backdrop undefined | high | `CollapsiblePanel.tsx` |
| 2 | `13941d8` | design-tokens #4 + #5 — ResizeObserver churn + CSS var units | medium + low | `ResponsiveContainer.tsx` |
| 3 | `dca8cc6` | design-tokens #2 — theme-support dead-code doc | medium | `theme-provider.tsx` |
| 4 | `6a4e78e` | design-tokens #1 — broken light theme | high | `layout.tsx` |

## What was fixed

1. **z-9 backdrop (high).** The mobile `CollapsiblePanel` backdrop used `z-9`, not a defined utility in this token-based z-scale (z-sticky/z-toast), so Tailwind emitted nothing → `z-index:auto`, below the panel. Dim + tap-to-dismiss broke. Set an explicit `zIndex: sidebar - 1`.

2. **ResizeObserver churn + CSS var units (medium + low).** `ResponsiveContainer`'s observer effect depended on `containerBreakpoint`/`onBreakpointChange`, re-subscribing on every breakpoint crossing (dropping resize events in the gap); latest values now read through refs so the observer is created once. Separately `--container-width`/`--container-height` were bare numbers (React doesn't px-suffix custom props → invalid length) — now `${n}px`.

3. **theme-support dead-doc (medium).** The `ThemeProvider` doc claimed a JS `experimental-dark`→`dark` fallback the bare pass-through doesn't perform (it's CSS `@supports` in globals.css; `theme-support.ts` helpers are unused). Corrected the comment so future code doesn't trust a non-existent JS guard.

4. **Broken light theme (high).** `design-tokens.css` defines tokens only as dark values under `:root` with no `.light` overrides, so a `light` theme rendered unreadable dark-on-light surfaces + broken focus contrast. With `defaultTheme="dark"`, `enableSystem={false}`, and no UI selecting light, it was a registered-but-unreachable-and-broken theme. Dropped `'light'` from the registered themes (non-breaking) — the safe fix the report recommends; re-adding needs a real light palette (tracked in followups).

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 18)

18. **A class name that isn't a real utility silently emits nothing.** In token-scoped Tailwind 4, `z-9` / ad-hoc scale classes that aren't defined utilities produce no CSS (not a fallback) — verify against the project's actual scale or use inline values. Likewise: registering a theme without its token overrides ships a broken theme, and setting CSS custom properties to bare numbers (no px) yields invalid lengths — the framework's auto-unit/auto-fallback help does NOT apply to custom props or undefined utilities.

## What remains

- **Real light-mode palette** (deferred — see `followups-2026-06-16.md`): author `.light` token overrides in `design-tokens.css` and re-register `light` if light mode is a product goal.
- Non-critical themes: T5 a11y/reduced-motion, T3 non-atomic counters, T8 wrong-data-source, T11 mobile + the deferred Wave-2 items.
- Cumulative Waves 1–8: 34 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
