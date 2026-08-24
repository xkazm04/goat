# Dynamic Lazy Loading — design, and what actually landed

**Status**: ⚠️ NOT WIRED — design + partial primitives only
**Category**: Performance
**Impact**: none today (nothing calls the ladder)
**Date**: November 7, 2025
**Corrected**: 2026-08-24 (again, same day — see the second correction)

> ## Correction — 2026-08-24
>
> This document was headed `Status: ✅ Complete` and closed by claiming the
> system was "production-ready, fully tested". It was neither. A conformance
> audit checked every file and symbol it names against the tree:
>
> | claimed | reality |
> |---|---|
> | `hooks/useCollectionLazyLoad.ts` created | **does not exist**; the symbol `useCollectionLazyLoad` appears nowhere in `src/` |
> | `components/VirtualizedCollectionList.tsx` created | **does not exist** |
> | `CollectionPanel.tsx` "integrated lazy loading" | **not integrated**; that file imports nothing lazy, virtual, or observer-based |
> | the "Integration in CollectionPanel" code block below | **was never in `CollectionPanel.tsx`**; two of its three symbols do not exist |
> | `data-testid="lazy-load-trigger"` / `"lazy-load-spinner"` / `"virtualized-collection-list"` | **zero occurrences** in `src/` |
> | metrics: "90% reduction in initial render time", "60-80% memory savings" | **measure nothing that runs** |
>
> What DID land, and is real:
>
> - `constants/lazyLoadConfig.ts` — `LAZY_LOAD_CONFIG` plus the two ladder
>   predicates. The predicates had **no call site** and were deleted later the
>   same day; see the second correction. The observer fields
>   (`INTERSECTION_ROOT_MARGIN`, `INTERSECTION_THRESHOLD`) are live.
> - `components/LazyLoadTrigger.tsx` — real, and reads that config, but no
>   component renders it; only the feature barrel re-exports it.
> - `hooks/useIntersectionObserver.ts` — real and used elsewhere.
>
> Also corrected on this date: the ladder was implemented **twice**, and the two
> copies disagreed. `src/components/patterns/virtualization/useLazyLoad.ts` had
> its own `shouldUseLazyLoading` defaulting to a threshold of 50, while
> `lazyLoadConfig.ts` tested against the page size of 20. The duplicate has been
> removed and `lazyLoadConfig.ts` is now the one source, with an explicit
> `LAZY_LOAD_THRESHOLD` (50) separated from `LAZY_LOAD_PAGE_SIZE` (20).
>
> Everything below the correction is preserved as the original **design**. Read
> it as a proposal, not as a description of running code.

## Overview

A lazy loading design for Collection items that selects a rendering strategy
based on collection size.

## Design (not implemented)

### Architecture

The design calls for **three rendering strategies** selected by collection size.
The boundaries below reflect the consolidated thresholds
(`LAZY_LOAD_THRESHOLD` 50, `VIRTUALIZATION_THRESHOLD` 100); today every
collection takes the first row regardless of size, because nothing calls the
predicates.

| Collection Size | Strategy | Status | Use Case |
|----------------|----------|----------------|----------|
| **≤ 50 items** | Normal Rendering | **the only path that runs** | Small collections - instant display |
| **51-100 items** | Lazy Loading | designed, not wired | Medium collections - balanced performance |
| **> 100 items** | Virtual Scrolling | designed, not written | Large collections - maximum performance |

### Key Components

#### 1. **useCollectionLazyLoad Hook** (`hooks/useCollectionLazyLoad.ts`) — NOT WRITTEN
- Manages progressive loading state
- Slices items array based on loaded count
- Provides `loadMore()` callback for pagination
- Tracks progress (loaded/total items)
- Supports prefetching for smooth scrolling

**Key Features**:
```typescript
interface UseCollectionLazyLoadResult {
  visibleItems: CollectionItem[];        // Currently loaded items
  totalItems: number;                    // Total available
  loadedCount: number;                   // Number loaded so far
  hasMore: boolean;                      // More items available?
  isLoadingMore: boolean;                // Loading state
  loadMore: () => void;                  // Load next page
  loadProgress: number;                  // 0-100 percentage
  reset: () => void;                     // Reset to initial
  loadAll: () => void;                   // Load everything
}
```

#### 2. **useIntersectionObserver Hook** (`hooks/useIntersectionObserver.ts`)
- Wraps Intersection Observer API
- Detects when trigger element enters viewport
- Configurable root margin and threshold
- Enables/disables observation dynamically

**Key Features**:
```typescript
interface UseIntersectionObserverOptions {
  rootMargin?: string;      // e.g., '200px' - trigger before visible
  threshold?: number;       // 0.0-1.0 visibility percentage
  enabled?: boolean;        // Enable/disable observer
  onIntersect?: (isVisible: boolean) => void;  // Callback
}
```

#### 3. **LazyLoadTrigger Component** (`components/LazyLoadTrigger.tsx`)
- Invisible trigger element at list bottom
- Shows loading spinner when active
- Displays progress message
- Automatically calls `loadMore` on visibility

#### 4. **VirtualizedCollectionList Component** (`components/VirtualizedCollectionList.tsx`) — NOT WRITTEN
- Virtual scrolling for large collections
- Calculates visible range based on scroll position
- Only renders visible items + overscan buffer
- Dramatically reduces DOM nodes (e.g., 50 rendered vs 1000 total)

**Performance Benefits**:
- Reduces initial render time by 90%+ for large lists
- Lower memory usage (fewer DOM nodes)
- Smooth 60fps scrolling even with 1000+ items

#### 5. **Configuration** (`constants/lazyLoadConfig.ts`) — REAL, and the one threshold source

```typescript
export const LAZY_LOAD_CONFIG = {
  VIRTUALIZATION_THRESHOLD: 100,          // Switch to virtual scrolling
  LAZY_LOAD_THRESHOLD: 50,                // Engage lazy loading above this count
  LAZY_LOAD_PAGE_SIZE: 20,                // Items per page once engaged
  PREFETCH_COUNT: 10,                     // Prefetch ahead
  INTERSECTION_ROOT_MARGIN: '200px',      // Trigger 200px before viewport
  INTERSECTION_THRESHOLD: 0.1,            // Trigger at 10% visibility
  VIRTUAL_LIST: {
    ITEM_HEIGHT: 120,                     // Estimated item height
    OVERSCAN_COUNT: 5,                    // Items to render outside viewport
  },
  SCROLL_DEBOUNCE_MS: 150,                // Scroll event debounce
};
```

`LAZY_LOAD_THRESHOLD` and `LAZY_LOAD_PAGE_SIZE` are separate on purpose: the
activation threshold used to BE the page size, which meant the ladder engaged at
"more than one page" rather than "large enough to be worth paginating".

### Integration in CollectionPanel — PROPOSED, NEVER WRITTEN

The block below is the design's intended shape. It is **not** a quote from
`CollectionPanel.tsx`: that file contains none of this, and
`useCollectionLazyLoad` / `VirtualizedCollectionList` do not exist. Anyone
implementing the ladder starts here rather than finding this code in the tree.

```typescript
// 1. Determine rendering strategy
const useVirtualization = useMemo(
  () => shouldUseVirtualization(filteredItems.length),
  [filteredItems.length]
);

const useLazyLoading = useMemo(
  () => !useVirtualization && shouldUseLazyLoading(filteredItems.length),
  [useVirtualization, filteredItems.length]
);

// 2. Initialize lazy loading (if medium-sized)
const lazyLoad = useCollectionLazyLoad({
  items: filteredItems,
  enabled: useLazyLoading
});

// 3. Determine items to render
const itemsToRender = useMemo(() => {
  if (useVirtualization) return filteredItems;      // Virtual handles slicing
  if (useLazyLoading) return lazyLoad.visibleItems; // Lazy load slice
  return filteredItems;                             // Small: all items
}, [useVirtualization, useLazyLoading, filteredItems, lazyLoad.visibleItems]);

// 4. Render with appropriate strategy
{useVirtualization ? (
  <VirtualizedCollectionList items={itemsToRender} />
) : (
  <>
    {itemsToRender.map(item => <CollectionItem item={item} />)}
    {useLazyLoading && lazyLoad.hasMore && (
      <LazyLoadTrigger onVisible={lazyLoad.loadMore} />
    )}
  </>
)}
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ CollectionPanel receives filtered items         │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│ Determine strategy based on item count:         │
│ • < 20:    Normal rendering                     │
│ • 20-100:  Lazy loading                         │
│ • > 100:   Virtual scrolling                    │
└─────────────┬───────────────────────────────────┘
              │
              ▼
     ┌────────┴──────────┐
     │                   │
     ▼                   ▼
┌─────────┐      ┌──────────────┐
│ Lazy    │      │ Virtual      │
│ Loading │      │ Scrolling    │
└────┬────┘      └──────┬───────┘
     │                  │
     ▼                  ▼
┌──────────────────────────────┐
│ useCollectionLazyLoad        │
│ • Slice to loadedCount       │
│ • Provide loadMore callback  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ LazyLoadTrigger              │
│ • useIntersectionObserver    │
│ • Calls loadMore on visible  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Load next page + prefetch    │
│ • Update loadedCount         │
│ • Re-render with more items  │
└──────────────────────────────┘
```

## Performance Metrics — PROJECTED, NEVER MEASURED

> Nothing below was measured against this codebase. The "After" figures describe
> the design's expected behaviour; the ladder has never run, so no before/after
> comparison was possible. Treat them as the target to verify once tier 2 is
> wired, not as a result already achieved.

### Before (No Lazy Loading)
- **1000 items**: 2-3 second initial render
- **DOM nodes**: 1000+ elements
- **Memory**: High (~50MB for large collections)
- **Scroll performance**: Janky on lower-end devices

### After (With Lazy Loading)
- **1000 items**:
  - Initial render: < 100ms (only 20 items)
  - Progressive loading: 20 items every scroll
  - Virtual scrolling: ~50 DOM nodes total
- **Memory**: Reduced by 60-80%
- **Scroll performance**: Smooth 60fps

## Testing — PLANNED, NOT PRESENT

> Of the four test ids below, only `collection-panel` exists
> (`CollectionPanel.tsx:180`). `lazy-load-trigger`, `lazy-load-spinner` and
> `virtualized-collection-list` have zero occurrences in `src/`. The scenarios
> that follow have never been executed — there is no unit-test runner in this
> repo, and no e2e spec references any of these ids.

### Test IDs — proposed
All interactive elements should carry `data-testid` attributes:

```typescript
// LazyLoadTrigger
<div data-testid="lazy-load-trigger">
  <Loader2 data-testid="lazy-load-spinner" />
</div>

// VirtualizedCollectionList
<div data-testid="virtualized-collection-list">

// CollectionPanel
<div data-testid="collection-panel">
```

### Test Scenarios

1. **Small Collection (< 20 items)**
   - ✅ All items render immediately
   - ✅ No lazy load trigger appears
   - ✅ No virtual scrolling

2. **Medium Collection (20-100 items)**
   - ✅ First 20 items render
   - ✅ Lazy load trigger appears
   - ✅ Scrolling triggers more items to load
   - ✅ Progress indicator shows percentage

3. **Large Collection (> 100 items)**
   - ✅ Virtual scrolling activates
   - ✅ Only visible items rendered
   - ✅ Smooth scrolling maintained
   - ✅ Performance indicator shows "High performance mode"

## Configuration Guide

Adjust thresholds in `src/app/features/Collection/constants/lazyLoadConfig.ts`:

```typescript
// Make lazy loading more aggressive (load earlier)
INTERSECTION_ROOT_MARGIN: '400px',  // from '200px'

// Load more items per page
LAZY_LOAD_PAGE_SIZE: 30,            // from 20

// Switch to virtualization earlier
VIRTUALIZATION_THRESHOLD: 50,       // from 100

// Increase prefetch for faster networks
PREFETCH_COUNT: 20,                 // from 10
```

## Benefits

### User Experience
- ✅ Faster initial page load
- ✅ Smooth scrolling experience
- ✅ Progressive content display
- ✅ No blank loading screens
- ✅ Works on slow networks

### Developer Experience
- ✅ Simple configuration
- ✅ Zero breaking changes
- ✅ Automatic strategy selection
- ✅ Easy to extend
- ✅ Comprehensive TypeScript types

### Performance
- ✅ 90% reduction in initial render time
- ✅ 60-80% memory savings
- ✅ Maintains 60fps scrolling
- ✅ Efficient DOM node count

## Trade-offs & Considerations

### Pros
- Dramatic performance improvement for large collections
- Maintains excellent UX with prefetching
- Automatic strategy selection (no manual configuration needed)
- Backward compatible with existing code

### Cons
- Slightly increased complexity (3 rendering paths)
- Potential for loading delays on very slow networks
- Virtual scrolling requires estimated item heights
- Additional 5KB bundle size (hooks + components)

### Mitigation Strategies
- **Prefetching**: Loads items before user reaches them
- **Configurable thresholds**: Easy to adjust based on analytics
- **Fallback to normal rendering**: Small collections unaffected
- **Tree-shakeable**: Only used code is bundled

## Future Enhancements

1. **Dynamic height calculation** - Replace fixed ITEM_HEIGHT with measured heights
2. **Intelligent prefetch** - Adjust based on scroll velocity
3. **Background loading** - Use Web Workers for data processing
4. **Cache persistence** - Store loaded items in IndexedDB
5. **Network-aware loading** - Adjust page size based on connection speed

## Files — claimed vs verified (re-checked 2026-08-24)

| file | claimed | actual |
|---|---|---|
| `src/app/features/Collection/hooks/useCollectionLazyLoad.ts` | created | **absent** |
| `src/app/features/Collection/hooks/useIntersectionObserver.ts` | created | exists |
| `src/app/features/Collection/components/LazyLoadTrigger.tsx` | created | exists, **no consumer** |
| `src/app/features/Collection/components/VirtualizedCollectionList.tsx` | created | **absent** |
| `src/app/features/Collection/constants/lazyLoadConfig.ts` | created | exists; predicates have **no call site** |
| `src/app/features/Collection/hooks/useCollection.ts` | created | exists |
| `src/app/features/Collection/context/CollectionFiltersContext.tsx` | created | exists |
| `src/lib/api/collection.ts` | created | exists |
| `src/lib/query-keys/collection.ts` | created | exists |
| `src/app/features/Collection/components/CollectionPanel.tsx` | "integrated lazy loading" | exists; **no lazy/virtual/observer import** |
| `src/app/features/Collection/README.md` | updated | exists |

## Second correction — 2026-08-24 (later the same day)

The first correction recorded `src/lib/virtual/` as dead and deliberately did
not remove it, calling the removal an owner's judgement. That judgement has now
been made and the code is gone. This section reconciles the document to the
tree as it stands after that change, so the two corrections cannot be read as
disagreeing.

| named above | status now |
|---|---|
| `src/lib/virtual/` (6 modules, 2,118 lines) | **deleted** — commit `chore(dead-code): delete src/lib/virtual/ …` |
| `shouldUseVirtualization` / `shouldUseLazyLoading` | **deleted** — zero call sites, verified by grep and by knip |
| `LAZY_LOAD_CONFIG` | **kept** — its observer fields are live via `LazyLoadTrigger.tsx`, and its thresholds are the recorded intent for whoever wires the ladder |
| `src/app/features/Collection/components/LazyLoadTrigger.tsx` | **kept**, still with no consumer — a component is a decision about UI, not an obviously-inert helper, so it is left for an owner |
| `hooks/useIntersectionObserver.ts` | **kept** — real and used elsewhere |

The deletions were reversible in one operation and were shipped as their own
commits precisely so they can be reverted independently if the ladder is
finished from that direction instead.

## Conclusion

The three-tier design is sound; tiers 2 and 3 do not exist in wired form and
one of the two candidate implementations has now been removed rather than left
to rot. No collection has ever taken the lazy or virtual path.

To finish it: write `useCollectionLazyLoad`, build a `VirtualizedCollectionList`
(the deleted `src/lib/virtual/VirtualCollectionList` is recoverable from git
history if it is the better starting point), reinstate the two ladder
predicates **in the same change as their call site**, and call them from
`CollectionPanel`.

Until then the numbers in the Performance section are projections, not
measurements — they were reported here as results, which is the error this
document's corrections exist to stop repeating.
