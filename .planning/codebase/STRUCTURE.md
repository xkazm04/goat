# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
goat/
├── src/
│   ├── app/                      # Next.js App Router pages, layouts, API routes
│   │   ├── layout.tsx            # Root layout with provider hierarchy
│   │   ├── page.tsx              # Home page (/)
│   │   ├── globals.css           # Global styles
│   │   ├── api/                  # API route handlers (Next.js route segments)
│   │   ├── features/             # Feature-based UI modules (co-located with app)
│   │   ├── achievement/          # Achievement page routes
│   │   ├── award/                # Award page route
│   │   ├── blueprint/            # Blueprint page route
│   │   ├── collections/          # Collections page route
│   │   ├── my-collections/       # My collections page route
│   │   ├── share/                # Share page route
│   │   ├── studio/               # Studio page route
│   │   ├── match-test/           # Match test/debug route
│   │   └── offline/              # Offline fallback page
│   ├── components/               # Shared/reusable UI components
│   │   ├── app/                  # App-level components (buttons, icons, modals, decorations)
│   │   ├── ui/                   # Generic UI primitives (Radix-based)
│   │   ├── visual/               # Visual/decorative components (3D, depth effects)
│   │   ├── patterns/             # Reusable interaction patterns (drag-drop, virtualization, badges)
│   │   ├── 3d/                   # 3D/parallax components
│   │   ├── AudioPlayer/          # Audio playback component
│   │   ├── RichItemCard/         # Enriched item card component
│   │   ├── theme/                # Theme provider and switcher
│   │   └── dev/                  # Dev-only components
│   ├── stores/                   # Zustand state stores
│   │   ├── backlog/              # Modular backlog store (actions, selectors, types)
│   │   ├── item-store/           # Session manager, normalized data, grid operations
│   │   ├── slices/               # Store slices (grid-slice.ts)
│   │   ├── registry.ts           # Store dependency graph and initialization order
│   │   ├── match-store.ts        # Match UI state, keyboard nav, session orchestration
│   │   ├── grid-store.ts         # Grid state and drag-and-drop handlers (primary DnD store)
│   │   ├── session-store.ts      # Session persistence, backlog management (persisted)
│   │   ├── backlog-store.ts      # Backlog re-export shim (backward compat)
│   │   ├── comparison-store.ts   # Item comparison modal state
│   │   ├── use-list-store.ts     # Current list metadata
│   │   ├── placement-store.ts    # Smart fill / placement state
│   │   ├── validation-notification-store.ts  # Drag validation error notifications
│   │   ├── filter-store.ts       # Filter state
│   │   ├── criteria-store.ts     # Criteria/scoring state
│   │   ├── ranking-store.ts      # Ranking state
│   │   ├── consensus-store.ts    # Community consensus state
│   │   ├── studio-store.ts       # Studio creation state
│   │   ├── panel-store.ts        # Panel open/close state
│   │   ├── layout-store.ts       # Layout preferences
│   │   ├── audio-store.ts        # Audio player state
│   │   ├── activity-store.ts     # Activity feed state
│   │   └── inspector-store.ts    # Item inspector panel state
│   ├── lib/                      # Shared logic, utilities, hooks, and domain modules
│   │   ├── api/                  # GoatAPI client, batching, caching, deduplication
│   │   ├── dnd/                  # Drag-and-drop: TransferProtocol, DragOperationRouter, operations
│   │   ├── errors/               # Error classes, API error handler, typed responses
│   │   ├── hooks/                # Shared React hooks (useHydrationSafe, data hooks, auth hooks)
│   │   ├── supabase/             # Supabase browser/server client factories
│   │   ├── query-keys/           # Centralized TanStack Query key factories
│   │   ├── validation/           # ValidationAuthority, list-intent validator
│   │   ├── orchestration/        # GlobalOrchestrator, command bus, orchestrated drag handlers
│   │   ├── logger/               # Category-based structured logger
│   │   ├── offline/              # OfflineProvider, SyncEngine, SyncQueue, NetworkMonitor
│   │   ├── stores/               # Store utilities (lazy-store-accessor, store-registry)
│   │   ├── grid/                 # Grid utilities (createEmptyGrid, constants, GRID_LIMITS)
│   │   ├── tiers/                # Tier list algorithms and components
│   │   ├── tier/                 # Tier configuration utilities
│   │   ├── match/                # Match-specific lib utilities
│   │   ├── criteria/             # Scoring criteria templates and logic
│   │   ├── consensus/            # Consensus data service, heatmap, controversy calculator
│   │   ├── sharing/              # ShareManager, DeepLinkGenerator, platform-specific sharing
│   │   ├── filters/              # Filter builder, facets, filter components
│   │   ├── search/               # Search utilities
│   │   ├── personalization/      # User preference and recommendation logic
│   │   ├── enrichment/           # Item data enrichment fetchers
│   │   ├── image-gen/            # Image generation utilities
│   │   ├── og/                   # Open Graph card layouts
│   │   ├── cache/                # Cache management
│   │   ├── storage/              # Storage utilities
│   │   ├── animations/           # Animation hooks and variants (Framer Motion)
│   │   ├── agent-bridge/         # AI agent bridge (task memory, types)
│   │   ├── collaboration/        # Collaboration utilities
│   │   ├── timing/               # Debounce/timing constants
│   │   ├── constants/            # App-wide constants
│   │   ├── helpers/              # General helper functions
│   │   ├── utils/                # Utility functions
│   │   └── providers/            # Shared React providers
│   ├── providers/                # Root-level React providers
│   │   ├── BacklogProvider.tsx   # Initializes backlog store, network sync
│   │   ├── query-provider.tsx    # TanStack Query client setup
│   │   └── prefetch-provider.tsx # Prefetch coordination
│   ├── services/                 # Application-level services
│   │   └── list-creation-service.ts  # Unified list creation flow (validation → API)
│   ├── hooks/                    # Root-level hooks (supabase-auth)
│   │   └── supabase-auth/        # Supabase auth hooks
│   └── types/                    # TypeScript type definitions
│       ├── database.ts           # Auto-generated/curated Supabase DB types
│       ├── match.ts              # GridItemType, BacklogItemType
│       ├── backlog-groups.ts     # BacklogGroup, BacklogItem
│       ├── top-lists.ts          # TopList, ListCreationResponse
│       ├── ranking.ts            # Ranking types
│       ├── collection.ts         # Collection types
│       ├── blueprint.ts          # Blueprint types
│       ├── consensus.ts          # Consensus types
│       ├── share.ts              # Share/embed types
│       ├── studio.ts             # Studio types
│       ├── list-intent.ts        # ListIntent (creation intent model)
│       └── ...                   # Other domain types
├── db/
│   ├── migrations/               # Raw SQL migration files
│   ├── scripts/                  # DB utility scripts
│   └── seeds/                    # DB seed files
├── supabase/
│   └── migrations/               # Supabase migration files (timestamped SQL)
├── database/                     # Additional DB schema references
├── e2e/                          # End-to-end tests (Playwright)
├── docs/                         # Internal documentation and analysis
├── context/                      # Theme fallback context files
├── scripts/                      # Project utility scripts
├── public/                       # Static assets (avatars, games, gifs, groups, sounds)
├── .planning/                    # GSD planning documents
├── .storybook/                   # Storybook configuration
└── .claude/                      # Claude AI skill definitions
```

## Directory Purposes

**`src/app/features/`:**
- Purpose: Self-contained feature modules that map to major user-facing workflows
- Contains: Feature layout components, sub-features (`sub_*`), co-located hooks, lib utilities, components
- Key features:
  - `Match/` — Core ranking interface (grid, bracket, tier modes, drag-drop, share)
  - `Collection/` — Backlog item browser and collection management panel
  - `Landing/` — Home page, list showcase, create list flow
  - `Studio/` — List/collection creation wizard with AI assistance
  - `Challenges/` — Social ranking challenges
  - `Achievement/` — User achievement display
  - `Awards/` — Award ceremony feature
  - `CommandPalette/` — Global command palette (`⌘K`)
  - `Share/` — Share page rendering
  - `FilterBuilder/` — Advanced filter building UI
  - `Collections/` — Community collections browser

**`src/app/api/`:**
- Purpose: All server-side REST endpoints; each directory maps to a route segment
- Contains: `route.ts` files with named exports (`GET`, `POST`, `PUT`, `DELETE`)
- Key endpoints: `/api/lists`, `/api/top/groups`, `/api/items`, `/api/match/generate-result-image`, `/api/share`, `/api/challenges`, `/api/studio`, `/api/blueprints`, `/api/consensus`, `/api/agent-bridge`, `/api/v1/*` (public API)

**`src/stores/`:**
- Purpose: All Zustand client state; each file is one domain store
- Key stores: `grid-store.ts` (DnD authority), `session-store.ts` (persistence), `match-store.ts` (orchestrator), `backlog-store.ts` (backlog shim)
- Modular stores: `backlog/` (split into actions-*, selectors, types)

**`src/lib/`:**
- Purpose: All logic that is not tied to a specific page or feature; safe to import from anywhere
- Notable modules: `dnd/` (TransferProtocol), `orchestration/` (GlobalOrchestrator), `api/` (GoatAPI), `offline/` (SyncEngine)

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout and provider hierarchy
- `src/app/page.tsx`: Home page
- `src/app/features/Match/`: Core match/ranking interface

**Configuration:**
- `src/stores/registry.ts`: Store dependency graph
- `src/lib/grid/constants.ts`: `GRID_LIMITS`, `TUTORIAL_GRID`
- `src/lib/timing/index.ts`: `DEBOUNCE` constants
- `src/lib/config/category-config.ts`: Category configuration

**Core Logic:**
- `src/stores/grid-store.ts`: Grid state and drag-and-drop handlers
- `src/stores/session-store.ts`: Session persistence and backlog management
- `src/stores/match-store.ts`: Match session orchestration
- `src/lib/dnd/transfer-protocol.ts`: Drag-and-drop abstraction
- `src/lib/dnd/operations/DragOperationRouter.ts`: DnD operation dispatcher
- `src/lib/orchestration/GlobalOrchestrator.ts`: Atomic multi-store transactions
- `src/lib/api/goat-api.ts`: Unified API client
- `src/lib/errors/api-error-handler.ts`: API route error handler (`withErrorHandler`)
- `src/lib/supabase/server.ts`: Server-side Supabase client factory
- `src/lib/supabase/client.ts`: Browser-side Supabase client factory

**Hydration/SSR Safety:**
- `src/lib/hooks/useHydrationSafe.ts`: Hook to defer client-only rendering

**Testing:**
- `e2e/drag-drop-ranking.spec.ts`: E2E drag-and-drop tests
- `e2e/list-play-journey.spec.ts`: E2E list play journey tests
- `src/components/visual/__tests__/`: Visual component unit tests

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `CollectionPanel.tsx`, `TierRow.tsx`)
- Hooks: `use-kebab-case.ts` or `useCamelCase.ts` (both styles present; prefer `use-kebab-case.ts` for new hooks in `src/lib/hooks/`)
- Stores: `kebab-case-store.ts` or `use-kebab-case-store.ts` (e.g., `grid-store.ts`, `use-list-store.ts`)
- Utilities/lib: `kebab-case.ts`
- API routes: `route.ts` inside the route directory segment

**Directories:**
- Feature modules: `PascalCase/` under `src/app/features/`
- Sub-features within a feature: `sub_PascalCase/` (e.g., `sub_MatchGrid/`, `sub_DropZone/`)
- Route segments: `kebab-case/` or `[paramName]/` (Next.js convention)

**Components:**
- Named exports preferred for feature components; default exports for page-level components (Next.js requirement)
- Barrel files (`index.ts`) at each feature/module root for controlled re-exports

## Where to Add New Code

**New Feature (user-facing page workflow):**
- Primary code: `src/app/features/[FeatureName]/`
- Sub-components: `src/app/features/[FeatureName]/components/`
- Feature-local hooks: `src/app/features/[FeatureName]/hooks/`
- Feature-local utilities: `src/app/features/[FeatureName]/lib/`
- Tests: `src/app/features/[FeatureName]/__tests__/` or `e2e/`

**New API Endpoint:**
- Route handler: `src/app/api/[resource]/route.ts`
- Use `withErrorHandler` from `src/lib/errors/`
- Use `createClient()` from `src/lib/supabase/server.ts`
- Add TanStack Query keys to `src/lib/query-keys/`

**New Zustand Store:**
- File: `src/stores/[domain]-store.ts`
- Register in `src/stores/registry.ts` with correct dependency order
- Export selectors separately if the store is large (see `src/stores/backlog/selectors.ts`)

**New Shared Component:**
- Generic UI primitive: `src/components/ui/`
- App-specific shared component: `src/components/app/`
- Visual/decorative: `src/components/visual/`

**New Utility/Hook:**
- Shared hook: `src/lib/hooks/use-[name].ts`
- Domain utility: `src/lib/[domain]/`
- App-wide constant: `src/lib/constants/`

**New Type:**
- Domain type: `src/types/[domain].ts`
- Database row type: extend `src/types/database.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (codebase maps, phase plans)
- Generated: Yes (by GSD commands)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`supabase/migrations/`:**
- Purpose: Supabase migration files applied to the hosted database
- Generated: Partially (Supabase CLI)
- Committed: Yes

**`db/migrations/`:**
- Purpose: Raw SQL migrations; may be applied separately from Supabase migrations
- Generated: Manually authored
- Committed: Yes

**`e2e/`:**
- Purpose: Playwright end-to-end tests
- Generated: No
- Committed: Yes

**`context/`:**
- Purpose: Theme fallback context reference files
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-14*
