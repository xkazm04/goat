# Landing & List Browsing — Combined UI+Bug Scan
> Context: Home page animated showcase + featured/trending list browsing entry point into ranking.
> Files scanned: 16
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. Hero showcase rows are not keyboard-accessible — primary "play list" action is mouse-only
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: accessibility / interaction
- **File**: src/app/features/Landing/FloatingShowcase.tsx:65
- **Scenario**: A keyboard or screen-reader user tabs through the hero showcase to start ranking a featured list. The list rows (`TableRow`) are clickable `motion.div`s with `onClick`/`onContextMenu` only — no `role`, no `tabIndex`, no `onKeyDown`, and the winner `<img>` uses empty `alt=""`. The row is unreachable and unactivatable without a mouse.
- **Root cause**: The interactive element was built as a styled `div` rather than a button, and the keyboard-accessible pattern used by the sibling `MosaicCard` (FeaturedListsSection.tsx:70-80, which has `tabIndex={0}` + `role="button"` + `aria-label`) was not carried over to the showcase rows.
- **Impact**: The most prominent ranking entry point on the home page is invisible to keyboard/AT users; the two surfaces that do the exact same thing behave inconsistently. WCAG 2.1.1 (Keyboard) failure on the first-impression screen.
- **Fix sketch**: Mirror the `MosaicCard` pattern on `TableRow`: add `role="button"`, `tabIndex={0}`, `aria-label={`Play ${list.title}`}`, and an `onKeyDown` that triggers `handleClick` on Enter/Space. Give the winner thumbnail a meaningful or explicitly decorative treatment consistent with intent.

## 2. Category "readiness" threshold can never be reached because the server caps each source at 50 while the client requests 80
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: data / cross-file logic
- **File**: src/app/api/lists/featured/route.ts:33
- **Scenario**: `LandingMain` marks a category "ready" only when its deduped count reaches `MIN_CATEGORY_ITEMS = 50` (LandingMain.tsx:24). All four callers request `*_limit: 80` (LandingMain.tsx:38-41, FloatingShowcase.tsx:228-231, FeaturedListsSection.tsx:222-226, useLandingPrefetch.ts:26-30), but the route silently clamps every limit to `MAX_LIMIT = 50` (route.ts:33) and additionally hard-slices awards to 10 (route.ts:126). After cross-source dedup the per-category total available is far below 50.
- **Root cause**: Two independently chosen magic numbers (client `80` / `MIN_CATEGORY_ITEMS 50` vs server cap `50`) with no shared constant; the readiness math assumes the requested volume is actually delivered.
- **Impact**: "Browse by Category" cards are stuck on "Coming soon" with a progress bar that asymptotes below 100% even for well-populated categories, mis-signaling the product as empty. The wasted request weight (80 vs honored 50) is also misleading.
- **Fix sketch**: Lower `MIN_CATEGORY_ITEMS` to a value reachable under the real cap, or raise/share the server `MAX_LIMIT`, and compute readiness from a count the server can actually return (ideally a dedicated count query rather than inferring from capped page slices).

## 3. Hero showcase renders three category tables in a non-wrapping flex row — broken on mobile
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: responsiveness
- **File**: src/app/features/Landing/FloatingShowcase.tsx:334
- **Scenario**: On a phone the three `CategoryTable`s are laid out as `<div className="flex gap-4">` with `flex-1 min-w-0` children and zero responsive breakpoint. At ~375px each table is ~110px wide; titles truncate to a few characters and the `Top N` badge crowds the row. The adjacent "Browse by Category" grid (LandingMain.tsx:119) is properly responsive (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), making the inconsistency obvious.
- **Root cause**: The hero was designed desktop-first as "three tables side by side" (per the file's own doc comment) and never got a stacked/wrapping mobile variant.
- **Impact**: The single most important above-the-fold module is cramped and hard to read on the largest traffic segment (mobile), undermining first impression.
- **Fix sketch**: Switch the wrapper to a responsive layout, e.g. `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` (or `flex flex-col lg:flex-row`), so tables stack on small screens and sit side-by-side on desktop.

## 4. Onboarding preview cards also crowd into a fixed 3-up flex row on mobile
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: responsiveness
- **File**: src/app/features/Landing/OnboardingHero.tsx:163
- **Scenario**: First-time visitors (the exact audience this hero targets) on mobile see three `PreviewCard`s forced into `<div className="flex gap-3 md:gap-4">` with no stacking. Sample item names like "Red Dead Redemption 2" and "Bohemian Rhapsody" truncate inside ~110px columns, defeating the card's purpose of "showing what a ranked list looks like."
- **Root cause**: Same desktop-first 3-column assumption as the showcase; cards rely on `flex-1` with no breakpoint to reflow.
- **Impact**: The educational onboarding moment is degraded precisely for new users on mobile, weakening activation.
- **Fix sketch**: Make the row responsive (`grid grid-cols-1 sm:grid-cols-3 gap-3` or `flex-col sm:flex-row`) so cards stack and remain legible on small screens.

## 5. Showcase always renders the first three config categories even when they have no data, showing permanent empty tables
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: empty-state / data-driven UI
- **File**: src/app/features/Landing/FloatingShowcase.tsx:32
- **Scenario**: `SHOWCASE_CATEGORIES` is hardcoded to the first three keys of `CATEGORY_CONFIG` (FloatingShowcase.tsx:32) and the hero always maps over exactly those three (FloatingShowcase.tsx:335). If one of those three categories has no featured lists, after loading completes its table renders a permanent "No lists in this category" mascot state (FloatingShowcase.tsx:205-210) while other categories that *do* have data are never surfaced in the hero.
- **Root cause**: The showcase selects categories by static config position rather than by which categories actually have content; the empty-state was treated as a transient case but here it is structural.
- **Impact**: The flagship hero can display dead/empty columns on a fresh or sparsely-seeded environment, wasting prime real estate and signaling an empty product.
- **Fix sketch**: Derive the showcased categories from `categoryLists` at render time — prefer the top N non-empty categories (sorted by count), falling back to config order only to fill remaining slots — so empty tables are never shown when populated alternatives exist.
