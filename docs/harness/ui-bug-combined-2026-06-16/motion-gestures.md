# Motion & Gestures — Combined UI+Bug Scan
> Context: Animation presets, motion tokens, gesture recognition, touch/swipe/pinch interactions, and reduced-motion handling for accessible animation.
> Files scanned: 16
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. PageTransition animates on every route change with no reduced-motion guard
- **Severity**: critical
- **Lens**: ui-perfectionist
- **Category**: reduced-motion / a11y (WCAG 2.3.3)
- **File**: src/components/page-transition.tsx:57-73
- **Scenario**: A user with `prefers-reduced-motion: reduce` (or the in-app `minimal`/`reduced` motion tier) navigates between any two routes. Every navigation runs the `pageTransition` variants — opacity fade, an 8px vertical slide (`y: ±SLIDE_OFFSET`), and a `scale: 0.99` zoom — with `DURATION.normal` (300ms) on enter and exit.
- **Root cause**: `PageTransition` is the app-wide route wrapper but never reads `useReducedMotion()` / `useMotionPreference()`. The motion system ships first-class reduced-motion plumbing (`use-reduced-motion.ts`, `use-motion-preference.ts`, `safeAnimate`), yet the single most pervasive animation in the app opts out of all of it. The variants are a module constant with no tier-aware branch.
- **Impact**: Vestibular-sensitive users get an unavoidable slide+scale on every page they visit — the exact translate/scale motion `prefers-reduced-motion` exists to suppress. This is a genuine accessibility regression, not polish, and it silently overrides any tier the user selected.
- **Fix sketch**: Read the motion tier in the component; when reduced/minimal, swap to opacity-only variants (or `initial={false}` with `transition.duration = 0`). E.g. `const reduce = useReducedMotion(); const variants = reduce ? FADE_VARIANTS : pageTransition;` and gate the slide/scale keys behind the full tier.

## 2. GestureRecognizer leaves stale start-touch + dead long-press after a pinch lifts one finger
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: gesture state machine / multi-touch race
- **File**: src/lib/gestures/GestureRecognizer.ts:487-496
- **Scenario**: User pinches with two fingers (state → `pinching`), then lifts ONE finger while keeping the other down (a very common pinch-to-drag handoff). `handleTouchEnd` runs with `event.touches.length === 1`, so it takes the `else` branch: `this.currentTouches = touches; this.state = "dragging"`. It does NOT reset `startTouches` (still the 2-finger snapshot), does NOT clear `velocityHistory`, and does NOT restart the long-press timer.
- **Root cause**: The handoff branch mutates `state`/`currentTouches` but skips the rest of `reset()`. All subsequent `distance`, `duration`, and `velocity` math in `handleTouchMove`/`buildGestureData` is measured from the *original pinch start point* (lines 330-332, 565-566), and `buildGestureData` still reports `isMultiTouch`/`scale` off mismatched start/current arrays.
- **Impact**: The remaining finger produces a phantom "drag" with a huge bogus distance/velocity computed against a finger that already lifted — easily crossing `swipeMinDistance`/`flickMinVelocity` and firing an unintended swipe action (e.g. `remove` on a grid item) the user never made. Silent, data-affecting, and hard to reproduce in a debugger.
- **Fix sketch**: In the leftover-finger branch, re-seed the gesture from the surviving touch: `this.startTouches = touches; this.currentTouches = touches; this.velocityHistory = []; this.isLongPressTriggered = false;` (and restart the long-press timer if you want long-press on the remaining finger).

## 3. 3D tilt hook ignores the motion preference system entirely
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: reduced-motion / a11y
- **File**: src/hooks/use-3d-tilt.ts:45-83
- **Scenario**: A reduced-motion user hovers or keyboard-focuses any card wired to `use3DTilt`. The hook springs `rotateX`/`rotateY` (up to ±10°) and `scale` to 1.02 on `onMouseMove`/`onFocus`, animating a perspective transform.
- **Root cause**: `disabled` defaults to `false` and is purely a caller-supplied prop; the hook never consults `useReducedMotion()` or `useMotionCapabilities().allowInteraction`. Unlike `useScrollTrigger` (which gates on `allowTransitions`) and the haptic layer (which checks `prefersReducedMotion()`), this interaction hook has no automatic reduced-motion path, so every consumer must remember to pass `disabled` — and none are forced to.
- **Impact**: Motion-sensitive users get parallax/tilt motion that the rest of the system is built to suppress; the `focus` handler (lines 111-116) even introduces tilt on keyboard navigation, hitting the users most likely to need reduced motion. Inconsistent with the design system's stated "Respect prefers-reduced-motion" philosophy.
- **Fix sketch**: Inside the hook, OR the caller's `disabled` with the preference: `const reduce = useReducedMotion(); const effectiveDisabled = disabled || reduce;` and drive `effectiveMaxRotation`/`effectiveHoverScale` from that.

## 4. Duplicated, drifting DURATION scales across the animation libs
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: motion-token consistency / design-system gap
- **File**: src/lib/animations/motion-tokens.ts:55-64 (vs motion-presets.ts:33-48)
- **Scenario**: A developer reaches for a "normal" or "slow" entrance duration. `motion-presets.ts` `DURATION` defines `normal: 0.3`, `slow: 0.5`, `emphasis: 0.6`, `dramatic: 0.8`, plus a `fast: 0.2`. `motion-tokens.ts` independently re-declares `ENTRANCE_DURATION` (`normal: 0.3`, `slow: 0.5`, `ambient: 0.8`, `scenic: 0.6`) and `CSS_TIMING.rankTransition: 'duration-500'`, while `sharing.ts`/`micro-interactions.ts` re-export yet another copy of `DURATION`.
- **Root cause**: Three parallel "token" sources (`motion-presets`, `motion-tokens`, plus per-file re-exports) each restate the same millisecond values under different names with no single source of truth. The header comments even claim they "mirror" CSS custom properties, but the names don't line up (`fast` vs `--duration-*`; `dramatic` vs `ambient`).
- **Impact**: Values inevitably drift (e.g. a future 300ms→250ms tune touches `DURATION.normal` but not `ENTRANCE_DURATION.normal` or the hardcoded `'duration-500'`), producing subtly inconsistent kinetic feel across podium/share/scroll surfaces — the exact problem the token files were created to prevent.
- **Fix sketch**: Make `motion-tokens.ts` derive from `motion-presets` `DURATION` (e.g. `slow: DURATION.slow`) instead of re-typing numbers, and replace the `'duration-500'` string with a token-backed value so one edit propagates everywhere.

## 5. Pinch-zoom snaps scale during the move, fighting the user's live gesture
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: pinch boundaries / gesture affordance
- **File**: src/app/features/Match/hooks/useGridPinchZoom.ts:150-153
- **Scenario**: On a >20-item grid, the user pinches slowly and pauses near a preset (e.g. ~1.0 or ~1.25). `handleTouchMove` runs `newScale = snapScale(newScale)` on *every* move event, so any in-flight scale within `SNAP_TOLERANCE` (0.08) is force-clamped to the preset mid-gesture.
- **Root cause**: Snapping is applied during continuous tracking, not only on release. `handleTouchEnd` (lines 187-201) already snaps on lift, so the live-move snap is redundant and actively wrong: it pins `newScale` to the preset while the fingers keep spreading, then jumps once the user pushes past the 0.08 band.
- **Impact**: Pinch feels "sticky"/notched and unresponsive near every preset — a 0.16-wide dead zone around six presets covers ~64% of the 0.5–2.0 range where the grid refuses to track the fingers smoothly. Degrades the precision the feature was built to provide for large lists.
- **Fix sketch**: Track the raw clamped scale during `handleTouchMove` (drop the `snapScale` call there) and only call `snapScale` in `handleTouchEnd`, so motion is 1:1 with the fingers until release.
