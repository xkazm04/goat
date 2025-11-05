# Match Feature Architecture

## Overview

The Match feature is the core ranking system of the GOAT application. It has been refactored into a modular, feature-based architecture that separates concerns and improves maintainability.

## Directory Structure

```
Match/
├── MatchContainer.tsx          # Main container with DnD context
├── MatchContainerContent.tsx   # Content layout wrapper
├── MatchContainerHeader.tsx    # Header with progress and actions
├── MatchGrid.tsx               # Grid wrapper component
├── MatchGridHeader.tsx         # Grid header controls
├── MatchGridToolbar.tsx        # Grid toolbar utilities
├── ComparisonModal.tsx         # Item comparison modal
├── MatchPodium/                # Top 3 podium components
│   ├── index.tsx
│   └── MatchGridPodium.tsx
├── MatchControls/              # Grid item control components
│   ├── index.tsx
│   ├── MatchGridSlot.tsx       # Unified slot component
│   ├── MatchEmptySlot.tsx      # Empty slot with drop zone
│   ├── MatchGridItem.tsx       # Filled grid item
│   ├── MatchGridItemEmpty.tsx  # Empty item placeholder
│   └── MatchGridItemControls.tsx # Drag/remove controls
├── MatchGrid/                  # Grid utilities and logic
│   └── lib/
│       ├── index.ts
│       ├── dragHandlers.ts     # DnD event handlers
│       ├── gridCalculations.ts # Position calculations
│       └── sizeMapping.ts      # Size configurations
├── MatchState/                 # Centralized state management
│   ├── index.ts
│   └── useMatchGridState.ts    # State aggregation hooks
└── components/                 # Supporting components
    ├── ResultImageGenerator.tsx
    └── ResultImageDownload.tsx
```

## Component Responsibilities

### Container Components

#### MatchContainer
- **Purpose**: Top-level container providing DnD context
- **Responsibilities**:
  - Initialize drag-and-drop sensors
  - Manage drag overlay rendering
  - Handle keyboard shortcuts for quick assignment
  - Coordinate drag start/move/end events
- **Dependencies**: `MatchContainerContent`, `MatchState`, `MatchGrid/lib`

#### MatchContainerContent
- **Purpose**: Layout wrapper for grid and backlog
- **Responsibilities**:
  - Arrange grid and sidebar layout
  - Manage comparison modal state
  - Coordinate header rendering
- **Dependencies**: `MatchGrid`, `BacklogGroups`, `MatchContainerHeader`

#### MatchGrid
- **Purpose**: Grid display orchestrator
- **Responsibilities**:
  - Render MatchGridPodium with list configuration
  - Handle grid animations
- **Dependencies**: `MatchPodium`

### Presentational Components

#### MatchPodium (MatchGridPodium)
- **Purpose**: Render the full ranking grid (top 3 + remaining positions)
- **Responsibilities**:
  - Configure podium layout (gold/silver/bronze)
  - Render grid sections with appropriate sizing
  - Handle position-based animations
  - Manage grid item click handlers
- **Dependencies**: `MatchGridSlot`, `MatchPodiumItem`

#### MatchControls

##### MatchGridSlot
- **Purpose**: Unified slot component (empty or filled)
- **Responsibilities**:
  - Route to MatchEmptySlot or MatchGridItem based on state
  - Handle transition animations between empty/filled states
  - Manage celebration effects on item assignment
- **Dependencies**: `MatchEmptySlot`, `MatchGridItem`

##### MatchEmptySlot
- **Purpose**: Empty grid position with drop zone
- **Responsibilities**:
  - Render droppable area with visual feedback
  - Show keyboard shortcut hints
  - Display drag preview indicators
  - Handle position validation highlighting
- **Dependencies**: Store hooks

##### MatchGridItem
- **Purpose**: Filled grid position with item content
- **Responsibilities**:
  - Render item card with image/title
  - Provide drag handle and remove controls
  - Handle draggable state
- **Dependencies**: `MatchGridItemControls`

##### MatchGridItemControls
- **Purpose**: Control overlay for grid items
- **Responsibilities**:
  - Render drag handle indicator
  - Provide remove button
  - Show swap indicator during drag-over
- **Dependencies**: Lucide icons

### Domain Utilities

#### MatchGrid/lib

##### dragHandlers.ts
- **Purpose**: DnD event handler factories
- **Exports**:
  - `createDragStartHandler()` - Initialize drag operation
  - `createDragMoveHandler()` - Handle drag movement
  - `createDragEndHandler()` - Complete drag operation
  - `findActiveBacklogItem()` - Locate dragged item in backlog
  - `findActiveItemGroupId()` - Find group ID for active item

##### gridCalculations.ts
- **Purpose**: Grid position and statistics calculations
- **Exports**:
  - `getNextAvailablePosition()` - Find first empty slot
  - `getLastAvailablePosition()` - Find last empty slot
  - `isPositionAvailable()` - Validate position availability
  - `calculateGridCompletion()` - Calculate fill percentage
  - `getGridStatistics()` - Aggregate grid stats
  - `isValidGridPosition()` - Validate position bounds
  - `getPositionTier()` - Determine position tier (top3/mid/low)

##### sizeMapping.ts
- **Purpose**: Size configurations and styling
- **Exports**:
  - `getSizeClasses()` - Get Tailwind classes for size variant
  - `getSizeForPosition()` - Determine size based on position
  - `getGridLayoutClasses()` - Get layout classes for sections
  - `getRankBadgeColor()` - Get color config for rank badges

### State Management

#### MatchState (useMatchGridState)
- **Purpose**: Centralized state aggregation and memoization
- **Exports**:
  - `useMatchGridState()` - Full state and actions
  - `useMatchGridActions()` - Actions only
  - `useMatchGridSelectors()` - Read-only state

**Aggregated State**:
- Grid items and active item
- Selected backlog/grid items
- Keyboard mode state
- Current list metadata
- Backlog groups
- Grid statistics (derived)
- Drag state flags (derived)

**Benefits**:
- Single subscription point for components
- Memoized derived state
- Reduced prop drilling
- Optimized re-renders

## Data Flow

### Item Assignment Flow

```
1. User drags backlog item
   └─> MatchContainer.handleDragStart()
       └─> setActiveItem(itemId)

2. User drops on empty slot
   └─> MatchContainer.handleDragEnd()
       └─> useItemStore.handleDragEnd()
           └─> assignItemToGrid(item, position)
               └─> Update gridItems array
               └─> Update backlog item.matched = true

3. MatchGridSlot detects change
   └─> Transition from MatchEmptySlot to MatchGridItem
       └─> Play celebration animation
```

### Keyboard Assignment Flow

```
1. User selects backlog item
   └─> BacklogItem.onClick()
       └─> setSelectedItemId(itemId)

2. User presses number key (1-9, 0)
   └─> MatchContainer keyboard listener
       └─> setKeyboardMode(true)
       └─> quickAssignToPosition(position)
           └─> assignItemToGrid(selectedItem, position)
```

### Drag State Flow

```
MatchContainer (DnD Context)
    ↓ activeItem
MatchGrid/lib/dragHandlers
    ↓ findActiveBacklogItem()
DragOverlay (BacklogItem rendering)

MatchGridSlot (each position)
    ↓ isDraggingBacklogItem
MatchEmptySlot
    ↓ Visual feedback (glow, preview)
```

## Integration Points

### External Dependencies

- **Stores**: `useItemStore`, `useMatchStore`, `useListStore`, `useBacklogStore`
- **Backlog Feature**: `BacklogItem`, `BacklogGroups`
- **UI Components**: `framer-motion`, `@dnd-kit/core`, `lucide-react`
- **Types**: `GridItemType`, `GridSection`, `PodiumConfig`

### Event Handlers

- **Drag Events**: Start, Move, End
- **Keyboard Events**: Number keys (1-0), Escape
- **Click Events**: Grid item click, Remove button
- **Drop Events**: Grid slot drop zones

## Performance Optimizations

1. **Memoization**:
   - Drag handlers wrapped in `useMemo`
   - Active item lookup memoized
   - Derived state computed once per render

2. **Selective Subscriptions**:
   - Components subscribe only to needed store slices
   - useMatchGridState provides granular selectors

3. **Animation Optimization**:
   - Celebration effects limited to transitioning slots
   - Layout animations use `layout` prop for GPU acceleration
   - Drag overlay uses fixed positioning

4. **Lazy Evaluation**:
   - Grid sections render only if positions exist
   - Empty slots defer heavy calculations until drag

## Patterns and Conventions

### Naming Conventions

- **Components**: PascalCase (e.g., `MatchGridSlot`)
- **Utilities**: camelCase (e.g., `createDragStartHandler`)
- **Hooks**: camelCase with `use` prefix (e.g., `useMatchGridState`)
- **Constants**: SCREAMING_SNAKE_CASE (in config files)

### Import Patterns

```typescript
// Feature exports via index files
import { MatchGridPodium } from './MatchPodium';
import { MatchGridSlot, MatchEmptySlot } from './MatchControls';
import { useMatchGridState } from './MatchState';
import { createDragStartHandler, getSizeClasses } from './MatchGrid/lib';

// External dependencies
import { useItemStore } from '@/stores/item-store';
import { GridItemType } from '@/types/match';
```

### Component Composition

```typescript
// Container pattern
MatchContainer
  └─> MatchContainerContent
      ├─> MatchGrid
      │   └─> MatchGridPodium
      │       └─> MatchGridSlot (x N)
      │           ├─> MatchEmptySlot (if empty)
      │           └─> MatchGridItem (if filled)
      └─> BacklogGroups
```

## Testing Strategy

### Unit Tests
- Utility functions in `MatchGrid/lib/`
- State management hooks
- Calculation functions

### Integration Tests
- Drag-and-drop operations
- Keyboard assignment flow
- Grid state transitions

### E2E Tests
- Complete ranking workflow
- Multi-item assignment
- Error states and validation

## Future Enhancements

### Planned Features
1. **Undo/Redo System**: Track grid history for undo operations
2. **Bulk Operations**: Multi-select and bulk assign items
3. **Grid Templates**: Save/load grid configurations
4. **Collaborative Ranking**: Real-time multi-user ranking

### Technical Debt
1. Migrate remaining legacy components to new structure
2. Add comprehensive TypeScript types for all utilities
3. Implement error boundaries for graceful failure handling
4. Add performance monitoring for drag operations

## Migration Guide

### From Legacy Structure

**Old Import**:
```typescript
import MatchGridPodium from './MatchGridPodium';
import { useItemStore } from '@/stores/item-store';
import { useMatchStore } from '@/stores/match-store';
```

**New Import**:
```typescript
import { MatchGridPodium } from './MatchPodium';
import { useMatchGridState } from './MatchState';
```

**Old Pattern**:
```typescript
const activeItem = useItemStore(state => state.activeItem);
const gridItems = useItemStore(state => state.gridItems);
const keyboardMode = useMatchStore(state => state.keyboardMode);
```

**New Pattern**:
```typescript
const { activeItem, gridItems, keyboardMode } = useMatchGridState();
```

## Related Documentation

- [Backlog Feature](../Backlog/README.md)
- [Store Architecture](../../../stores/README.md)
- [DnD Implementation](./docs/drag-and-drop.md)
- [Grid Calculations](./MatchGrid/lib/README.md)

---

**Last Updated**: October 25, 2024
**Architecture Version**: 2.0 (Modular Refactor)
**Contributors**: Claude Code Agent
