# Collection Feature - Architecture & Structure

## 📁 File Structure

```
Collection/
├── index.ts                           # Main exports
├── types.ts                           # TypeScript types and interfaces
├── IMPROVEMENTS.md                   # 10 Business/UI improvement ideas
│
├── components/                       # React components
│   ├── CollectionPanel.tsx           # Main panel component (fixed bottom)
│   ├── CollectionItem.tsx            # Draggable item component
│   ├── CollectionToolbar.tsx         # Unified toolbar (header + search + categories)
│   ├── CollectionHeader.tsx          # Panel header with controls (standalone)
│   ├── CollectionStats.tsx           # Statistics display
│   ├── LazyLoadTrigger.tsx           # Intersection observer trigger
│   ├── VirtualizedGrid.tsx           # Virtual scrolling grid component
│   └── AddItemModal.tsx              # Add item modal dialog
│
├── hooks/                            # Custom React hooks
│   ├── useCollection.ts              # Unified data fetching, filtering, stats & mutations
│   ├── useCollectionLazyLoad.ts      # Lazy loading pagination
│   └── useIntersectionObserver.ts    # Viewport detection
│
├── context/                          # React Context
│   └── CollectionFiltersContext.tsx  # Filter state provider
│
├── constants/                        # Configuration
│   └── lazyLoadConfig.ts             # Lazy load thresholds
│
└── utils/                            # Utility functions
    └── transformers.ts               # Data transformation
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
- **Intersection Observer**: Triggers loading when scrolling near bottom
- **Prefetching**: Loads items ahead of viewport for smooth experience
- **Progress indicators**: Shows loading state and completion percentage
- **Configurable thresholds**: Easy to adjust in `lazyLoadConfig.ts`

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
- **Selects rendering strategy** based on item count
- Integrates lazy loading and virtualization

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
> `shouldUseVirtualization`) have no call site — `CollectionPanel` renders every
> filtered item regardless of count. Changing these numbers has no effect today.
> See `docs/lazy-loading-implementation.md` for what exists and what does not.

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








