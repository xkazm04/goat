# Result Image & Share Card — Combined UI+Bug Scan
> Context: Shareable result-image generation (AI artwork, medal styling, layout composition) for a finished ranking, plus the ShareModal export/share UI.
> Files scanned: 13 (+2 neighbors: image-styles.ts, types)
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Minimalist theme renders white text on a near-white gradient (illegible share card)
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: visual-consistency / a11y
- **File**: src/app/features/Match/ShareModal/ShareModal.tsx:296 (and :299 `color: "#ffffff"`)
- **Scenario**: User picks the "Minimalist" theme (it's one of the three `SHARE_THEME_KEYS`), clicks "Generate Preview", and downloads/shares. The hidden render template builds `linear-gradient(135deg, ${palette[0]}, ${palette[1]}, ${palette[2]})` = `#FFFFFF → #F8F9FA → #212529` while text color is hard-coded `#ffffff`. The top ~2/3 of the card is white text on white/off-white; the title, category line, and all item rows are effectively invisible.
- **Root cause**: The template assumes every theme is dark and hard-codes white foreground (`color: "#ffffff"`, plus `rgba(255,255,255,...)` glass panels), but the per-theme `colorPalette` (image-styles.ts) starts light for minimalist. There is no contrast-aware foreground selection — the codebase already has `getContrastColor()` in PlaceholderGenerator but it isn't used here.
- **Impact**: The exported PNG and the social share card are unreadable for an entire selectable theme — a broken, publicly-shared artifact.
- **Fix sketch**: Derive foreground from background luminance (reuse `PlaceholderGenerator.getContrastColor` / relative-luminance logic) instead of hard-coding `#ffffff`, or restrict `SHARE_THEME_KEYS` to dark-palette themes and add a per-theme `textColor` field to `StyleConfig`.

## 2. Size-preset downloads stretch/distort the 1200×630 card into wrong aspect ratios
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: edge-case / silent-failure
- **File**: src/app/features/Match/ShareModal/ShareModal.tsx:242-250
- **Scenario**: In preview step the user opens the size dropdown and picks "Instagram Square (1080×1080)" or "Instagram Portrait (1080×1350)". `handleDownload` re-runs `snapdom.toCanvas(renderRef.current, { width, height })` against the fixed 1200×630 template node. snapdom scales the captured 1.905:1 node to the requested 1:1 / 4:5 box, so the output is horizontally squashed and vertically stretched — text/medals visibly deformed. Only `og_default` (1200×630) matches the source ratio.
- **Root cause**: The render template has a single hard-coded 1200×630 geometry (lines 282-284), but the download path assumes you can retarget arbitrary dimensions by passing `width/height` to the rasterizer. Aspect-ratio mismatch is never reconciled (no re-layout, no letterboxing, no separate templates per preset).
- **Impact**: Three of four "platform-optimized" download options produce distorted, lower-quality images — the opposite of the feature's promise; users won't notice until after posting.
- **Fix sketch**: Render the template at the preset's actual dimensions (drive width/height/padding/font-size from the preset before capture), or capture at native ratio and letterbox/center-crop to the target instead of stretching. At minimum, only expose presets whose ratio matches the template.

## 3. Preview-capture failure leaves the user stuck on step 1 with no error feedback
- **Severity**: high
- **Lens**: bug-hunter / ui-perfectionist
- **Category**: silent-failure / polish (error state)
- **File**: src/app/features/Match/ShareModal/ShareModal.tsx:121-135
- **Scenario**: `handleGeneratePreview` calls `snapdom.toCanvas`. If snapdom throws (dynamic import fails offline, a cross-origin `item.image_url` taints the canvas, or CSP blocks the data URL), the `catch` only `console.error`s and `finally` clears `isCapturing`. `capturedImageUrl` stays null and `step` stays `"theme"`. The button simply flips from "Generating Preview..." back to "Generate Preview" with zero on-screen explanation. Clicking again repeats the silent failure.
- **Root cause**: A `shareError` state and a red error panel already exist (lines 82, 611-615) but are only wired to the link-creation path. The capture path swallows its error instead of surfacing it, assuming capture "always works."
- **Impact**: Dead-end UX — the user perceives a broken button with no recourse, and there's no signal (no toast, no retry hint, no fallback) that anything went wrong.
- **Fix sketch**: In the `catch`, set `shareError` (and render the existing error panel in the theme step) with an actionable message; consider falling back to the server `/api/match/generate-result-image` SVG composition when client capture fails.

## 4. Empty-/single-item layouts divide by zero and produce NaN cell geometry
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / state-corruption
- **File**: src/lib/image-gen/LayoutEngine.ts:553-554 (cascade) and BalanceOptimizer.ts:70 / LayoutEngine.ts:645
- **Scenario**: `generateCascadeCells` computes `offsetX = (usableWidth - baseWidth) / (itemCount - 1 || 1)` — the `|| 1` guards `itemCount === 1`, but for `itemCount === 0` the loop just produces no cells, and downstream `calculateVisualBalance`/`analyzeBalance` divide by `totalWeight` which is 0 → `NaN` center of mass. The route guards `matchedItems.length === 0` (route.ts:80), but `generateSmartComposition` is also reachable via auto-selected layouts where a single zero-area cell (e.g. a degenerate masonry/grid with `cols` rounding) yields `totalWeight = 0`. The resulting `NaN` flows into the Gemini prompt as `Center of Mass: (NaN, NaN)` (route.ts:418) and `balanceInfo.overallBalance` percentages become `NaN%`.
- **Root cause**: Geometry math assumes ≥2 well-formed, positive-area cells; there is no clamp/guard on `totalWeight === 0` in `calculateCenterOfMass` (BalanceOptimizer.ts:168-187 returns center only when `weights.length === 0`, not when all weights are 0) nor in `LayoutEngine.calculateVisualBalance`.
- **Impact**: Corrupted composition metadata and `NaN` literals injected into the AI prompt, degrading generation quality silently; potential `NaN` coordinates if any consumer renders cells directly.
- **Fix sketch**: Guard `totalWeight === 0` (return canvas center) in both center-of-mass calculations and clamp cell width/height to a positive minimum; short-circuit `analyzeBalance` for `cells.length === 0`.

## 5. In-memory cache & history grow unbounded per server instance and serve stale/cross-request data
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: state-corruption / latent-failure
- **File**: src/app/features/Match/lib/aiImageGenerator.ts:47-52, 79-88
- **Scenario**: `generationCache` and `generationHistory` are module-level singletons. The cache key (line 62-66) omits `request.dimensions` and `numVariations`, so a 1200×630 request and a 1080×1080 request with the same title/category/style/items collide — the second returns the first's wrong-sized image from cache. History/cache also persist across unrelated users sharing one server/worker (no user scoping), and `toggleFavorite`/`addToHistory` mutate shared module state.
- **Root cause**: Treating per-request generation results as process-global state with a cache key that doesn't capture all output-affecting inputs; assumption that one process == one user/session.
- **Impact**: Wrong-dimension cache hits (compounds finding #2), cross-user history/favorite leakage, and memory that only ever trims at 50/100 entries regardless of age — a slow leak and a correctness hazard under concurrency.
- **Fix sketch**: Include `dimensions.width/height` and `numVariations` in `generateCacheKey`; scope cache/history per user (or move to a request-scoped/store-backed location) and add TTL-based eviction rather than insertion-order-only trimming.
