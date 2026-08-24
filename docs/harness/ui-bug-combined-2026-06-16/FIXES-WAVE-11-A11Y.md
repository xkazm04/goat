# Combined UI+Bug Fix Wave 11 — A11y / reduced-motion (T5)

> 5 commits, 5 findings closed (1 critical-grade + 4 high). All self-contained a11y fixes.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave11-a11y` (off wave 10).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `67043a5` | motion-gestures #1 — page transition ignores reduced-motion | critical | `page-transition.tsx` |
| 2 | `dfc5c8a` | motion-gestures #3 — use3DTilt ignores motion preference | high | `use-3d-tilt.ts` |
| 3 | `f1420ca` | ui-primitives #2 — AnimatedCounter/SuccessCelebration SSR mismatch | high | `AnimatedCounter.tsx`, `SuccessCelebration.tsx` |
| 4 | `39bf6ce` | landing #1 — hero rows keyboard-inaccessible | high | `FloatingShowcase.tsx` |
| 5 | `1db581b` | visual-3d #2 — RankingProgressLayer ignores in-app tier | high | `RankingProgressLayer.tsx` |

## What was fixed

1. **Page transition reduced-motion (critical, WCAG 2.3.3).** `PageTransition` wraps every route and ran an 8px slide + scale(0.99) + fade on every navigation with no reduced-motion guard, overriding any tier the user chose — the single most pervasive animation opting out of the whole motion system. Now reads `useMotionPreference()`: full → slide+scale, reduced → opacity-only (drops the translate/scale motion `prefers-reduced-motion` suppresses), minimal → instant. SSR-safe.

2. **use3DTilt motion preference (high).** The tilt hook sprang rotateX/rotateY + scale on hover AND focus regardless of tier (the focus path even added tilt during keyboard nav); `disabled` was caller-only and unenforced. Now ORs `disabled` with `!allowInteraction` from `useMotionCapabilities`, so reduced/minimal tiers neutralize the tilt automatically.

3. **AnimatedCounter/SuccessCelebration SSR mismatch (high).** Both called `prefersReducedMotion()` *during render* — false on the server, true in the browser — diverging the initial `useState` seed and the JSX branch, triggering a React 19 hydration mismatch (and a counter flicker) for reduced-motion users. Both now read the tier via the `useSyncExternalStore`-backed `useMotionPreference` hook (server defaults to `full`), so server and first client render agree and behavior switches only after hydration.

4. **Hero rows keyboard-inaccessible (high, WCAG 2.1.1).** `FloatingShowcase`'s `TableRow` — the most prominent "play a featured list" entry point — was a clickable `motion.div` with no role/tabIndex/aria-label/keydown, unreachable by keyboard/AT, inconsistent with the accessible sibling `MosaicCard`. Added `role="button"`, `tabIndex={0}`, `aria-label`, `focus-ring`, and an Enter/Space `onKeyDown`.

5. **RankingProgressLayer ignores in-app tier (high).** It imported the deprecated system-only `useReducedMotion`, so the in-app localStorage tier had no effect (celebration still fired, ambient durations still ramped for reduced/minimal users) and it never emitted `data-motion-tier`, leaving the `[data-motion-tier]` CSS guards in globals.css dead. Switched to `useMotionPreference`: ambient gates on `allowAmbient`, celebration on `allowCelebrations`, and the wrapper now sets `data-motion-tier` so the CSS guards engage.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 21)

21. **A motion/preference system only works if the pervasive surfaces opt in.** The app shipped first-class reduced-motion plumbing (`useMotionPreference`, 3-tier capabilities, CSS `[data-motion-tier]` guards), yet the most-used animations (route transitions, tilt, celebration) bypassed it — gating that "exists" but never engages is worse than none (it implies coverage). Audit the highest-traffic animations against the system. And: read client-only preferences via an SSR-safe `useSyncExternalStore` hook, never a bare function call during render (hydration mismatch); make a clickable non-`<button>` operable with role+tabIndex+aria-label+Enter/Space, not just onClick.

## What remains

- Remaining a11y items not in this wave (lower severity): GlassModal/UniversalSelect ARIA roles + labels, ItemDetailPopup dialog semantics, Achievement-feature reduced-motion — all in the per-context reports.
- Other themes: T3 non-atomic counters + the deferred Wave-2 items, thumbnails-order (schema), light-mode palette, duplicate MobileFacetDrawer.
- Cumulative Waves 1–11: 48 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
