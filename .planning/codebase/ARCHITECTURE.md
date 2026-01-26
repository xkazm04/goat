# Architecture

**Analysis Date:** 2026-01-26

## Pattern Overview

**Overall:** Feature-based modular architecture with centralized Zustand state management and provider-based dependency injection.

**Key Characteristics:**
- Zustand store orchestration for cross-component state coordination
- Next.js 15 App Router with server and client component separation
- Provider hierarchy for global concerns (auth, theme, offline, queries)
- Feature-based directory organization with co-located assets
- Command pattern orchestration for atomic multi-store operations
- DnD Kit for sophisticated drag-and-drop with unified protocol

## Layers

**Presentation Layer:**
- Purpose: UI components and user interactions
- Location: `src/components/`, `src/app/features/*/components/`
- Contains: React components, hooks, animations (Framer Motion)
- Depends on: Zustand stores, UI libraries (Radix, Tailwind)
- Used by: Pages, features

**Feature Layer:**
- Purpose: Feature-specific logic and UI organization
- Location: `src/app/features/`
- Contains: Major features (Match, Collection, Landing, Challenges, etc.)
- Depends on: State stores, library utilities, presentation components
- Used by: Pages and routing

**State Management Layer:**
- Purpose: Centralized application state with persistence
- Location: `src/stores/`
- Contains: Zustand stores (match-store, grid-store, session-store, backlog-store, etc.)
- Depends on: Types, validation utilities, localStorage/persistence
- Used by: Components, features, API handlers

**Library/Utilities Layer:**
- Purpose: Reusable logic and algorithms
- Location: `src/lib/`
- Contains: Grid operations, DnD protocol, validation, image generation, API clients
- Depends on: Types, third-party libraries
- Used by: Stores, components, features

**Data/Persistence Layer:**
- Purpose: Data access and external integrations
- Location: `src/lib/api/`, `src/lib/supabase/`, `src/lib/offline/`
- Contains: API clients, Supabase integration, offline cache
- Depends on: HTTP client, Supabase SDK
- Used by: Stores via TanStack Query

**API Layer:**
- Purpose: Server-side request handlers
- Location: `src/app/api/`
- Contains: Route handlers for REST endpoints
- Depends on: Supabase, external services (Clerk, Google Generative AI)
- Used by: Client-side queries via TanStack Query

## Data Flow

**User Drag & Drop Interaction:**

1. User drags item from backlog collection → grid position
2. `DndContext` fires `DragEndEvent` in SimpleMatchGrid component
3. Component calls `grid-store.handleDragEnd()` with DragEndEvent
4. Grid store:
   - Validates source item and target position via `transfer-validator`
   - Applies unified DnD protocol to parse IDs (`createGridReceiverId`, `extractGridPosition`)
   - Acquires item lock to prevent race conditions
   - Updates grid state with new item assignment
   - Calls `session-store.updateSessionGridItems()` to sync persistence
5. Stores emit state changes → React re-renders components
6. Changes persist to localStorage via Zustand persist middleware
7. TanStack Query optionally syncs to Supabase in background

**List Creation & Ranking:**

1. User creates/selects list → `use-list-store` is populated
2. `match-store.initializeMatchSession()` orchestrates:
   - Loads backlog groups via `backlog-store` from API
   - Creates grid with N positions via `grid-store`
   - Restores previous session from localStorage
3. Ranking tier mode uses `ranking-store` for tier-based ranking
4. On completion, generates result image via image generation lib
5. User shares result → `share-store` tracks sharing metadata

**State Management Pattern:**

```
User Action
    ↓
Component Hook (useGridStore, useBacklogStore, etc.)
    ↓
Zustand Store Action (synchronous or async)
    ↓
Store Updates State (with validation)
    ↓
Persist Middleware (localStorage/IndexedDB)
    ↓
Component Re-render
    ↓
(Optional) TanStack Query Mutation → Supabase
```

**Store Communication:**

Stores use `useXStore.getState()` pattern for cross-store access:
- `match-store` orchestrates `grid-store`, `session-store`, `comparison-store`
- `grid-store` validates via backlog-store items
- `session-store` syncs grid items after changes
- `ranking-store` maintains tier state separate from grid state

## Key Abstractions

**GridItem & BacklogItem:**
- Purpose: Type-safe representation of rankable items
- Examples: `src/types/match.ts`, `src/types/backlog-groups.ts`
- Pattern: Discriminated union types with UI state properties

**Transfer Protocol:**
- Purpose: Unified drag-drop ID parsing and routing
- Examples: `src/lib/dnd/unified-protocol.ts`, `src/lib/dnd/transfer-protocol.ts`
- Pattern: ID encoding scheme (dataTransfer format: `{type}:{id}:{groupId}`)

**Validation Authority:**
- Purpose: Centralized business rule validation
- Examples: `src/lib/validation/`, `src/lib/grid/transfer-validator.ts`
- Pattern: Validation functions return detailed error codes for UI feedback

**Store Orchestrator:**
- Purpose: Atomic multi-store operations for complex state transitions
- Examples: `src/lib/match/orchestrator.ts`
- Pattern: Command pattern with rollback support

**Session Normalization:**
- Purpose: Efficient storage of session state
- Examples: `src/stores/item-store/normalized-session.ts`
- Pattern: Normalized data structure for denormalization on read

**Grid Factory:**
- Purpose: Safe grid item creation with validation
- Examples: `src/lib/grid/item-factory.ts`
- Pattern: Factory functions with validation and default values

## Entry Points

**Web Root:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Renders LandingLayout, starting point for all user journeys

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page loads
- Responsibilities: Wraps all pages with providers (ClerkProvider, ThemeProvider, BacklogProvider, QueryProvider, OfflineProvider)

**API Routes:**
- Locations: `src/app/api/*/route.ts`
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Handle list CRUD, backlog data, image generation, webhooks

**Match Feature:**
- Location: `src/app/features/Match/sub_MatchGrid/SimpleMatchGrid.tsx`
- Triggers: Navigation to `/match/[listId]`
- Responsibilities: Orchestrates drag-drop, grid rendering, view modes (podium, bracket, tier)

**Collection Feature:**
- Location: `src/app/features/Collection/components/`
- Triggers: Rendered within Match feature
- Responsibilities: Displays backlog items in collection panels for dragging

## Error Handling

**Strategy:** Layered validation with detailed error codes and user-friendly notifications

**Patterns:**

1. **Validation Authority** - Centralized business rules in `src/lib/validation/`:
   - `validateGridItem()` - Item validity checks
   - `validateTransfer()` - Transfer operation validation
   - Returns specific `ValidationErrorCode` enum for UI handling

2. **Store-Level Handling** - Grid store catches validation failures:
   - Emits `emitValidationError()` via `validation-notification-store`
   - Never mutates state on validation failure
   - Logs detailed failure info for debugging

3. **Component-Level Feedback** - Toasts and modals display errors:
   - Smart fill panel shows validation errors via notifications
   - Comparison modal warns on invalid selections
   - Search filters gracefully handle no results

4. **API Error Handling** - TanStack Query mutation error handling:
   - API errors caught and logged
   - Offline fallback activated automatically
   - User sees sync status indicator

## Cross-Cutting Concerns

**Logging:** Centralized logger in `src/lib/logger.ts` with prefixed subsystems:
- `matchLogger` - Match session operations
- `gridLogger` - Drag-drop and grid state
- `sessionLogger` - Session persistence
- Prefixes: 🔄 (drag), 💾 (storage), ⚠️ (validation)

**Validation:** `src/lib/validation/` with authority pattern:
- `getValidationAuthority()` - Centralized rule engine
- `logValidationFailure()` - Structured error logging
- Error codes: GRID_FULL, ITEM_ALREADY_ASSIGNED, INVALID_POSITION, etc.

**Authentication:** Clerk integration via ClerkProvider:
- User object available via `useUser()` hook
- Planned migration to Supabase Auth
- Webhook handler at `src/app/api/webhooks/clerk`

**Persistence:** Zustand persist middleware + offline cache:
- Grid state persisted to localStorage (key: `grid-store`)
- Session state persisted to localStorage (key: `session-store`)
- Offline provider syncs IndexedDB for PWA capability
- `src/lib/offline/` handles offline-first cache

**Image Generation:** External AI integration:
- Google Generative AI via `@google/generative-ai`
- Result image generation at `src/app/api/match/generate-result-image`
- Caching via `src/app/features/Match/lib/resultCache.ts`

---

*Architecture analysis: 2026-01-26*
