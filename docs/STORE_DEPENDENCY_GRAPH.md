# Store Dependency Graph

## Overview

The GOAT application uses 17 Zustand stores for state management. This document maps the dependencies between stores to help developers understand the architecture and guide the migration to the centralized orchestration layer.

## Store Categories

### Core Match Stores (High Coordination)
These stores are tightly coupled and require atomic operations:

1. **match-store** - UI state, keyboard navigation, session orchestration
2. **grid-store** - Grid state (50 positions max), drag-and-drop handlers
3. **session-store** - Session persistence, backlog management
4. **comparison-store** - Item comparison modal state
5. **backlog-store** - Backlog groups and items management

### List & Configuration Stores
6. **use-list-store** - Current list metadata, user info
7. **composition-modal-store** - List creation modal state

### Feature Stores (Low Coordination)
8. **tier-store** - Tier classification state
9. **filter-store** - Advanced multi-filter system
10. **layout-store** - Adaptive responsive layout
11. **heatmap-store** - Consensus heatmap visualization
12. **inspector-store** - Item inspector panel state

### Support Stores
13. **validation-notification-store** - Validation error notifications
14. **activity-store** - Activity feed state
15. **consensus-store** - Community consensus data
16. **task-store** - Background task management
17. **wiki-image-store** - Wikipedia image fetching

## Dependency Graph

```
                    ┌─────────────────┐
                    │  use-list-store │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐
│ backlog-store   │◄──│   match-store   │──►│ validation-notification │
└────────┬────────┘   └────────┬────────┘   │        -store           │
         │                     │            └─────────────────────────┘
         │            ┌────────┼────────┐
         │            │        │        │
         │            ▼        ▼        ▼
         │     ┌──────────┐ ┌──────────┐ ┌──────────────────┐
         │     │grid-store│ │ session- │ │ comparison-store │
         │     └────┬─────┘ │  store   │ └──────────────────┘
         │          │       └────┬─────┘
         │          │            │
         └──────────┴────────────┘
                    │
                    ▼
         ┌────────────────────────┐
         │ Shared: grid items,    │
         │ backlog state,         │
         │ session persistence    │
         └────────────────────────┘
```

## Detailed Dependencies

### match-store
**Imports from:**
- `session-store` - getState() for session operations
- `grid-store` - getState() for grid operations
- `comparison-store` - getState() for comparison modal sync
- `use-list-store` - getState() for current list info
- `validation-notification-store` - getState() for error notifications

**Operations requiring coordination:**
- `initializeMatchSession()` - Coordinates list, session, and grid stores
- `resetMatchSession()` - Clears grid, comparison, and session stores
- `setShowComparisonModal()` - Syncs with comparison-store
- `quickAssignToPosition()` - Coordinates session and grid stores

### grid-store
**Imports from:**
- `session-store` - getState() for session updates
- `backlog-store` (lazy) - via lazy accessor for backlog operations
- `validation-notification-store` (lazy) - via lazy accessor for error notifications

**Operations requiring coordination:**
- `handleDragEnd()` - Full drag-and-drop coordination
- `assignItemToGrid()` - Updates session store
- `removeItemFromGrid()` - Updates session store
- `moveGridItem()` - Updates session store
- `clearGrid()` - Updates session store

### session-store
**No direct imports from other stores**

**Operations that affect other stores:**
- `updateSessionGridItems()` - Called by grid-store
- `setSelectedBacklogItem()` - Used by match-store
- `getAvailableBacklogItems()` - Used by match-store

### comparison-store
**No direct imports from other stores**

**Operations that affect other stores:**
- `openComparison()` - Synced from match-store
- `closeComparison()` - Synced from match-store

### backlog-store
**No direct imports from other stores**

**Operations that affect other stores:**
- `markItemAsUsed()` - Called by grid-store during drag-and-drop
- `getItemById()` - Used by grid-store for validation

## Circular Dependency Prevention

The codebase uses the `createLazyStoreAccessor` pattern to prevent circular dependencies:

```typescript
// src/lib/stores/lazy-store-accessor.ts
const backlogStoreAccessor = createLazyStoreAccessor(
  () => require('@/stores/backlog-store').useBacklogStore,
  { storeName: 'backlog-store', maxRetries: 5, retryDelay: 20 }
);
```

This pattern:
1. Defers store import until first access
2. Provides retry logic for race conditions
3. Caches the store reference after initialization

## Operations Requiring Atomic Transactions

### Drag-and-Drop (Backlog → Grid)
1. Validate item availability (backlog-store)
2. Validate position availability (grid-store)
3. Assign item to grid (grid-store)
4. Mark item as used (backlog-store)
5. Update session (session-store)
6. Emit success/failure notification (validation-notification-store)

### Match Session Initialization
1. Get current list (use-list-store)
2. Sync/create session (session-store)
3. Initialize/load grid (grid-store)
4. Setup keyboard mode if enabled (match-store)

### Match Session Reset
1. Clear grid (grid-store)
2. Clear comparison (comparison-store)
3. Clear session selection (session-store)
4. Reset UI state (match-store)

## Migration Strategy

### Phase 1: Core Orchestrator
Create `GlobalOrchestrator` with command pattern for:
- Assign (backlog → grid)
- Move (grid → grid)
- Swap (grid ↔ grid)
- Remove (grid → backlog)

### Phase 2: Session Commands
- InitializeSession
- ResetSession
- SaveSession
- SwitchSession

### Phase 3: Feature Commands
- OpenComparison
- CloseComparison
- ToggleKeyboardMode

### Phase 4: Middleware
- Logging middleware
- Undo/redo middleware
- Validation middleware
- Persistence middleware

## Success Criteria

- [x] Dependency graph documentation exists in /docs
- [x] GlobalOrchestrator implemented with command pattern
- [x] Transaction support with rollback capability
- [x] Undo/redo works for grid operations
- [x] Middleware stack (logging, validation, persistence)
- [x] React hooks for easy integration (useOrchestrator, useUndoRedo)
- [x] Orchestrated drag handlers available (handleDragEndOrchestrated)
- [ ] All drag-and-drop operations migrated to GlobalOrchestrator (incremental)
- [ ] No direct getState() calls between match-related stores (incremental)

## Implementation Status

The orchestration layer has been implemented in `src/lib/orchestration/`:

```
src/lib/orchestration/
├── types.ts              # Type definitions for commands, transactions, middleware
├── commands.ts           # Command factory functions
├── GlobalOrchestrator.ts # Core orchestrator with transaction support
├── useOrchestrator.ts    # React hooks for components
├── dragHandlers.ts       # Orchestrated drag-and-drop handlers
└── index.ts              # Public exports
```

### Usage Example

```typescript
// Using the React hook
import { useOrchestrator } from '@/lib/orchestration';

function MyComponent() {
  const { assign, move, undo, redo, canUndo, canRedo } = useOrchestrator();

  const handleDrop = async (item, position) => {
    const success = await assign(item, position);
    if (!success) {
      // Handle error
    }
  };

  return (
    <button onClick={undo} disabled={!canUndo}>
      Undo
    </button>
  );
}
```

### Migration Path

Existing stores can continue to work while components gradually migrate:

1. **Immediate**: New components use `useOrchestrator` hook
2. **Gradual**: Existing drag handlers replaced with `handleDragEndOrchestrated`
3. **Future**: Direct store access replaced with orchestrator commands
