# List Preview & Prefetch — Combined UI+Bug Scan
> Context: Hover/scroll list-preview popovers, thumbnails, prefetching, and progress indicators for snappy browsing.
> Files scanned: 13
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. AnimatePresence cannot animate exit because content unmounts instantly
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: animation / component-architecture
- **File**: src/app/features/Landing/sub_LandingLists/ListPreviewPopover.tsx:54-98
- **Scenario**: User hovers a list card, the popover opens, then moves the mouse away. The popover vanishes with no exit animation (just pops out).
- **Root cause**: `AnimatePresence` wraps `HoverCard.Portal` unconditionally, but Radix `HoverCard.Content` is what mounts/unmounts based on open state. When the card closes, Radix removes `Content` (and the `motion.div` inside it) from the tree immediately; `AnimatePresence` never sees a child being removed from *its own* direct children, so the `exit` variant on the inner `motion.div` never runs. The `initial`/`animate` enter animation also fights Radix's own mount timing.
- **Impact**: The carefully authored exit transition (opacity/scale/translate) is dead code; closing feels abrupt and inconsistent with the polished enter animation. Reduced-motion intent is also unhandled here (no `prefersReducedMotion` gate as exists in RankingProgressIndicator).
- **Fix sketch**: Use Radix's controlled `open` state (`HoverCard.Root open={open}`) and put `AnimatePresence` *inside* with the `motion.div` conditionally rendered on `open` (with `forceMount` on `Content`), so AnimatePresence directly owns the mount/unmount. Alternatively use `data-state`-driven CSS transitions instead of Framer exit.

## 2. `endHover` orphans the pending fetch timeout and permanently arms fetching
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race-condition / timing
- **File**: src/hooks/use-list-preview.ts:46-72
- **Scenario**: User hovers a card briefly (under `hoverDelay`) and leaves; or rapidly hovers many cards in a grid. `startHover` sets a timeout and stores it via `setHoverTimeout`. Because `hoverTimeout` is React state (async), a second `startHover` before re-render overwrites the local closure's stale `hoverTimeout`, and `endHover` clears only the value captured at its last render.
- **Root cause**: Timer handle is held in `useState` (re-render latency) instead of a `useRef`, so `clearTimeout` can target a stale handle during fast hover sequences. Additionally `setShouldFetch(true)` is never reset on `endHover` ("Keep shouldFetch true" comment), so after the first hover the query stays `enabled` forever and silently refetches on every mount/focus/staleness for *every* card the user ever grazed.
- **Impact**: Stray timers fire after the pointer has left (fetching previews the user no longer wants), and a grid of N hovered cards keeps N queries permanently enabled — defeating the lazy-load intent and multiplying network/Supabase load. Also a cleanup leak: no `useEffect` clears the timeout on unmount.
- **Fix sketch**: Store the timeout in a `useRef`, clear it in `endHover` and in a `useEffect(() => () => clearTimeout(ref.current), [])` unmount cleanup. Don't keep `shouldFetch` latched — rely on TanStack's `staleTime` cache for re-hover speed instead of leaving queries enabled forever.

## 3. "Avg rank" preview stat is computed from positions and is structurally meaningless
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data-correctness / silent-failure
- **File**: src/hooks/use-list-preview.ts:102-115 (consumed at ListPreviewPopover.tsx:185-190)
- **Scenario**: Any list preview that renders. The "avg rank" badge shows a value derived from `item.position ?? item.ranking`.
- **Root cause**: `TopListItem` (src/types/top-lists.ts:25-33) has only `position`, never `ranking`; the `item.ranking` branch is unreachable dead code. The function then averages the *positions* of the returned items — for a fully-ranked list of size N this is always ~`(N+1)/2`, conveying no information, and for partially ranked lists it averages whatever subset was returned. It is labeled "avg rank" to users as if it were a quality/popularity signal.
- **Impact**: Users see a confident-looking statistic ("#5") that is mathematically vacuous and identical across same-size lists; erodes trust in the preview. The unreachable `?? item.ranking` branch also masks the intent and hides that no real ranking metric exists.
- **Fix sketch**: Either remove the avg-rank badge, or back it with a real metric (e.g., average user vote position, completion, or popularity) from the API; drop the non-existent `ranking` field reference. If kept, label it accurately ("median position" etc.) and guard against single-item lists.

## 4. Thumbnail batch endpoint orders by a column on the wrong table, breaking "first image"
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: data-correctness / API
- **File**: src/app/api/lists/thumbnails/route.ts:29-49
- **Scenario**: A grid of list cards requests batched thumbnails. The endpoint relies on `.order('ranking', { ascending: true })` so that the *first* row per `list_id` is the top-ranked item's image.
- **Root cause**: The select is `.from('list_items').select('list_id, items!inner(image_url)')`, but `ranking` must be a column on the queried (`list_items`) table for `.order` to apply. If the ranking column lives on `items` (or is named `position`/`rank`), the order is silently ignored or errors are swallowed (`if (error) return successResponse({})`), so the "first image" becomes whatever order the DB returns — often not the #1 item. There is also no per-list cap, so a 10k-item list streams every row just to pick one image.
- **Impact**: Thumbnails may show a random/low-ranked item instead of the list's hero image, inconsistent with the popover's top-N mosaic. The blanket error→empty-object handling means a malformed order clause degrades to "no thumbnails" with no user-visible signal.
- **Fix sketch**: Confirm the ranking column name/owner; if it's on `items`, order via the joined relation or add the column to the select. Add `DISTINCT ON (list_id)` (or a window/limit) so only the top row per list is fetched, and surface a real error rather than always returning `{}`.

## 5. Thumbnail mosaic skeleton/slots desync because `imageCount`-padding and filtered images disagree
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: loading-state / visual-consistency
- **File**: src/app/features/Landing/sub_LandingLists/ListPreviewThumbnail.tsx:89-122, 207-266
- **Scenario**: A list whose top items have images that 404 at render time (CDN miss, broken `image_url`). The skeleton reserves `imageCount` cells; after load, `MosaicImage` returns `null` on `onError`, leaving a hole the placeholder padding can't fill because padding count is computed from the pre-error `itemImages.length`, not the post-error rendered count.
- **Root cause**: Padding math (`imageCount - imagesToShow`) is derived from the query-selected array length, but each `MosaicImage` can independently remove itself via `hasError` state after mount. The parent has no knowledge of children that errored, so the flex-wrap layout collapses asymmetrically and `row` size (`h-full flex-1`) can produce uneven tiles. The `key={item.id}` is fine, but errored tiles leave gaps with no fallback icon.
- **Impact**: Broken-image lists render lopsided mosaics (gaps, mis-sized tiles) instead of the intended uniform grid; jarring versus the clean placeholder path. The `row` variant's `imageClass` (`flex-1`) also differs structurally from the wrap-based `sm/md/lg` variants, so a single errored image distorts the whole row.
- **Fix sketch**: Lift error state to the parent (or render a category-icon fallback *inside* `MosaicImage` instead of returning `null`) so every reserved slot always paints something; compute padding against the final visible count. Verify the `row` flex layout against the wrapped variants for a consistent tile aspect.
