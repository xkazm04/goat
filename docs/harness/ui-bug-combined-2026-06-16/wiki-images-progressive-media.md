# Wiki Images & Progressive Media — Combined UI+Bug Scan
> Context: Progressively resolves and loads item imagery from Wikipedia with placeholder/fallback handling for smooth rendering.
> Files scanned: 8
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Hook reads store imperatively without subscribing — async fetch only paints by accident
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: state-management / stale-state race
- **File**: src/hooks/use-progressive-wiki-image.ts:62-76
- **Scenario**: Component mounts for an item with no `src`. The hook subscribes only to the four *action* selectors (`getImage`, `isFetching`, `hasFailed`, `fetchImage` — all stable references) and then calls `getImage(itemTitle)` imperatively (line 71) to derive `imageUrl`. When the async `fetchImage` later writes the URL into `state.images`, the hook has no subscription to `images`/`fetching`/`failures`, so Zustand never re-renders the component from the store update.
- **Root cause**: Selecting the getter function instead of the derived value defeats Zustand's render subscription; the value is computed once per render from a Map the component does not watch.
- **Impact**: The fetched image surfaces only because the local `setIsFetching(false)` in `.finally()` (line 95) happens to trigger a re-render that re-runs `getImage`. Any consumer that doesn't auto-fetch (e.g. relies on another component populating the cache, or a sibling card sharing the same title) shows a stale "No Image" until an unrelated re-render. `hasFailed`/`isFetching` reads are likewise stale across components.
- **Fix sketch**: Subscribe to the actual data, e.g. `const cachedImage = useWikiImageStore((s) => s.images.get(itemTitle) ?? null)` and similarly derive `isStoreFetching`/`hasFailed` from `s.fetching`/`s.failures`, so store mutations drive re-renders deterministically instead of relying on the local `isFetching` toggle.

## 2. No category-aware `ImageFallback` wired into the progressive path — users get bare "No Image" text
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: missing-state / design-system drift
- **File**: src/components/ui/progressive-image.tsx:138-147 (and ItemCardImage.tsx:56-69)
- **Scenario**: An item has no `src` and Wikipedia returns nothing (very common for niche titles). `ItemCardImage` renders `<ProgressiveImage>` *without* passing `fallbackComponent`, so the fallback branch renders the default `<span className="text-xs text-gray-500">No Image</span>` on a flat `bg-gray-900` square. The polished, category-aware `ImageFallback` (gradient + initials) exists but is never wired into this path.
- **Root cause**: `ImageFallback` was built as the "unified" placeholder but the progressive consumer hardcodes a text fallback and `ItemCardImage` omits `fallbackComponent`; the two evolved independently.
- **Impact**: Grids of items with no resolvable image look broken/empty (rows of identical dark squares reading "No Image") instead of the intended branded gradient tiles — a visible quality regression on exactly the cohort the context exists to serve.
- **Fix sketch**: Have `ItemCardImage` pass `fallbackComponent={<ImageFallback title={itemTitle} category={category} />}` (threading a `category` prop) into both `ProgressiveImage` and `PlaceholderImage`, and make the default branch in `progressive-image.tsx` render `ImageFallback` rather than plain text.

## 3. `alt` is reused as the Wikipedia search term, triggering bogus/throwaway fetches
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: edge-case / wasted-network + cache pollution
- **File**: src/components/ui/progressive-image.tsx:58-63
- **Scenario**: When `itemTitle` is omitted, the component passes `itemTitle: itemTitle || alt` to the hook. Callers frequently set descriptive alt text (e.g. `"Image of The Matrix"`, or a localized/decorated label). That string becomes the Wikipedia `srsearch` term in `fetchWikipediaImage`, and the resolved (or failed) URL is cached in the persisted store keyed by that alt string.
- **Root cause**: Conflating the human-readable `alt` with the canonical search key; the store and failure-TTL cache are keyed by whatever string is passed.
- **Impact**: Wrong/garbage Wikipedia hits get cached and shown for items, and the 24h failure TTL is recorded against alt-text keys that no other code will ever look up — bloating `localStorage` and silently never resolving the real title. Two cards for the same item with different alt text fetch twice.
- **Fix sketch**: Require an explicit `itemTitle` for wiki auto-fetch and only fall back to `alt` when `autoFetchWiki` is off; or disable auto-fetch entirely when `itemTitle` is undefined rather than guessing from `alt`.

## 4. Placeholder layer renders even when no `placeholder` prop, leaving a flicker/blank gap then a hard pop-in
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: layout-shift / progressive-load polish
- **File**: src/components/ui/progressive-image.tsx:99-151
- **Scenario**: `ProgressiveImage` is used with a real `src` but no `placeholder` (the common case from `ItemCardImage`, which rarely supplies one). The blur-up `<motion.img>` is gated on `placeholder` being truthy (line 100), so it never shows. While the main image loads, only the generic `animate-pulse` gray block (line 149) is visible, then the image fades in over 0.4s with no blur-up easing.
- **Root cause**: Unlike its sibling `PlaceholderImage` (which synthesizes a deterministic default SVG placeholder via `getPlaceholder()`), `ProgressiveImage` has no default-placeholder fallback, so the blur-up effect silently no-ops.
- **Impact**: The two "progressive" components deliver visibly different loading experiences for the same data; `ProgressiveImage` gives a flat pulse-then-pop instead of the intended smooth blur-up, undermining the context's stated "smooth rendering" goal and creating design-system inconsistency.
- **Fix sketch**: Reuse `PlaceholderImage`'s `DEFAULT_PLACEHOLDERS` seeding logic (or a tiny blurhash/dominant-color data-URI) so a placeholder always exists, and key the seed on `itemTitle` for consistency.

## 5. Successful image swap (e.g. wiki resolves) shows old image until new one fully loads, with abrupt cut
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: stale-image state / src-change race
- **File**: src/components/ui/progressive-image.tsx:65-72, 118-136
- **Scenario**: `finalSrc` changes (wiki fetch resolves, or parent passes a new `src`). The `useEffect` on `[finalSrc]` sets `currentSrc` to the new URL and resets `imageLoaded=false`. Because the single `<motion.img>` element's `src` is swapped in place while `animate={{ opacity: imageLoaded ? 1 : 0 }}` snaps to 0, the previously-displayed image vanishes instantly and the container shows the pulse/empty state until the *new* image's `onLoad` fires. If the new URL is a broken Wikipedia link, `onError` flips to the "No Image" fallback after a visible gap.
- **Root cause**: Single mutable `<img>` with a binary opacity bound to `imageLoaded`; there's no cross-fade between outgoing and incoming sources, and no retention of the last good frame during the swap.
- **Impact**: On every src transition the user sees a flash to empty/pulse instead of a crossfade, and a transient broken-image gap when the resolved URL 404s — the opposite of "progressive". Most visible when wiki auto-fetch upgrades an item mid-scroll.
- **Fix sketch**: Render the new source in a second layered `<motion.img>` and only unmount the old one after the new one's `onLoad` (true crossfade), and keep the last successfully-loaded `currentSrc` visible until the replacement loads rather than clearing it on src change.
