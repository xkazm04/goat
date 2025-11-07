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
│   ├── CategoryBar.tsx               # Thin horizontal category bar (standalone)
│   ├── CollectionHeader.tsx          # Panel header with controls (standalone)
│   ├── CollectionSearch.tsx          # Search input component (standalone)
│   ├── CollectionStats.tsx           # Statistics display
│   ├── LazyLoadTrigger.tsx           # Intersection observer trigger
│   ├── VirtualizedCollectionList.tsx # Virtual scrolling component
│   └── AddItemModal.tsx              # Add item modal dialog
│
├── hooks/                            # Custom React hooks
│   ├── useCollection.ts              # Unified data fetching & mutations
│   ├── useCollectionFilters.ts       # Filtering and selection logic
│   ├── useCollectionStats.ts         # Statistics calculation
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

### 2. Category Bar (Top Bar)
- Replaces sidebar with thin horizontal bar
- Scrollable category pills/chips
- Visual selection indicators
- Item count badges

### 3. Dynamic Lazy Loading System ⚡
- **Three rendering strategies** based on collection size:
  - **Small (<20 items)**: Normal rendering for instant display
  - **Medium (20-100 items)**: Lazy loading with progressive pagination
  - **Large (>100 items)**: Virtual scrolling for optimal performance
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

### CategoryBar (Standalone)
- Displays groups as horizontal pills
- Handles group selection
- Shows item counts
- Scrollable for many groups
- Can be used independently or within CollectionToolbar

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

### CollectionSearch (Standalone)
- Search input with icon
- Clear button when typing
- Focus states
- Debounced input (can be added)
- Can be used independently or within CollectionToolbar

### LazyLoadTrigger
- Invisible trigger element at list bottom
- Uses Intersection Observer API
- Triggers `loadMore` callback when visible
- Shows loading spinner and progress

### VirtualizedCollectionList
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
    - Large: VirtualizedCollectionList
    ↓
useCollectionFilters (filters & selects)
    ↓
CollectionFiltersContext (provides to children)
    ↓
CategoryBar + CollectionSearch + CollectionItem (consume & display)
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

  // Transform groups if needed to match CollectionGroup type
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
```tsx
// Adjust thresholds in constants/lazyLoadConfig.ts
export const LAZY_LOAD_CONFIG = {
  VIRTUALIZATION_THRESHOLD: 100,  // Switch to virtual scrolling at 100+ items
  LAZY_LOAD_PAGE_SIZE: 20,        // Load 20 items per page
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




