# Design Tokens & Theming — Combined UI+Bug Scan
> Context: Design token definitions, dark-mode theme provider, and responsive layout primitives (collapsible panels, resizable handles).
> Files scanned: 13
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

## 1. Design tokens are dark-only `:root` values, so the `light` theme renders dark surfaces
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: dark-mode / token consistency
- **File**: src/app/design-tokens.css:10
- **Scenario**: `layout.tsx` registers `themes={['light', 'dark', 'experimental-dark']}` with `attribute="class"`. Select the `light` theme; `design-tokens.css` only defines its variables under `:root` (line 10), with no `.light`/`.dark`/`.experimental-dark` override blocks. Every token (`--surface-card: rgba(31,41,55,1)`, `--icon-default` slate-400, `--placeholder-color`, `--focus-offset` gray-900, etc.) is a hardcoded dark value.
- **Root cause**: The token contract was authored as a single dark palette under `:root` rather than as theme-scoped overrides, while `globals.css` (the `.experimental-dark` block at line 1175) correctly scopes its variables per theme. The two token systems disagree on how theming works.
- **Impact**: Cards, selects, stat cards, icons, focus rings, and placeholders keep dark backgrounds and offset colors in light mode — unreadable dark-on-light surfaces and broken focus-ring contrast for any user who picks `light`.
- **Fix sketch**: Move the dark values into a `.dark`/`:root` baseline and add `.light { --surface-card: …; --focus-offset: …; }` overrides (and `.experimental-dark` if it diverges), mirroring how `globals.css` scopes `--background`/`--border` per class. At minimum, drop `light` from the registered `themes` array if light mode is unsupported.

## 2. Theme-support fallback utility is dead code; the documented JS fallback never runs
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: silent failure / dead code
- **File**: src/lib/theme-support.ts:74
- **Scenario**: `theme-provider.tsx` doc comment (lines 11-12) claims it "Falls back to 'dark' theme if experimental-dark is not supported via CSS @supports." But the provider (line 17-23) is a bare pass-through to `NextThemesProvider` and imports nothing from `theme-support.ts`. `getSafeTheme`/`checkExperimentalDarkSupport`/`isExperimentalDarkAvailable` are exported but referenced nowhere in `src` (grep confirms only the file's own definitions plus `globals.css`/`layout.tsx` string matches).
- **Root cause**: The runtime detection layer was built and documented but never wired into the provider or a theme switcher; the actual fallback is handled entirely by the CSS `@supports not(...)` block in `globals.css:1205`.
- **Impact**: Misleading source of truth. The persisted `theme` in `localStorage` stays `experimental-dark` on unsupported browsers, the `console.warn` user-facing diagnostic never fires, and any future code trusting the doc comment will assume a JS guard that does not exist.
- **Fix sketch**: Either delete `theme-support.ts` (CSS `@supports` already covers fallback) or actually consume `getSafeTheme` in a `setTheme` wrapper / the provider so the documented behavior is real.

## 3. CollapsiblePanel mobile backdrop uses undefined `z-9`, dropping it below the panel
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: z-index / layering
- **File**: src/lib/layout/components/CollapsiblePanel.tsx:242
- **Scenario**: On mobile (`layout.isMobile`), the expanded panel renders a `fixed inset-0 bg-black/50 z-9` backdrop. The panel itself uses `zIndex: LAYOUT_Z_INDEX.sidebar` = `10` (constants.ts:240) via inline style. `globals.css` only defines `@utility z-sticky/z-toast/z-9999` (lines 188-191) — there is no `z-9` utility, so Tailwind 4 emits nothing and the backdrop gets the default `z-index: auto`.
- **Root cause**: A raw `z-9` class was assumed to map onto the project's named z-index scale, but the scale is token-based (`z-sticky`=200, `z-toast`=500); `z-9` is neither defined nor below the panel's `10` even if it existed.
- **Impact**: The dim/click-to-dismiss backdrop fails to layer correctly — either it sits at `auto` (below positioned panel content / page) so tap-to-close and the dimming effect break, or it unintentionally overlaps siblings. Mobile users can't reliably dismiss the sidebar by tapping outside.
- **Fix sketch**: Give the backdrop a defined token (e.g. a new `z-overlay` utility or inline `zIndex: LAYOUT_Z_INDEX.sidebar - 1`) and the panel a value above it, so backdrop < panel and both are above page content.

## 4. ResponsiveContainer ResizeObserver tears down and re-subscribes on every breakpoint change
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: race condition / effect churn
- **File**: src/lib/layout/components/ResponsiveContainer.tsx:72
- **Scenario**: The `useEffect` that creates the `ResizeObserver` lists `containerBreakpoint` in its dependency array (line 72) and also calls `setContainerBreakpoint` inside the observer callback (line 64). Each crossing of a container breakpoint changes `containerBreakpoint`, which disposes the observer and creates a new one. During the gap between `disconnect()` and the next `observe()`, resize events are dropped; if `onBreakpointChange` is an unstable inline callback (also a dep), the observer churns on every parent render.
- **Root cause**: Reading the latest `containerBreakpoint` for the equality check was solved by adding it as a dependency instead of using a ref, coupling subscription lifetime to the value it observes.
- **Impact**: Missed resize transitions (content for the correct breakpoint fails to swap until the next resize), redundant observer allocation, and potential flicker. Worse with inline `onBreakpointChange` props, which are common.
- **Fix sketch**: Keep the latest breakpoint in a `useRef`, compare against it inside the callback, and depend only on `[useContainerQueries]` (plus a stable/`useCallback`-wrapped `onBreakpointChange`) so the observer is created once.

## 5. CSS custom properties assigned raw numbers are silently dropped
- **Severity**: low
- **Lens**: ui-perfectionist
- **Category**: token / CSS correctness
- **File**: src/lib/layout/components/ResponsiveContainer.tsx:107
- **Scenario**: `containerStyle` sets `'--container-width': dimensions.contentWidth` and `'--container-height': dimensions.contentHeight` — both `number`s from the layout store (initially `0`, `LayoutDimensions.contentWidth`). React renders custom properties as-is, and a unitless number for a length variable is an invalid declaration; any downstream `width: var(--container-width)` resolves to an invalid/`0` length. `--grid-columns` (line 109) as a bare number is fine only if consumed in a unitless context.
- **Root cause**: Custom properties don't get React's automatic `px` suffixing (that only applies to known length props), so numeric layout dimensions need explicit units the way `minHeight` (line 110-111) already does.
- **Impact**: Container-query-driven sizing via `--container-width`/`--container-height` is inert; consumers reading these vars get no usable length, undermining the responsive primitive. Low because no in-scope consumer currently reads them, but it's a latent trap for anyone who does.
- **Fix sketch**: Emit `${dimensions.contentWidth}px` (and height) for the length vars, matching the `minHeight` handling on the same object; keep `--grid-columns` numeric only if always used unitless.
