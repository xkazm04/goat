# UI Primitives — Combined UI+Bug Scan
> Context: Reusable Radix/Tailwind UI building blocks (buttons, modals, selects, skeletons, cards, grids) shared across every feature.
> Files scanned: 14 (+ 3 neighbors: use-modal-accessibility, sharing, motion-presets)
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. MasonryGrid responsive columns silently collapse — Tailwind can't generate dynamic class names
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: design-system-drift / silent failure
- **File**: src/components/ui/masonry-grid.tsx:82-92
- **Scenario**: Use `<MasonryGrid columns={{ sm: 2, md: 3, lg: 4 }}>` (the documented primary API, per the JSDoc example at line 59). The component builds class strings by interpolation: `grid-cols-${sm}`, `sm:grid-cols-${md}`, `md:grid-cols-${lg}`, `lg:grid-cols-${xl}`.
- **Root cause**: Tailwind 4 JIT only emits CSS for class names it finds as complete static strings during scanning. Interpolated names like `` `grid-cols-${sm}` `` are never seen, so the rules are not generated. A repo grep for `grid-cols-` found no safelist covering these. The grid therefore falls back to the browser default of a single implicit column at every breakpoint, regardless of the `columns` prop.
- **Impact**: The grid's core feature is broken in production builds for every consumer using responsive column objects. Items stack in one column; this is a shared primitive so the failure multiplies across features. It can pass casually in dev if any other component happens to ship the same literal class.
- **Fix sketch**: Replace interpolated classes with `gridTemplateColumns` inline style driven by the resolved column count (reuse `useMasonryColumns`), e.g. `style={{ gridTemplateColumns: \`repeat(${cols}, minmax(0,1fr))\` }}`. Alternatively map fixed prop values to a hardcoded lookup of full literal class strings and add a Tailwind safelist.

## 2. AnimatedCounter & SuccessCelebration read `prefersReducedMotion()` during render → SSR/hydration mismatch
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / hydration
- **File**: src/components/ui/AnimatedCounter.tsx:76, src/components/ui/SuccessCelebration.tsx:85
- **Scenario**: A user with OS "reduce motion" enabled loads any page using these primitives. `prefersReducedMotion()` (sharing.ts:293) returns `false` on the server (`typeof window === 'undefined'`) but `true` in the browser. The value is computed at render time, not in an effect, and is used to choose entirely different JSX branches (the `if (reducedMotion)` early returns) and the initial `useState(reducedMotion ? value : 0)`.
- **Root cause**: Reading a client-only media query synchronously during render of a `"use client"` component that is still server-rendered. Server HTML reflects the animated branch; first client render reflects the reduced branch → markup divergence.
- **Impact**: React 19 logs a hydration mismatch and discards/replaces the server HTML for reduced-motion users (an accessibility-sensitive cohort), causing a flash/remount. AnimatedCounter additionally seeds `displayValue` to `0` on server and to `value` on client, so the number can flicker.
- **Fix sketch**: Resolve the preference in `useEffect`/`useState(false)` initial then update post-mount (or use a `useReducedMotion`-style hook that returns `false` until mounted), so server and first client render agree; switch behavior only after hydration.

## 3. GlassModal lacks `aria-describedby` and its subtitle/close affordances are not announced
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility
- **File**: src/components/ui/glass-modal.tsx:135-146
- **Scenario**: A screen-reader user opens any GlassModal. The close `<button>` (line 141) has only an `<X>` icon and no `aria-label`, so it is announced as an unnamed "button". The subtitle/count (line 137) and any body content are not linked via `aria-describedby`.
- **Root cause**: The accessibility hook wires `aria-labelledby` to the title only; icon-only controls in the header were never given accessible names, and the modal contract stops at labelling. Consistent with the wider primitive set — the `UniversalSelect` clear button (universal-select.tsx:254) and `GlassModalHeader` close button are both icon-only with no label.
- **Impact**: Keyboard/AT users cannot tell what the header button does ("button, button"); a leverage flaw because every modal in the app inherits it.
- **Fix sketch**: Add `aria-label="Close"` (and `type="button"`) to the header close button and the select clear button; optionally accept a `descriptionId` and spread `aria-describedby` from the hook so body content is associated with the dialog.

## 4. StatItem label/value coloring keys off `metric.label.toLowerCase()` — fragile magic-string styling
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / API design
- **File**: src/components/ui/stats-card.tsx:199-209, 244
- **Scenario**: Pass a metric `{ label: "Active", value: 42 }`. `defaultColors["active"]` silently turns the value green; `{ label: "Error", value: 0 }` turns it red. A caller who localizes labels or uses "Active Users" gets no color, while an innocent label like "Completed" is force-colored blue — none of it under the caller's control. Separately, line 244 always renders `{label}:` with a hardcoded trailing colon, which breaks grid/stacked layouts where a colon after a centered label reads oddly.
- **Root cause**: Presentation is inferred from the human-readable label string rather than an explicit semantic prop. The `color`/`emphasis` props exist but the implicit lookup overrides intent for common English words.
- **Impact**: Unpredictable color semantics across the app, locale-fragile, and a hardcoded colon that is inappropriate for non-inline layouts. Hard for consumers to debug ("why is my number green?").
- **Fix sketch**: Drop the `defaultColors[label.toLowerCase()]` lookup (or gate it behind an opt-in `semantic` prop); default to neutral and let `color`/`changeType` drive styling. Make the trailing colon conditional on `layout === 'inline'`.

## 5. UniversalSelect dropdown is not screen-reader accessible (no listbox/option roles, no active-descendant)
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: accessibility / component API consistency
- **File**: src/components/ui/universal-select.tsx:192-221, 286-307
- **Scenario**: A screen-reader user tabs to the trigger. It is a bare `<button>` with no `role="combobox"`, `aria-haspopup`, `aria-expanded`, or `aria-controls`. The opened list (line 266) has no `role="listbox"`; options are `<button>`s with no `role="option"`/`aria-selected`, and the keyboard `highlightedIndex` is never exposed via `aria-activedescendant`. The component reimplements a full custom select instead of using Radix (which the design system already depends on for Collapsible).
- **Root cause**: Custom keyboard navigation was built (arrow/Home/End handling at lines 133-158) without the matching ARIA semantics, so the rich UX is invisible to AT. Inconsistent with the project's stated Radix-based primitive strategy.
- **Impact**: This is the app's shared select; every form using it is unusable/confusing for AT users despite working keyboard mechanics for sighted users. High blast radius, low visibility in manual sighted testing.
- **Fix sketch**: Add `role="combobox"` + `aria-expanded`/`aria-controls`/`aria-haspopup="listbox"` to the trigger, `role="listbox"` to the panel, `role="option"` + `aria-selected` per option, and `aria-activedescendant` pointing at the highlighted option's id. Longer term, consider building on Radix `Select`/`Popover` for parity with the other primitives.
