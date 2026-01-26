# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
goat/
├── src/
│   ├── app/                          # Next.js App Router pages and routes
│   │   ├── api/                      # API route handlers (REST endpoints)
│   │   ├── features/                 # Feature-based modules
│   │   ├── layout.tsx                # Root layout (providers)
│   │   └── page.tsx                  # Home page (landing)
│   │
│   ├── components/                   # Shared UI components
│   │   ├── app/                      # App-specific components
│   │   ├── patterns/                 # Reusable patterns (drag-drop, forms, etc)
│   │   ├── ui/                       # Radix UI + Tailwind primitives
│   │   └── theme/                    # Theme provider and utilities
│   │
│   ├── lib/                          # Shared utility libraries and business logic
│   │   ├── api/                      # API client and query utilities
│   │   ├── dnd/                      # Drag-drop protocol and handlers
│   │   ├── grid/                     # Grid operations and validation
│   │   ├── match/                    # Match orchestration logic
│   │   ├── validation/               # Validation rules and authority
│   │   ├── offline/                  # Offline cache and PWA support
│   │   ├── hooks/                    # Reusable custom hooks
│   │   └── [other domains]           # Domain-specific utilities
│   │
│   ├── stores/                       # Zustand state stores
│   │   ├── grid-store.ts             # Grid state and drag logic
│   │   ├── session-store.ts          # Session persistence
│   │   ├── match-store.ts            # Match UI state
│   │   ├── backlog-store.ts          # Backlog groups/items
│   │   ├── ranking-store.ts          # Tier ranking state
│   │   └── [other stores]            # Domain-specific stores
│   │
│   ├── types/                        # TypeScript definitions
│   │   ├── match.ts                  # Grid and match types
│   │   ├── backlog-groups.ts         # Backlog domain types
│   │   └── [other types]             # Domain types
│   │
│   ├── providers/                    # Context providers
│   │   ├── BacklogProvider.tsx       # Backlog initialization
│   │   └── query-provider.tsx        # TanStack Query setup
│   │
│   ├── hooks/                        # App-level custom hooks
│   ├── globals.css                   # Global Tailwind styles
│   └── layout.tsx                    # Root layout file (providers)
│
├── public/                           # Static assets
│   ├── groups/                       # Category images
│   ├── avatars/                      # User avatars
│   └── [other static]                # Favicon, etc
│
├── docs/                             # Documentation
│   ├── analysis/                     # Analysis documents
│   ├── features/                     # Feature documentation
│   └── [other docs]
│
├── e2e/                              # Playwright E2E tests
├── db/                               # Database migrations and seeds
├── context/                          # Build context/config
└── scripts/                          # Build and utility scripts
```

## Directory Purposes

**src/app/api/:**
- Purpose: Server-side REST API handlers
- Contains: Route handler files (`route.ts`)
- Key paths:
  - `api/lists/` - List CRUD operations
  - `api/top/groups/` - Backlog category/item retrieval
  - `api/match/` - Match-specific operations
  - `api/share/` - Sharing and result handling
  - `api/challenges/` - Challenge system endpoints
  - `api/webhooks/clerk` - Clerk auth webhooks

**src/app/features/:**
- Purpose: Feature-based application modules
- Contains: Feature-specific components, hooks, lib, types
- Naming: PascalCase directories
- Key features:
  - `Match/` - Core matching/ranking interface (103+ files)
  - `Collection/` - Backlog item display and management
  - `Landing/` - Home page and list browsing
  - `Challenges/` - Challenge system UI
  - `Awards/` - Achievement/award display
  - `Share/` - Result sharing interface
  - `CommandPalette/` - Command palette navigation
  - `Admin/` - Administrative tools

**src/components/app/:**
- Purpose: App-specific reusable components
- Contains: UI components used across features
- Subdirectories:
  - `button/` - Button variants
  - `match/` - Match-specific components
  - `modals/` - Modal implementations
  - `icons/` - Icon libraries
  - `decorations/` - Decorative elements

**src/components/patterns/:**
- Purpose: Reusable interaction patterns
- Contains: Complex component patterns
- Examples:
  - `drag-drop/` - DnD utilities
  - `forms/` - Form components
  - `virtualization/` - Virtual scrolling
  - `badges/` - Badge components

**src/components/ui/:**
- Purpose: Radix UI + Tailwind primitive components
- Contains: Base UI components
- Examples: Button, Card, Modal, Dialog, Toast, etc.

**src/lib/dnd/:**
- Purpose: Drag-and-drop protocol and handlers
- Contains:
  - `unified-protocol.ts` - Unified drag/drop data format
  - `transfer-protocol.ts` - Item transfer protocol
  - `type-guards.ts` - Type checking utilities
  - `index.ts` - Protocol exports and helpers

**src/lib/grid/:**
- Purpose: Grid item management and validation
- Contains:
  - `item-factory.ts` - Factory functions for grid items
  - `transfer-validator.ts` - Transfer validation logic

**src/lib/validation/:**
- Purpose: Centralized business rule validation
- Contains: ValidationAuthority pattern implementation
- Exports: ValidationErrorCode enum, validation functions

**src/lib/match/:**
- Purpose: Match session orchestration
- Contains:
  - `orchestrator.ts` - Command pattern orchestrator
  - `use-orchestrator.ts` - Hook for orchestrator access

**src/lib/offline/:**
- Purpose: Offline-first PWA support
- Contains: Cache management, sync logic, status tracking

**src/lib/api/:**
- Purpose: API client and server functions
- Contains: Client wrapper, query utilities, request coalescing

**src/stores/:**
- Purpose: Centralized Zustand state management
- Core stores:
  - `grid-store.ts` - Grid state, drag logic (single source of truth for grid)
  - `session-store.ts` - Session persistence, backlog management
  - `match-store.ts` - Match UI state (keyboard mode, modals, etc)
  - `backlog-store.ts` - Backlog groups and items (modularized)
  - `ranking-store.ts` - Tier ranking state
- Supporting stores:
  - `comparison-store.ts` - Item comparison modal
  - `filter-store.ts` - Item filtering
  - `user-preferences-store.ts` - User settings
  - `activity-store.ts` - User activity tracking

**src/stores/backlog/:**
- Purpose: Modularized backlog store implementation
- Contains:
  - `store.ts` - Store definition
  - `actions-*.ts` - Action groups (data, groups, items, offline, utils)
  - `selectors.ts` - Selector hooks for components
  - `types.ts` - Store types

**src/stores/item-store/:**
- Purpose: Session and item data management
- Contains:
  - `session-manager.ts` - Session lifecycle
  - `normalized-session.ts` - Normalized storage format
  - `grid-operations.ts` - Grid manipulation utilities
  - `types.ts` - Store types

**src/types/:**
- Purpose: Centralized TypeScript type definitions
- Key files:
  - `match.ts` - GridItemType, BacklogItemType, MatchSession
  - `backlog-groups.ts` - BacklogItem, BacklogGroup, API types
  - `ranking.ts` - Tier ranking types
  - `consensus.ts` - Voting/consensus types
  - `list-intent.ts` - List creation intent types

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` - Home page (renders LandingLayout)
- `src/app/layout.tsx` - Root layout with all providers
- `src/app/global-error.tsx` - Global error boundary

**Configuration:**
- `next.config.js` - Next.js configuration (turbopack, images, PWA headers)
- `tsconfig.json` - TypeScript configuration (strict mode, path aliases)
- `tailwind.config.ts` - Tailwind theme and plugins
- `.eslintrc.json` - ESLint configuration

**Core Logic:**
- `src/stores/grid-store.ts` - Drag-drop and grid operations (1000+ lines)
- `src/stores/session-store.ts` - Session persistence and backlog sync
- `src/stores/match-store.ts` - Match UI orchestration
- `src/lib/dnd/unified-protocol.ts` - Drag-drop ID protocol
- `src/lib/grid/transfer-validator.ts` - Transfer validation rules

**Testing:**
- `e2e/` - Playwright E2E tests
- `[feature]/*.test.ts` or `.test.tsx` - Unit/integration tests (pattern not yet established)

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `SimpleMatchGrid.tsx`)
- Stores: `kebab-case-store.ts` (e.g., `grid-store.ts`)
- Utilities: `camelCase.ts` (e.g., `transfer-validator.ts`)
- Types: `PascalCase.ts` (e.g., `backlog-groups.ts`)
- Hooks: `use[PascalCase].ts` or `.tsx` (e.g., `useTouchGestures.ts`)

**Directories:**
- Features: `PascalCase` (e.g., `Match`, `Collection`)
- Utilities: `kebab-case` (e.g., `dnd`, `query-keys`)
- Domain libs: `kebab-case` (e.g., `backlog-store`, `grid`)

**Exports:**
- Use named exports in `index.ts` files for public APIs
- Example: `src/lib/dnd/index.ts` exports protocol utilities

**Path Aliases:**
- `@/*` → `./src/*` (configured in tsconfig.json)
- Use `@/` for all imports from src/ (enforced convention)

## Where to Add New Code

**New Feature:**
- Primary code: `src/app/features/[FeatureName]/`
  - Create subdirectories: `components/`, `hooks/`, `lib/`, `types/` as needed
  - Main export file: `src/app/features/[FeatureName]/index.tsx` or named file
- Tests: `src/app/features/[FeatureName]/[name].test.tsx`
- Route: `src/app/[feature-route]/page.tsx` or `src/app/features/[FeatureName]/page.tsx`

**New Component:**
- If feature-specific: `src/app/features/[FeatureName]/components/[ComponentName].tsx`
- If shared across features: `src/components/app/[DomainName]/[ComponentName].tsx`
- If UI primitive: `src/components/ui/[ComponentName].tsx`

**New Store:**
- Location: `src/stores/[domain]-store.ts`
- If complex: `src/stores/[domain]/` directory with modular structure
- Import in components via `useXStore` hook
- Pattern: Use `create()` from zustand, persist middleware for important state

**New Utility/Library:**
- If domain-specific: `src/lib/[domain]/` directory
- Core utilities: `src/lib/utils.ts` or `src/lib/[utility-name].ts`
- Query utilities: `src/lib/query-keys/[domain].ts`
- Validation: `src/lib/validation/[rule-name].ts`

**New API Route:**
- Location: `src/app/api/[resource]/route.ts`
- Subdirectories: Create nested routes via directories
- Pattern: Export `GET`, `POST`, `PUT`, `DELETE` handlers
- Example: `src/app/api/lists/[id]/route.ts` for `PUT /api/lists/:id`

**New Hook:**
- If feature-specific: `src/app/features/[FeatureName]/hooks/[useHookName].ts`
- If shared: `src/hooks/[useHookName].ts` or `src/lib/hooks/[useHookName].ts`

**New Type:**
- Location: `src/types/[domain].ts`
- Domain examples: `match.ts`, `backlog-groups.ts`, `ranking.ts`

## Special Directories

**src/lib/offline/:**
- Purpose: Offline-first PWA cache and sync
- Generated: No (code-based)
- Committed: Yes

**public/groups/:**
- Purpose: Category image assets
- Generated: No (manually curated)
- Committed: Yes

**db/migrations/:**
- Purpose: PostgreSQL migration files
- Generated: No (version controlled)
- Committed: Yes

**.next/:**
- Purpose: Next.js build output
- Generated: Yes (by build process)
- Committed: No

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (by npm install)
- Committed: No

**context/:**
- Purpose: Build context and configuration
- Generated: No (manually managed)
- Committed: Yes

---

*Structure analysis: 2026-01-26*
