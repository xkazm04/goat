# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**G.O.A.T. (Greatest Of All Time)** - A Next.js application for creating and ranking custom lists using an interactive drag-and-drop match system. Users can create ranked lists (Top 10, Top 50, etc.) by matching items from a backlog through an intuitive grid-based interface.

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Authentication**: Clerk (with planned migration to Supabase Auth - see .env.example)
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **Drag & Drop**: @dnd-kit (core, sortable, modifiers)
- **UI Components**: Radix UI + Tailwind CSS
- **Animation**: Framer Motion

### Application Structure

The app follows a **feature-based architecture** where major features are organized in `src/app/features/`:

- **Landing**: Home page with list browsing and showcase
- **Match**: Core ranking interface with drag-and-drop grid system
- **Collection**: Item collection management panels
- **matching**: (Legacy/alternate match implementation)

### State Management Architecture

**Critical**: The app uses **multiple coordinated Zustand stores** that must stay in sync:

1. **`match-store.ts`**: UI state, keyboard navigation, match session orchestration
2. **`grid-store.ts`**: Grid state (50 positions max), drag-and-drop handlers
3. **`session-store.ts`**: Session persistence, backlog management
4. **`comparison-store.ts`**: Item comparison modal state
5. **`use-list-store.ts`**: Current list metadata
6. **`item-store.ts`**: Item data management
7. **`backlog-store.ts`**: Backlog group state

**Store Communication Pattern**: Stores cross-reference each other using `useXStore.getState()` pattern. For example, `match-store` orchestrates actions across `grid-store`, `session-store`, and `comparison-store`.

**Persistence**: Grid and session stores use Zustand's `persist` middleware to save state to localStorage/IndexedDB.

### Drag & Drop System

The app uses **@dnd-kit** for sophisticated drag-and-drop:

- **Source**: Backlog items from collection panels (sidebar)
- **Target**: Grid positions (1-50 depending on list size)
- **Actions**: Assign (backlog → grid), Move (grid → grid), Swap (exchange positions), Remove
- **State Flow**: DragEndEvent → `grid-store.handleDragEnd()` → updates grid → syncs to `session-store`

**Key Files**:
- `src/app/features/Match/MatchGrid/lib/dragHandlers.ts`: Drag event handlers
- `src/stores/grid-store.ts`: Core drag logic and grid state

### Match/Grid System

The **Match** feature is the core of the application:

1. User selects a list (e.g., "Top 10 Movies")
2. `match-store.initializeMatchSession()` sets up:
   - Grid with N positions (from list size)
   - Loads backlog items for the category
   - Restores previous session if exists
3. User drags items from backlog → grid positions
4. Grid syncs to session store on every change
5. When complete, user can generate/share result image

**Keyboard Shortcuts** (via `match-store.handleKeyboardShortcut()`):
- `k`: Toggle keyboard mode
- `1-9, 0`: Quick assign to positions 1-10
- `Enter/Space`: Assign selected item
- `c`: Toggle comparison modal
- `s`: Save progress

### API Structure

API routes in `src/app/api/`:

- **`/api/lists`**: CRUD for user lists
- **`/api/top/groups`**: Backlog groups and items by category
- **`/api/match/generate-result-image`**: Result image generation
- **`/api/webhooks/clerk`**: Clerk auth webhooks

**API Client**: `src/lib/api/client.ts` provides typed ApiClient with error handling.

### Data Flow

```
User Action → Zustand Store → (optional) TanStack Query mutation → Supabase
                            ↓
                     localStorage/IndexedDB (persistence)
                            ↓
                     React Components (re-render)
```

**Query Keys**: Centralized in `src/lib/query-keys/` for cache management.

### Component Organization

- **`src/app/features/[Feature]/`**: Feature-specific components (co-located)
- **`src/components/`**: Shared/reusable UI components
- **`src/lib/`**: Utilities, API clients, hooks
- **`src/stores/`**: Zustand stores
- **`src/types/`**: TypeScript type definitions

### Important Patterns

**Path Aliases**: Use `@/` for imports (e.g., `import { useMatchStore } from '@/stores/match-store'`)

**Hydration Safety**: Client components using localStorage/Zustand persistence should use `src/lib/hooks/useHydrationSafe.ts` to prevent hydration mismatches.

**Provider Hierarchy** (from `src/app/layout.tsx`):
```
ClerkProvider
  → ThemeProvider
    → BacklogProvider
      → QueryProvider
        → App Content
```

**Drag Overlay**: Active drag items show custom overlay via `findActiveBacklogItem()` in `dragHandlers.ts`.

### Environment Configuration

See `.env.example` for complete setup. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only Supabase key (never expose client-side)
- Clerk keys (currently in use, planned migration to Supabase Auth)

**Note**: The app is transitioning from Clerk → Supabase Auth and from legacy HTTP API → Supabase. Check `.env.example` migration notes.

### TypeScript Configuration

- **Strict mode** enabled
- **Path alias**: `@/*` → `./src/*`
- **ESLint**: Disabled during builds (`ignoreDuringBuilds: true`)

## Key Implementation Notes

### When Working on Match/Grid Features

1. **Always sync stores**: Changes to grid must call `sessionStore.updateSessionGridItems()`
2. **Position indexing**: Grid positions are 0-based internally, 1-based in UI
3. **Max grid size**: Currently 50 (defined in `grid-store.ts`)
4. **Empty slots**: Grid always maintains full size array, empty slots have `matched: false`

### When Adding New Features

1. Consider if feature needs its own Zustand store or fits in existing stores
2. Add TanStack Query keys to `src/lib/query-keys/` if adding new queries
3. Follow feature-based organization: create `src/app/features/[NewFeature]/`
4. Add types to `src/types/`

### When Debugging Drag & Drop

1. Check console logs prefixed with `🔄` (drag system logs)
2. Verify `activeItem` state in `grid-store`
3. Ensure backlog items have valid `id` field
4. Check `DragEndEvent.active` and `DragEndEvent.over` properties

### Image Optimization

`next.config.js` has `images: { unoptimized: true }` - images are not optimized by Next.js Image component.

### Styling

- **Tailwind CSS** with custom theme
- **Dark mode** default via `next-themes`
- **Framer Motion** for page transitions and animations
- **Radix UI** for accessible component primitives
