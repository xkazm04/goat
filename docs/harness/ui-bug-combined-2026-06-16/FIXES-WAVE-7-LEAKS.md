# Combined UI+Bug Fix Wave 7 — Resource leaks / lifecycle cleanup (T12)

> 5 commits, 5 findings closed (2 high + 3 medium). All self-contained lifecycle/cleanup fixes.
> Baseline preserved: TypeScript 53 → 53 (zero regression). Branch: `vibeman/ui-bug-wave7-leaks` (off wave 6).

## Commits

| # | Commit | Finding | Severity | Files |
|---|---|---|---|---|
| 1 | `6df66b4` | visual-3d #1 — body scroll-lock leak | high | `InteractivePreview.tsx` |
| 2 | `2f413c5` | backlog-panel #2 — resize listeners leak | high | `usePanelResize.ts` |
| 3 | `0c30c80` | visual-3d #3 — permanent GPU promotion | medium | `ParallaxSection.tsx` |
| 4 | `eeab7ea` | visual-3d #4 — Card3D stuck tilt on touchcancel | medium | `Card3D.tsx` |
| 5 | `13e6d18` | result-image #5 — cache key omits dimensions | medium | `aiImageGenerator.ts` |

## What was fixed

1. **Body scroll-lock leak (high).** `InteractivePreview` set `document.body.style.overflow = 'hidden'` in `handleOpen` and only restored it in `handleClose` — which never runs if the component unmounts while open (route change, parent unmount), leaving the whole page permanently scroll-locked until reload. Moved to a `useEffect` keyed on `isOpen` whose cleanup always restores overflow.

2. **Resize listeners leak (high).** `usePanelResize` added four `document` listeners in `handleResizeStart` and removed them only in `handleEnd` (mouseup). If the panel unmounted mid-drag (breakpoint flips to mobile, route change, match ends), the listeners leaked — and the `passive:false` touchmove kept blocking real page scroll until reload, plus setState-on-unmounted warnings. The active drag's teardown is now stored in a ref and invoked by an unmount cleanup effect.

3. **Permanent GPU promotion (medium).** `ParallaxLayer` hardcoded `willChange: 'transform, opacity'` even when effects were disabled / reduced-motion neutralized the transforms, keeping every layer on its own compositor layer for nothing. Now `'auto'` when effects are disabled.

4. **Card3D stuck tilt (medium).** Only `onTouchEnd` was wired, so an OS-interrupted touch (incoming call, gesture nav, scroll takeover) fires `touchcancel` — not `touchend` — leaving the card stuck tilted/scaled. Added `onTouchCancel={handleTouchEnd}` and `touch-action: pan-y` (preserve vertical scroll while horizontal tilt works; they previously fought).

5. **Wrong-size cache hit (medium).** `generateCacheKey` omitted `dimensions`/`numVariations`, so a 1200×630 and a 1080×1080 request with the same title/category/style/items collided — the second returned the first's wrong-sized image from the module cache. The key now includes WxH and the variation count. (The cache is already size-bounded at 50; the cross-user-scoping concern remains a documented follow-up.)

## Verification

| Gate | Before | After | Result |
|---|---|---|---|
| TypeScript | 53 | 53 | ✅ no regression |
| Tests | n/a | n/a | Playwright e2e only |
| Lint | blocked | blocked | ⚠️ pre-existing |

Each fix tsc-checked before commit.

## Patterns established (catalogue item 17)

17. **A global side effect set in an event handler needs a lifecycle-bound undo.** Body scroll-lock, document listeners, GPU `will-change`, pointer state — anything written imperatively in a handler leaks if the teardown is bound only to a *symmetric* event (close/mouseup/touchend) that may never fire (unmount, touchcancel). Bind teardown to the component lifecycle (a `useEffect` cleanup, or a ref-stored teardown invoked on unmount) and handle the cancel/interrupt sibling of every "end" event.

## What remains

- Non-critical themes: T5 a11y/reduced-motion, T3 non-atomic counters, T8 wrong-data-source, T10 theming, T11 mobile + the deferred Wave-2 items (toolbar filters, collections reorder/picker, comparison engine) and the documented cross-user cache-scoping follow-up.
- Cumulative Waves 1–7: 29 functional findings closed + 4 security mitigated; TS held at 53 throughout; 0 regressions.
