# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Feature-based Next.js App Router with multi-store Zustand state management and command-based orchestration

**Key Characteristics:**
- Next.js 15 App Router with co-located page/feature components under `src/app/features/`
- Multiple coordinated Zustand stores managed through a dependency graph documented in `src/stores/registry.ts`
- `GlobalOrchestrator` in `src/lib/orchestration/GlobalOrchestrator.ts` provides atomic multi-store transactions, undo/redo, and middleware pipelines
- Server-side data access via Supabase (type-safe `Database` generic); client data fetching via TanStack Query
- Drag-and-drop handled through a `TransferProtocol` abstraction in `src/lib/dnd/` with a `DragOperationRouter` dispatching typed operations

## Layers

**Pages (Routing):**
- Purpose: Next.js App Router page entrypoints; minimal logic, delegate to feature layouts
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, route segments
- Depends on: Feature components
- Used by: Next.js router

**Features (UI Modules):**
- Purpose: Self-contained UI features with their own sub-components, hooks, and lib utilities
- Location: `src/app/features/`
- Contains: Feature-specific components, sub-features (`sub_*`), hooks, lib utilities
- Depends on: Zustand stores, `src/lib/`, shared `src/components/`
- Used by: Pages

**Stores (State Layer):**
- Purpose: Zustand stores as the single source of truth for client-side state; persisted to localStorage/IndexedDB via `persist` middleware
- Location: `src/stores/`
- Contains: One store file per domain; modular backlog store under `src/stores/backlog/`
- Depends on: `src/lib/` utilities, `src/types/`
- Used by: Features, components, GlobalOrchestrator

**API Routes (Server Layer):**
- Purpose: Next.js API route handlers that interface directly with Supabase; typed responses using `withErrorHandler` wrapper
- Location: `src/app/api/`
- Contains: Route handlers (GET/POST/PUT/DELETE), Supabase queries, response helpers
- Depends on: `src/lib/supabase/server.ts`, `src/lib/errors/`, `src/types/database.ts`
- Used by: Client via `goatApi` (`src/lib/api/goat-api.ts`)

**Lib (Shared Logic):**
- Purpose: Domain-specific utilities, hooks, API clients, validation, and cross-cutting concerns
- Location: `src/lib/`
- Contains: `api/`, `dnd/`, `errors/`, `hooks/`, `supabase/`, `validation/`, `orchestration/`, `logger/`, and many domain modules
- Depends on: `src/types/`, external packages
- Used by: Features, stores, API routes

**Providers (Bootstrap Layer):**
- Purpose: React context providers that initialize global state and external SDK connections
- Location: `src/providers/` and inline in `src/app/layout.tsx`
- Contains: `QueryProvider`, `BacklogProvider`, `PrefetchProvider`
- Depends on: Stores, TanStack Query
- Used by: Root layout

**Types (Schema Layer):**
- Purpose: TypeScript type definitions shared across all layers
- Location: `src/types/`
- Contains: Domain types for all entities (`database.ts`, `match.ts`, `backlog-groups.ts`, `top-lists.ts`, etc.)
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Match/Grid Session Flow:**

1. User navigates to a list; `match-store.initializeMatchSession()` is called
2. `session-store` creates/restores a `ListSession` from `localStorage` (via `persist` middleware)
3. `backlog-store` loads `BacklogGroup[]` items for the list's category via `BacklogProvider`
4. User drags a backlog item; `@dnd-kit` fires `DragEndEvent`
5. `grid-store.handleDragEnd()` receives the event; the `DragOperationRouter` classifies the operation (Assign / Move / Swap)
6. The chosen `DragOperation` mutates `grid-store` state and calls `session-store.updateSessionGridItems()`
7. `session-store` persists updated grid to `localStorage`/IndexedDB via `saveSessionToOffline()`
8. React components re-render via Zustand subscriptions

**API Read Flow:**

1. Component calls a TanStack Query hook (e.g., `useTopLists()` from `src/lib/hooks/`)
2. Query calls `goatApi.<resource>.<method>()` from `src/lib/api/goat-api.ts`
3. `ApiClient` in `src/lib/api/client.ts` makes typed `fetch` to `/api/...`
4. Next.js API route handler calls `createClient()` from `src/lib/supabase/server.ts`
5. Supabase returns typed `Database` rows; handler transforms and returns JSON response
6. TanStack Query caches result; component renders

**Orchestrated Multi-Store Mutation:**

1. Caller invokes `getOrchestrator().execute(command)` from `src/lib/orchestration/GlobalOrchestrator.ts`
2. Orchestrator runs middleware pipeline (logging, validation, persistence)
3. Command mutates one or more stores atomically
4. On failure the orchestrator rolls back to pre-transaction snapshot
5. Undo entries pushed to undo stack; available via `getOrchestrator().undo()`

**State Management:**
- Zustand stores are initialized in topological order (see `src/stores/registry.ts`): `comparison-store` → `session-store` → `backlog-store` → `validation-notification-store` → `grid-store` → `match-store`
- Cross-store access uses `useXStore.getState()` (synchronous, outside React render)
- Circular dependencies are resolved with lazy accessors (`src/lib/stores/lazy-store-accessor.ts`) using `require()` at runtime

## Key Abstractions

**TransferProtocol (`src/lib/dnd/transfer-protocol.ts`):**
- Purpose: Unified abstraction over all drag-and-drop data contracts; defines sources (backlog, grid, collection) and receivers (grid position, collection list)
- Examples: `src/lib/dnd/transfer-protocol.ts`, `src/lib/dnd/type-guards.ts`
- Pattern: Factory functions create typed payloads; type guards narrow at event handling time

**DragOperationRouter (`src/lib/dnd/operations/DragOperationRouter.ts`):**
- Purpose: Routes a classified `DragEndEvent` to the correct `DragOperation` (Assign, Move, Swap, Tier variants)
- Examples: `src/lib/dnd/operations/AssignOperation.ts`, `MoveOperation.ts`, `SwapOperation.ts`
- Pattern: Strategy pattern; each `DragOperation` implements a common interface

**GlobalOrchestrator (`src/lib/orchestration/GlobalOrchestrator.ts`):**
- Purpose: Command bus for atomic multi-store transactions with middleware, undo/redo, and debug history
- Examples: `src/lib/orchestration/commands.ts`, `src/lib/orchestration/dragHandlers.ts`
- Pattern: Command pattern; commands are typed objects passed to `execute()`

**GoatAPI (`src/lib/api/goat-api.ts`):**
- Purpose: Unified typed client for all `/api/*` endpoints with built-in caching, batching, and deduplication
- Examples: `src/lib/api/client.ts`, `src/lib/api/cached-client.ts`, `src/lib/api/BatchManager.ts`
- Pattern: Facade over `fetch`; methods return typed response objects

**withErrorHandler (`src/lib/errors/api-error-handler.ts` re-exported via `src/lib/errors/index.ts`):**
- Purpose: Wraps Next.js route handlers; maps `GoatError` subclasses to HTTP status codes, returns consistent `{ success, data, error }` JSON envelopes
- Pattern: Decorator / higher-order function; all API routes use it

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Establishes provider hierarchy — `ClerkProvider` → `ThemeProvider` → `BacklogProvider` → `QueryProvider` → `PrefetchProvider` → `OfflineProvider` → `CommandPaletteProvider`

**Home Page:**
- Location: `src/app/page.tsx`
- Triggers: `/` route
- Responsibilities: Renders `LandingLayout` from `src/app/features/Landing/LandingLayout.tsx`

**Match Page:**
- Location: `src/app/features/Match/` (rendered via a page in `src/app/`)
- Triggers: User selects a list to rank
- Responsibilities: Mounts `sub_MatchGrid`, `sub_MatchCollections`, `sub_DropZone`, `ComparisonModal`, `ShareModal`; initializes match session

**Studio Page:**
- Location: `src/app/studio/` + `src/app/features/Studio/StudioLayout.tsx`
- Triggers: `/studio` route
- Responsibilities: List/collection creation wizard, AI-assisted content generation

**API Routes:**
- Location: `src/app/api/`
- Triggers: HTTP requests from `goatApi` client or external callers
- Responsibilities: Auth-gated Supabase CRUD, image generation, sharing, consensus, challenges, webhooks

## Error Handling

**Strategy:** Typed error hierarchy extending `GoatError`; all API routes wrapped with `withErrorHandler`; client errors tracked via `trackError()`

**Patterns:**
- Server: `withErrorHandler(handler)` catches any thrown `GoatError` subclass and maps it to HTTP status; `fromSupabaseError()` converts Supabase errors
- Client: `ApiClient` calls `fromHttpResponse()` to reconstruct typed `GoatError` from JSON; errors surfaced through TanStack Query's `error` state
- Store-level: `ValidationErrorCode` enum used for drag-and-drop validation failures; emitted to `validation-notification-store` and displayed as UI toasts
- Global: `src/app/global-error.tsx` is the Next.js error boundary for unhandled render errors

## Cross-Cutting Concerns

**Logging:** Category-based logger in `src/lib/logger/`; uses `createCategoryLogger('grid')` pattern; disabled by default in production; toggled at runtime via `window.__DEBUG_GOAT__.enable('category')`

**Validation:** Two contexts — API request validation using `assertRequired()`/`assertValid()` in route handlers; drag-and-drop validation via `getValidationAuthority()` in `src/lib/validation/validation-authority.ts`

**Authentication:** Clerk (`@clerk/nextjs`) handles session cookies; Supabase server client reads Clerk cookies for RLS; planned migration to Supabase Auth (see `.env.example`)

**Hydration Safety:** Client components that read localStorage/Zustand persisted state use `useHydrationSafe()` from `src/lib/hooks/useHydrationSafe.ts` to defer rendering until after mount

**Offline Support:** `OfflineProvider` in `src/lib/offline/OfflineProvider.tsx` wraps the app; `SyncEngine` and `SyncQueue` handle queued mutations; `saveSessionToOffline()` persists grid/session state for offline use

---

*Architecture analysis: 2026-03-14*
