# Collection Feature - Architecture & Structure

> ## Correction — 2026-08-24
>
> The file tree below was hand-maintained and had drifted in both directions.
> It named four files that **do not exist** — `CollectionItem.tsx`,
> `CollectionHeader.tsx`, `VirtualizedGrid.tsx`, `useCollectionLazyLoad.ts`
> (the last two are the same two phantoms `docs/lazy-loading-implementation.md`
> was corrected for) and `IMPROVEMENTS.md` — while omitting **seventeen** files
> that do. It is replaced below by the live tree, and the sections that describe
> the lazy-loading ladder are marked for what they are: a design, not a
> description.
>
> This README is now a **derived coupling target**: any change under
> `src/app/features/Collection/` is checked against it by
> `npm run docs:coupling -- --changed` (colocated-README convention). That is
> what produced this correction — the deletion of the unadopted pattern library
> reached this file and the gate said so.

## 📁 File Structure

Verified against the tree on 2026-08-24.

```
Collection/
├── index.ts                            # Main exports
├── types.ts                            # TypeScript types and interfaces
├── README.md                           # this file
│
├── components/                         # React components
│   ├── ActivityTimeline.tsx
│   ├── AddItemModal.tsx                # Add item modal dialog
│   ├── AverageRankingBadge.tsx
│   ├── CollectionErrorBoundary.tsx
│   ├── CollectionFilterIntegration.tsx
│   ├── CollectionPanel.tsx             # Main panel component (fixed bottom)
│   ├── CollectionStats.tsx             # Statistics display
│   ├── CollectionToolbar.tsx           # Unified toolbar (header + search + categories)
│   ├── ConfigurableCollectionItem.tsx  # Draggable item component
│   ├── CriteriaScoringSection.tsx
│   ├── DragHandleIndicator.tsx
│   ├── FocusRingOverlay.tsx
│   ├── ItemDetailPopup.tsx
│   ├── ItemDetailPopupProvider.tsx
│   ├── ItemInspector.tsx
│   ├── ItemInspectorProvider.tsx
│   ├── LazyLoadTrigger.tsx             # Intersection observer trigger — SEE BELOW,
│   │                                   #   it has no consumer
│   ├── MetadataGrid.tsx
│   ├── MiniTrajectoryChart.tsx
│   ├── RankingDistribution.tsx
│   ├── SpotlightTooltip.tsx
│   └── StickyContext.tsx
│
├── hooks/                              # Custom React hooks (see hooks/README.md)
│   ├── useCollection.ts                # Unified data fetching, filtering, stats & mutations
│   ├── useCollection.usage-examples.tsx  # NOT a test — reference samples, renamed
│   │                                     #   2026-08-24 so it stops impersonating one
│   ├── useCollectionFilterState.ts
│   ├── useIntersectionObserver.ts      # Viewport detection
│   ├── useQuickSelect.ts               # `q` + digits quick placement
│   └── useVisibleCollectionItems.ts
│
├── context/                            # React Context (see context/README.md)
│   └── CollectionFiltersContext.tsx    # Filter state provider
│
├── constants/                          # Configuration
│   └── lazyLoadConfig.ts               # Lazy load thresholds — declared, mostly unread
│
├── lib/
│   └── adaptiveLoader.ts               # orphaned; in knip's population
│
└── utils/                              # Utility functions
    ├── easterEgg.ts
    └── transformers.ts                 # Data transformation
```

## 🎯 Key Features

### 1. Fixed Bottom Panel
- Always visible at bottom of screen
- Smooth show/hide animation
- Backdrop blur for modern look
- Proper z-index layering

### 2. Category Bar (Integrated in CollectionToolbar)
- Thin horizontal bar integrated into CollectionToolbar
- Scrollable category pills/chips with animated entrance
- Visual selection indicators with highlight effects
- Item count badges
- Staggered entrance animation on initial load
- Layout animations for reordering

### 3. Dynamic Lazy Loading System — DESIGNED, NOT WIRED ⚠️
- **Three rendering strategies** planned, selected by collection size:
  - **Small (≤50 items)**: Normal rendering — *the only path that runs today*
  - **Medium (51-100 items)**: Lazy loading with progressive pagination — not wired
  - **Large (>100 items)**: Virtual scrolling — not written
- **Intersection Observer**: `hooks/useIntersectionObserver.ts` is real and used
- **Prefetching / progress indicators**: *designed, not implemented* — no
  component renders a progress indicator for this ladder
- **Configurable thresholds**: declared in `lazyLoadConfig.ts`; as of 2026-08-24
  only the observer fields (`INTERSECTION_ROOT_MARGIN`,
  `INTERSECTION_THRESHOLD`) are read by anything

> **Corrected 2026-08-24.** `components/LazyLoadTrigger.tsx` exists and reads the
> config, but **no component renders it** — the feature barrel is its only
> reference. A second, more complete answer to the same problem
> (`src/lib/virtual/`, ~2,100 lines) was written and also never wired; it was
> deleted in commit `615d25e`. A third (`src/components/patterns/virtualization/
> useLazyLoad.ts`) was deleted today. This ladder has now been designed three
> times and wired zero times, which is the finding, not the file count.

### 4. Modular Architecture
- **Components**: Reusable, focused components
- **Hooks**: Business logic separated from UI
- **Types**: Centralized type definitions
- **Easy to extend**: Add new features without breaking existing code

## 🔧 Component Responsibilities

### CollectionPanel
- Main orchestrator component
- Manages visibility state
- Coordinates child components
- Handles layout and positioning
- ~~**Selects rendering strategy** based on item count~~ — *corrected 2026-08-24:
  it does not. `CollectionPanel.tsx` imports nothing lazy, virtual or
  observer-based; it renders every filtered item.*
- ~~Integrates lazy loading and virtualization~~ — *corrected 2026-08-24: neither
  is integrated anywhere in this feature.*

### CollectionToolbar
- **Unified component** consolidating header, category bar, and search
- Single point of control for all toolbar functionality
- Delegates actions upward through callbacks
- Provides consistent spacing and theming
- Configurable sections (can hide category bar or search)
- Reduces navigation depth and simplifies styling
- **Integrated category bar** with:
  - AnimatePresence for smooth transitions
  - Staggered entrance animation on initial load
  - Highlight pulse effect when groups are reordered
  - Layout animations for position changes

### CollectionItem
- Draggable item component
- Supports grid and list view modes
- Handles drag state
- Image and title display

### CollectionHeader (Standalone)
- Panel header with controls
- Toggle visibility button
- View mode switcher (grid/list)
- Select all/clear buttons
- Can be used independently or within CollectionToolbar

### LazyLoadTrigger
- Invisible trigger element at list bottom
- Uses Intersection Observer API
- Triggers `loadMore` callback when visible
- Shows loading spinner and progress

### VirtualizedGrid
- Virtual scrolling for large collections
- Only renders visible items + overscan
- Calculates viewport and positions items
- Dramatically reduces DOM nodes for 1000+ items

## 🎨 Design Principles

1. **Fixed Positioning**: Panel always accessible at bottom
2. **Horizontal Layout**: Categories as top bar, not sidebar
3. **Responsive**: Adapts to screen size
4. **Accessible**: Keyboard navigation ready
5. **Performant**: Memoized hooks, optimized renders

## 📊 Data Flow

```
useCollection Hook (TanStack Query)
    ↓
Fetches groups & items from API
    ↓
CollectionPanel (receives data)
    ↓
Determines rendering strategy:
    - Small: Render all items
    - Medium: useCollectionLazyLoad → LazyLoadTrigger
    - Large: VirtualizedGrid
    ↓
useCollection (unified filtering, stats & data)
    ↓
CollectionFiltersContext (provides to children)
    ↓
CollectionToolbar + CollectionItem (consume & display)
```

## ⚡ Lazy Loading Flow

```
1. CollectionPanel checks item count
   ↓
2. If 20-100 items:
   - useCollectionLazyLoad initializes with pageSize=20
   - Renders first 20 items
   - Places LazyLoadTrigger below
   ↓
3. User scrolls down
   ↓
4. LazyLoadTrigger enters viewport
   ↓
5. useIntersectionObserver detects visibility
   ↓
6. Calls loadMore() callback
   ↓
7. Hook loads next 20 items + 10 prefetch
   ↓
8. Component re-renders with 50 visible items
   ↓
9. Repeat until all items loaded or user stops scrolling
```

## 🚀 Usage

### Basic Usage (Auto-fetches data)
```tsx
import { CollectionPanel } from '@/app/features/Collection';

function MyComponent() {
  return (
    <CollectionPanel
      category="movies"
      subcategory="action"
    />
  );
}
```

### With External Groups (Backward Compatible)
```tsx
import { CollectionPanel } from '@/app/features/Collection';
import { useBacklogStore } from '@/stores/backlog-store';

function MyComponent() {
  const groups = useBacklogStore(state => state.groups);

  // Transform groups if needed to match ItemCategory type
  const collectionGroups = groups.map(group => ({
    id: group.id,
    name: group.name,
    items: group.items || [],
    category: group.category,
    subcategory: group.subcategory
  }));

  return <CollectionPanel groups={collectionGroups} />;
}
```

### Configuring Lazy Loading

> **Not wired.** The ladder predicates (`shouldUseLazyLoading`,
> `shouldUseVirtualization`) had no call site and were **deleted on
> 2026-08-24** — `CollectionPanel` renders every filtered item regardless of
> count, and changing the numbers below still has no effect today. Reinstate
> the predicates in the same change as their first call site, never ahead of
> it. See `docs/lazy-loading-implementation.md` for what exists and what does
> not.

`constants/lazyLoadConfig.ts` is the single threshold source (a duplicate ladder
in `components/patterns/virtualization/useLazyLoad.ts` was removed 2026-08-24):

```tsx
export const LAZY_LOAD_CONFIG = {
  VIRTUALIZATION_THRESHOLD: 100,  // Switch to virtual scrolling above 100 items
  LAZY_LOAD_THRESHOLD: 50,        // Engage lazy loading above 50 items
  LAZY_LOAD_PAGE_SIZE: 20,        // Load 20 items per page once engaged
  PREFETCH_COUNT: 10,             // Prefetch 10 items ahead
  INTERSECTION_ROOT_MARGIN: '200px', // Trigger 200px before scroll
  // ... more config
};
```

## 🔄 Migration Notes

- Old `SimpleCollectionPanel` replaced with new `CollectionPanel`
- Sidebar removed, replaced with top category bar
- All functionality preserved with improved UX
- Backward compatible with existing group data structure

## 📝 Future Enhancements

See `IMPROVEMENTS.md` for 10 detailed improvement ideas including:
- Smart category suggestions
- Bulk selection
- Advanced filtering
- Item preview modal
- Favorites & collections
- Keyboard shortcuts
- And more...








