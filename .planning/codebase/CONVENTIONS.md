# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- React components: PascalCase — `SimpleMatchGrid.tsx`, `CollectionPanel.tsx`, `LandingMain.tsx`
- Hooks: camelCase prefixed with `use` — `useCollection.ts`, `useHydrationSafe.ts`, `useLoadingStateMachine.ts`
- Zustand stores: camelCase with `-store` suffix — `grid-store.ts`, `match-store.ts`, `session-store.ts`
- Utility/lib files: kebab-case — `api-error-handler.ts`, `lazy-store-accessor.ts`, `debug-config.ts`
- Type files: kebab-case — `backlog-groups.ts`, `api-responses.ts`, `modal-props.ts`
- API routes: `route.ts` inside folder path matching URL — `src/app/api/lists/route.ts`
- Story files: `ComponentName.stories.tsx`

**Directories:**
- Feature directories: PascalCase — `Match/`, `Collection/`, `Landing/`
- Sub-feature directories: `sub_` prefix + PascalCase — `sub_MatchGrid/`, `sub_MatchCollections/`, `sub_DropZone/`
- Shared/lib subdirectories: lowercase or kebab-case — `hooks/`, `lib/`, `query-keys/`, `image-gen/`
- Component subfolders within features: lowercase — `components/`, `hooks/`, `lib/`, `types/`

**Functions:**
- React components: PascalCase — `export function SimpleMatchGrid()`
- Custom hooks: camelCase `use` prefix — `export function useCollection()`
- Event handlers: `handle` prefix — `handleDragEnd`, `handleKeyboardShortcut`
- Boolean predicates: `is`/`has`/`should` prefix — `isLoading`, `hasMore`, `shouldUseVirtualization`
- Utility factories: descriptive camelCase — `createLazyStoreAccessor`, `createGridOnlyRouter`, `createEmptyGrid`
- Logger instances: `[category]Logger` pattern — `gridLogger`, `matchLogger`

**Variables:**
- camelCase throughout — `searchTerm`, `selectedGroupIds`, `currentListId`
- Constants: SCREAMING_SNAKE_CASE — `CURATOR_MILESTONES`, `GRID_LIMITS`, `TUTORIAL_GRID`, `DEBOUNCE`
- Private inner components (not exported): suffixed `Inner` — `SimpleMatchGridInner`

**Types:**
- Interfaces: PascalCase with `I` NOT used — `GridItemType`, `UseCollectionOptions`, `ErrorLogEntry`
- Type aliases: PascalCase — `RouteHandler`, `DragOperationRouter`, `LogCategory`
- Props types: `ComponentNameProps` suffix — `ElevatedProps`, `SurfaceProps`, `GlowProps`, `ConfigurableCollectionItemProps`
- Result types: `UseHookNameResult` — `UseCollectionResult`, `UseCollectionLazyLoadResult`
- Options types: `UseHookNameOptions` — `UseCollectionOptions`, `UseIntersectionObserverOptions`

## Code Style

**Formatting:**
- No Prettier config detected; Next.js default formatting applies
- Single quotes for imports in TypeScript: `import { create } from 'zustand'`
- Double quotes in JSX attributes: `data-testid="featured-lists-section"`
- Trailing commas in multi-line objects and arrays (observed in source)
- Semicolons omitted in some files, present in others — no enforced rule

**Linting:**
- ESLint config: `src/.eslintrc.json` extends `next/core-web-vitals` and `plugin:storybook/recommended`
- `eslint-disable @typescript-eslint/no-unused-vars` used in test/verification files
- ESLint ignored during builds (`ignoreDuringBuilds: true` in `next.config.js`)
- TypeScript strict mode enabled

## Import Organization

**Order (observed pattern):**
1. React and Next.js built-ins — `import { useState, useCallback } from "react"`
2. Third-party libraries — `import { create } from 'zustand'`, `import { DndContext } from "@dnd-kit/core"`
3. Internal `@/` aliases — stores, types, lib utilities
4. Relative imports — `import { ViewSwitcher } from "./components/ViewSwitcher"`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All cross-feature imports use `@/` — e.g., `import { useGridStore } from '@/stores/grid-store'`
- Same-feature imports use relative paths — `import { getItemTitle } from "./lib/helpers"`

**Barrel Files:**
- Every feature has an `index.ts` that explicitly re-exports public API
- Barrel files include both component exports and type exports — `export type { ... }` alongside `export { ... }`
- Example: `src/app/features/Collection/index.ts`

## Error Handling

**API Routes:**
- All route handlers wrapped in `withErrorHandler()` from `src/lib/errors/api-error-handler.ts`
- Custom `GoatError` base class with subtypes: `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `NetworkError`, `ServerError` — all in `src/lib/errors/GoatError.ts`
- Standardized error response shape: `{ success: false, category, code, message, status, details: { traceId, timestamp, path } }`
- Utility responders for common cases: `successResponse()`, `createdResponse()`, `notFound()`, `unauthorized()`, `badRequest()`

**Client Components:**
- `ErrorBoundary` and `AsyncBoundary` wrappers from `src/lib/errors/ErrorBoundary.tsx`
- Feature-specific boundaries: e.g., `CollectionErrorBoundary` in `src/app/features/Collection/components/CollectionErrorBoundary.tsx`
- Error notification store (`useErrorNotificationStore`) for toast-level feedback — `src/lib/errors/error-notification-store.ts`
- Validation errors surfaced via `useValidationNotificationStore` in `src/stores/validation-notification-store.ts`

**Stores:**
- Stores catch errors internally and emit via notification stores rather than throwing
- Lazy store accessors (`createLazyStoreAccessor`) with retry logic handle circular dependency errors gracefully

## Logging

**Framework:** Custom category logger (`src/lib/logger/index.ts`)

**Patterns:**
- Create a per-module logger: `const gridLogger = createCategoryLogger('grid')`
- Four levels: `debug`, `info`, `warn`, `error`
- Disabled by default in production; runtime toggle via `window.__DEBUG_GOAT__` in browser console
- Structured calls: `logger.debug('Item assigned', { position: 5, item: itemData })`
- Never use `console.log` directly in production code; use the category logger

## Comments

**When to Comment:**
- Module-level JSDoc on stores, hooks, and lib files is standard — describes purpose, dependencies, and usage examples
- Inline comments for non-obvious logic, especially in drag-and-drop handlers and store cross-references
- `// ============================================================================` separator blocks used in larger files to divide logical sections
- TODO comments are present in a few places (see `src/app/features/Collection/components/CollectionErrorBoundary.tsx`, `src/hooks/use-item-groups.ts`) but not systematically tracked

**JSDoc/TSDoc:**
- Full JSDoc on exported functions and hooks — `@param`, `@returns`, `@example` blocks used
- Inline `/** ... */` on interface properties where non-obvious
- Example: `src/lib/hooks/useHydrationSafe.ts` has complete JSDoc with `@example`

## Function Design

**Size:** Functions are generally single-responsibility; large orchestration functions (e.g., `initializeMatchSession`) are acceptable in stores where they coordinate multiple sub-systems

**Parameters:** Options objects for hooks with many parameters — `useCollection(options: UseCollectionOptions = {})`. Destructure with defaults at the top of the function body.

**Return Values:**
- Hooks return a typed result object — `UseCollectionResult`
- API helpers return `NextResponse` via typed factory functions
- Stores expose getters and setters directly on the store state interface

## Module Design

**Exports:**
- Named exports preferred — `export function`, `export const`, `export type`
- Default exports only for Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`, config files)
- Types exported alongside implementations in barrel files

**Store Pattern:**
```typescript
// Zustand store: define interface, then create
interface MatchStoreState {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
```

**Cross-store access:**
```typescript
// Use getState() to read other stores imperatively (not via hook)
const sessionStore = useSessionStore.getState();
sessionStore.updateSessionGridItems(newItems);
```

**Lazy circular dependency resolution:**
```typescript
// Use createLazyStoreAccessor for stores that would create circular imports
const backlogStoreAccessor = createLazyStoreAccessor(
  () => require('@/stores/backlog-store').useBacklogStore,
  { storeName: 'backlog-store', maxRetries: 5, retryDelay: 20 }
);
```

**Client component directive:**
- `"use client"` is placed at the very top of every file containing React hooks, event handlers, or browser APIs
- Hooks files (`.ts`) also include `"use client"` when they use React hooks

**CVA pattern for component variants:**
```typescript
const buttonVariants = cva("base-classes", {
  variants: { variant: { default: "...", outline: "..." } },
  defaultVariants: { variant: "default" }
});
// className merged with cn() utility
className={cn(buttonVariants({ variant, size, className }))}
```

**data-testid attributes:**
- Present on all interactive and structurally significant elements
- Format: `kebab-case-description` for static elements — `"featured-lists-section"`
- Format: `prefix-{id}` for dynamic elements — `"featured-list-item-{id}"`, `"collection-item-wrapper-{id}"`

---

*Convention analysis: 2026-03-14*
