# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**
- PascalCase for React components: `ConfigurableCollectionItem.tsx`, `SimpleMatchGrid.tsx`
- camelCase for utilities and libraries: `grid-store.ts`, `session-store.ts`, `client.ts`
- camelCase with hyphens for Zustand stores: `grid-store.ts`, `match-store.ts`, `use-list-store.ts`
- kebab-case for API route directories: `/api/agent-bridge`, `/api/search-image`
- lowercase for feature directories: `src/app/features/Match/`, `src/app/features/Collection/`

**Functions:**
- camelCase for all functions and methods: `handleDragEnd()`, `markItemAsUsed()`, `assignItemToGrid()`
- Prefix event handlers with `handle`: `handleKeyboardShortcut()`, `handleDragMove()`
- Prefix custom hooks with `use`: `useProgressiveWikiImage()`, `useGridStore()`, `useTouchGestures()`
- Prefix configuration creators with `create`: `createGridItem()`, `createEmptyGridSlot()`, `createCollectionDragData()`

**Variables:**
- camelCase for all variables: `gridItems`, `selectedItemIndex`, `isLoading`, `showComparisonModal`
- Boolean prefixes: `is*`, `show*`, `has*`, `enable*`, `can*` — e.g., `isLoading`, `showResultShareModal`, `hasFailed`, `enableSwipeGestures`
- Constants in UPPER_SNAKE_CASE: `DEFAULT_FETCH_DELAY_MS`, `LOG_LEVELS`, `ERROR_MESSAGES`

**Types:**
- PascalCase for all types and interfaces: `GridItemType`, `BacklogItem`, `CollectionItemProps`, `ValidationErrorCode`
- Suffix interfaces with nothing; types sometimes use semantic names: `type ErrorCategory = 'validation' | 'auth' | ...`
- Props interfaces suffix with `Props`: `ItemCardProps`, `ConfigurableCollectionItemProps`, `ButtonProps`
- Store state interfaces suffix with `State`: `SessionStoreState`, `MatchStoreState`, `ValidationNotificationStore` (inconsistent but documented)

## Code Style

**Formatting:**
- No automatic formatter configured (Prettier not in dependencies)
- ESLint configured with Next.js core rules and Storybook plugin
- Config: `.eslintrc.json` extends `next/core-web-vitals` and `plugin:storybook/recommended`
- 2-space indentation (observed in codebase)
- Trailing commas in objects/arrays

**Linting:**
- ESLint with Next.js rules (see `.eslintrc.json`)
- Disabled during builds: `eslintignore: true` in next.config.js
- Run with: `npm run lint`
- No automatic formatting enforcement; style is implicit

**Strict TypeScript:**
- Enabled strict mode in `tsconfig.json`
- All React components typed with interfaces
- Generic types commonly used: `create<T>()`, `Promise<T>`, `ApiResponse<T>`

## Import Organization

**Order:**
1. External packages: `import React from 'react'`, `import { create } from 'zustand'`
2. Next.js modules: `import { NextRequest, NextResponse } from 'next/server'`
3. Internal relative imports: `import { useSessionStore } from '@/stores/session-store'`
4. Internal aliases: Always use `@/` path alias, never `../` relative imports
5. Type imports: `import type { GridItemType } from '@/types/match'`

**Path Aliases:**
- Primary alias: `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Pattern: Always use `@/` for imports across the codebase
- Examples: `@/stores/`, `@/components/`, `@/lib/`, `@/types/`, `@/hooks/`

## Error Handling

**Patterns:**
- Unified error framework in `src/lib/errors/` with typed error classes
- Error hierarchy: `GoatError` (base), `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `NetworkError`, `ServerError`
- Factory functions: `fromUnknown()`, `fromHttpResponse()` for error conversion
- Check type with: `isGoatError(error)`, `isRetriable(error)`
- API routes wrap with: `withErrorHandler()` decorator from `src/lib/errors`
- Supabase errors: `fromSupabaseError()` converts Supabase errors to GoatError
- Example:
  ```typescript
  const { data, error } = await supabase.from('lists').select('*');
  if (error) {
    throw fromSupabaseError(error);
  }
  ```

**Validation:**
- `assertRequired(value, fieldName)` checks required fields
- `assertValid(condition, message)` generic validation
- Validation errors recorded to `validationNotificationStore` via `emitValidationError(code)`

**Error Tracking:**
- Errors tracked via `trackError()` with: `code`, `category`, `severity`, `traceId`, `path`, `method`

## Logging

**Framework:** Custom namespaced logger in `src/lib/logger.ts`

**Creation:**
- Create logger: `const gridLogger = createLogger('grid-store', '🔄')`
- Namespace pattern: descriptive string + optional emoji prefix
- Loggers used in stores: `gridLogger`, `sessionLogger`, `matchLogger`

**Patterns:**
- Dev-only logging (enabled only in `NODE_ENV === 'development'`)
- Log methods: `.debug()`, `.info()`, `.warn()`, `.error()`, `.log()`
- Usage:
  ```typescript
  gridLogger.debug('Item assigned:', itemId, position);
  gridLogger.warn('Validation failed:', errorCode);
  ```

**Configuration:**
- Toggle all logging: `loggerConfig.setEnabled(boolean)`
- Set level: `loggerConfig.setLevel('debug' | 'info' | 'warn' | 'error')`
- Filter by namespace: `loggerConfig.addNamespace('grid-store')`

## Comments

**When to Comment:**
- Complex algorithms (e.g., `computeGridStatistics()`, drag-drop sequence)
- Non-obvious business logic (e.g., why validation happens at specific points)
- Integration patterns (e.g., cross-store communication via `getState()`)
- Workarounds and TODOs: comments explain why a pattern is necessary

**JSDoc/TSDoc:**
- Used extensively for store state interfaces and hook return types
- Example:
  ```typescript
  /**
   * Drag Store - Single Source of Truth for Drag & Drop
   *
   * This store handles:
   * - Backlog to grid assignment
   * - Grid to grid move/swap
   * - Session synchronization
   */
  ```
- Function parameters rarely documented (types are self-explanatory)
- Return types documented when complex

## Function Design

**Size:** No hard limit, but stores tend to be 300-500 lines with multiple state slices and actions

**Parameters:**
- Use object destructuring for multiple parameters (common in store actions)
- Example: `assignItemToGrid({ itemId, position, gridSize })`
- Single parameters: pass directly
- Type them explicitly with TypeScript interfaces

**Return Values:**
- Functions are void (store actions that update state)
- Queries return typed data: `GridItemType[]`, `ListSession | null`, `Promise<T>`
- Hooks return object with state + actions: `{ imageUrl, isFetching, refetch }`
- Store selectors return single values or objects

## Module Design

**Exports:**
- Default exports: rarely used; prefer named exports
- Store exports: `export const useXStore = create<XStoreState>(...)` (const, not function)
- Component exports: `export function ComponentName() { ... }` or `export const ComponentName = () => { ... }`
- Type exports: `export type TypeName = ...` or `export interface InterfaceName { ... }`

**Barrel Files:**
- Used in components: `src/app/features/Match/sub_MatchCollections/components/index.ts`
- Consolidates related exports: `export { Component1 } from './Component1'`

**Zustand Store Pattern:**
```typescript
// Store name follows pattern: use[Feature]Store
export const useGridStore = create<GridStoreState>()(
  persist(
    (set, get) => ({
      // State
      gridItems: [],
      // Actions
      assignItemToGrid: (itemId, position) => {
        set(state => ({
          gridItems: [...state.gridItems, ...]
        }));
      }
    }),
    { name: 'grid-store' }
  )
);
```

**Cross-Store Communication:**
- Access other stores via `useOtherStore.getState()` pattern (not subscription)
- Example in `grid-store.ts`:
  ```typescript
  const sessionStore = useSessionStore.getState();
  sessionStore.updateSessionGridItems(gridItems);
  ```
- Lazy accessors for circular dependencies: `createLazyStoreAccessor()` in `src/lib/stores/`

## Component Patterns

**React Components:**
- Functional components (no class components)
- `"use client"` directive for client components in App Router
- No default exports; named exports only
- Destructure props with TypeScript interface

**State Management:**
- Zustand for app-wide state
- React Query (TanStack Query) for server data
- `useState` for local UI state
- `useCallback` for event handlers to prevent re-renders
- `useMemo` for expensive computations

**Hooks:**
- Custom hooks in `src/hooks/` directory
- Hooks named with `use*` prefix
- Return objects with named values (not arrays)
- Example:
  ```typescript
  export function useProgressiveWikiImage(options) {
    return {
      imageUrl,
      isFetching,
      hasFailed,
      refetch
    };
  }
  ```

## API Route Conventions

**Location:** `src/app/api/[feature]/route.ts` or `src/app/api/[feature]/[resource]/route.ts`

**Export Pattern:**
```typescript
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Handler logic
  return successResponse(data);
});
```

**Response Format:**
- Success: `successResponse(data)` → `{ success: true, data }`
- Created: `createdResponse(data)` → `{ success: true, data }` with 201 status
- Errors: thrown as `GoatError` subclass, caught by `withErrorHandler`

**Query Parameter Handling:**
```typescript
const searchParams = request.nextUrl.searchParams;
const userId = searchParams.get('user_id');
const limit = searchParams.get('limit') ? parseInt(...) : 100;
```

---

*Convention analysis: 2026-01-26*
