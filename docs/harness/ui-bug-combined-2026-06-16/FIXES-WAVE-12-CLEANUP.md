# Combined UI+Bug Fix Wave 12 — Lower-severity cleanup (a11y + interaction)

> 5 commits, 5 findings closed (1 high + 4 medium). Mixed a11y + touch-interaction, all self-contained.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave12-cleanup` (off wave 11).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `40c64de` | motion-gestures #2 — pinch→drag handoff stale state | high | `GestureRecognizer.ts` |
| 2 | `f2e69d8` | ui-primitives #5 + #3 — UniversalSelect ARIA + clear label | medium | `universal-select.tsx` |
| 3 | `652a47c` | ui-primitives #3 — GlassModal close button label | medium | `glass-modal.tsx` |
| 4 | `b08eb6f` | item-inspector #5 — ItemDetailPopup dialog semantics | medium | `ItemDetailPopup.tsx` |
| 5 | `6562aa5` | motion-gestures #5 — pinch-zoom snaps mid-gesture | medium | `useGridPinchZoom.ts` |

## What was fixed

1. **Pinch→drag handoff (high, real bug).** Lifting one finger during a pinch took the leftover-finger branch and set `state="dragging"` but kept `startTouches` as the 2-finger snapshot and never cleared `velocityHistory`/long-press. Subsequent distance/velocity were measured from the original pinch start against the surviving finger, easily crossing swipe/flick thresholds and firing an unintended action (e.g. grid-item remove). The branch now re-seeds the gesture from the surviving touch.

2. **UniversalSelect ARIA (medium, high blast radius).** The shared custom select had full keyboard mechanics but no ARIA — invisible/confusing to screen readers across every form. Added `role="combobox"` + `aria-haspopup`/`expanded`/`controls`/`activedescendant` on the trigger, `role="listbox"` + id on the panel, `role="option"` + `aria-selected` + id per option, and an `aria-label` on the search clear button.

3. **GlassModal close button (medium).** The icon-only header close button had no accessible name (announced as unnamed "button"), inherited by every modal. Added `aria-label="Close"` + `type="button"`.

4. **ItemDetailPopup dialog semantics (medium).** The floating popup had no `role`/`aria-label` and unlabeled icon controls. Added `role="dialog"` + `aria-label` (item title) and `aria-label`s + `type="button"` on the lock/close controls. (Focus trap/restore intentionally omitted — non-modal stacking popups where auto-focus would steal focus; small follow-up.)

5. **Pinch-zoom mid-gesture snap (medium).** `handleTouchMove` ran `snapScale()` every move, force-pinning the scale to a preset within the 0.08 tolerance band while fingers kept spreading — sticky/notched feel with a dead zone around each of six presets. The live move now tracks the raw clamped scale 1:1; snapping still happens on release.

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 22)

22. **Keyboard mechanics without ARIA is invisible UX; and "end"-event state machines must handle partial transitions.** A custom widget can have perfect arrow-key handling yet be unusable to AT without role/aria-* + activedescendant — build them together. And a gesture/lifecycle state machine that only fully resets on the *terminal* event (all fingers up) leaks stale state on *partial* transitions (one finger lifted) — re-seed on every state change, not just the end.

## Deferred / not done

- **StatsCard magic-string color (ui-primitives #4):** changing the `defaultColors[label.toLowerCase()]` lookup would alter existing visuals for callers relying on it — a behavior change with visual risk; left for a deliberate pass.
- **ItemDetailPopup focus trap/restore:** non-modal stacking popups; auto-focus risks stealing focus. Small follow-up.

## What remains

- T3 non-atomic counters (the last major theme), the deferred Wave-2 items, thumbnails-order (schema), light-mode palette, duplicate MobileFacetDrawer, StatsCard color.
- Cumulative Waves 1–12: 53 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
