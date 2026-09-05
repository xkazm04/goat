# Visual & 3D Components — Combined UI+Bug Scan
> Context: Branded visual flourishes and 3D/parallax decorative components (mascot, icons, card tilt, parallax, floating elements, ranking progress layer).
> Files scanned: 12 (10 in-scope + use-motion-preference + use-reduced-motion + globals.css region)
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

## 1. InteractivePreview leaves body scroll-locked on unmount-while-open
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: lifecycle / cleanup leak
- **File**: src/components/3d/InteractivePreview.tsx:128 (set), :136 (only reset path)
- **Scenario**: Open the modal preview (`handleOpen` sets `document.body.style.overflow = 'hidden'`), then trigger a route change / parent unmount (e.g. navigation, list switch, or a parent conditionally unmounting the component) while `isOpen` is still true. The only code that restores `overflow` lives in `handleClose`, which is never called on unmount.
- **Root cause**: Body-scroll lock is a global side effect written imperatively in an event handler, but there is no `useEffect` cleanup tied to the `isOpen`/mount lifecycle to undo it. The escape-key and focus-trap effects clean up their listeners, but none of them reset `document.body.style.overflow`.
- **Impact**: After the component unmounts mid-open, the whole page stays permanently scroll-locked (`overflow: hidden` on `<body>`) until a full reload — a hard, confusing UX dead-end. Also clobbers any other scroll-lock owner since it writes the raw style rather than ref-counting.
- **Fix sketch**: Add `useEffect(() => { if (isOpen) document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, [isOpen]);` and drop the imperative writes from the handlers, so React guarantees restoration on unmount and on `isOpen` flipping false.

## 2. RankingProgressLayer ignores the in-app 3-tier motion preference (design-system drift)
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: design-system drift / reduced-motion compliance
- **File**: src/components/visual/RankingProgressLayer.tsx:6, :83, :91
- **Scenario**: A user sets the in-app motion tier to "reduced" or "minimal" (which writes `goat-motion-preference` to localStorage) without enabling the OS-level `prefers-reduced-motion`. Complete a ranking. The celebration cascade (`showCelebration`) still fires, and the accelerated ambient durations (`--float-duration`, `--particle-duration`) still ramp up.
- **Root cause**: This component imports the *deprecated* `useReducedMotion()` from `@/hooks/use-reduced-motion` (system media-query only, explicitly `@deprecated`), while every other component in scope uses the 3-tier `useMotionCapabilities()` from `@/hooks/use-motion-preference`. It also never emits a `data-motion-tier` attribute, so the `[data-motion-tier="reduced"|"minimal"]` CSS guards in globals.css (lines 1771-1778) that are *meant* to suppress this celebration never match.
- **Impact**: The in-app motion control silently has no effect on this celebration/animation layer; only the OS toggle works. Inconsistent accessibility behavior and dead CSS guard rules that imply the gating exists.
- **Fix sketch**: Replace `useReducedMotion()` with `useMotionCapabilities()` and gate `showCelebration` on `allowCelebrations` and ambient speed-up on `allowAmbient`; or set `data-motion-tier={tier}` on the wrapper so the existing CSS guards engage.

## 3. ParallaxLayer forces permanent GPU layer promotion even when effects are disabled
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: performance-perception / reduced-motion
- **File**: src/components/3d/ParallaxSection.tsx:185
- **Scenario**: Render any `ParallaxLayer` with `disabled` or with reduced/minimal motion (`!allowAmbient`). The transforms are correctly neutralized (ranges collapse to 0), but `willChange: 'transform, opacity'` is hardcoded unconditionally in the style object.
- **Root cause**: `willChange` is treated as a static style rather than a hint applied only while the element is actually animating. With many parallax layers, every one gets promoted to its own compositor layer permanently.
- **Impact**: Persistent `will-change` keeps elements on the GPU even when nothing moves, increasing memory/compositing cost and degrading perceived performance — especially on mobile and for the very reduced-motion users the gating was meant to protect.
- **Fix sketch**: Set `willChange: effectsDisabled ? 'auto' : 'transform, opacity'` (or omit it entirely and let the browser/Framer manage it), so disabled/reduced-motion layers are not force-promoted.

## 4. Card3D touch tilt has no `touch-action` guard and persists last tilt on interrupted touch
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: timing / edge-case (touch)
- **File**: src/components/3d/Card3D.tsx:203-232
- **Scenario**: On a touch device, drag a finger across the card (`onTouchMove` sets tilt/hover). If the touch is interrupted without a clean `touchend` — e.g. the OS cancels it (incoming call, gesture nav, scroll takeover) which fires `touchcancel`, not `touchend` — `handleTouchEnd` never runs, so `mouseX/mouseY/isHovering` stay at their last values and the card remains tilted/scaled indefinitely. There is also no `touch-action` set, so vertical scroll and the tilt gesture fight.
- **Root cause**: Only `onTouchEnd` is wired; `onTouchCancel` is omitted, and the design assumes every touch sequence ends with `touchend`. No `touch-action` declares scroll-vs-tilt intent.
- **Impact**: Stuck-tilted cards after interrupted touches; scroll jank where the card consumes touch-move that the user intended as a page scroll.
- **Fix sketch**: Add `onTouchCancel={handleTouchEnd}` to reset state, and apply `touch-action: pan-y` (or `manipulation`) on the motion card so vertical scrolling is preserved while horizontal tilt still works.

## 5. FloatingElements ambient animation ignores per-element opacity transition and re-blurs static fallback
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: visual polish / reduced-motion consistency
- **File**: src/components/3d/FloatingElements.tsx:229, :301-318
- **Scenario**: With `disabled={true}` and motion allowed (or in the static path), elements still render with `filter: blur(...)` (line 229) and full positional opacity, but the early-return at line 301 only short-circuits when `!allowAmbient && !disabled`. So a consumer passing `disabled` to "turn it off" still paints a field of blurred decorative dots that never move — visually they read as a rendering glitch rather than an intentional static state, and the blur cost is paid for purely decorative, non-animating elements.
- **Root cause**: `disabled` is overloaded to mean both "don't animate" and (implicitly) "still show", and the blur filter is applied independent of whether the element animates, so the reduced/disabled state is a frozen mid-animation snapshot rather than a deliberate resting design.
- **Impact**: Reduced-motion / disabled users see static blurred blobs (minor visual noise + needless blur compositing) instead of either nothing or a clean resting state.
- **Fix sketch**: When not animating (`!shouldAnimate`), drop the `blur` filter or render nothing for the purely decorative `disabled` case; align the disabled-vs-allowAmbient logic so "disabled" yields an intentional empty/clean state rather than a frozen frame.
