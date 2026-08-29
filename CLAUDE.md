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

### Quality gates

Every command below runs in CI (`.github/workflows/gates.yml`) and every one of
them can go red — each was proved able to fail before being trusted. Run them
before proposing a change; a change that reddens one of them is not finished.

```bash
npm test                        # vitest. passWithNoTests:false — a run that
                                # executed zero files is RED, not green.
npm run lint                    # eslint. 44 correctness rules are `error`;
                                # everything with a legacy population is `warn`
                                # and held by the ratchet instead.
npm run lint:ratchet            # symmetric per-rule ratchet over
                                # .ai/ratchet-baseline.json. A RISE fails. An
                                # unexplained DROP also fails — re-baseline with
                                # `npm run lint:ratchet:update` and say in the
                                # commit message which of fixed / deleted /
                                # counter-broke it was. Exit 2 = could not run,
                                # which is neither pass nor fail.
npm run typecheck               # 23 inherited errors; pinned by the ratchet
                                # rather than blocking bare.
npm run docs:store-graph -- --check   # the store graph is GENERATED from
                                # src/stores/registry.ts. Regenerate in the same
                                # change that touches the manifest.
npm run docs:coupling           # source→doc coupling map (.ai/doc-coupling.json):
                                # fails on a stale glob or a missing reference doc.
npm run docs:coupling -- --changed --base main
                                # same-change enforcement: reads the git diff and
                                # names the document this change owes. Settle it,
                                # or dismiss it on the record with a commit
                                # trailer:  Docs-dismissed: <why>
npm run scan:dead               # knip. Unused EXPORTS — the orphan class eslint
                                # structurally cannot see.
npm run findings:check          # the findings ledger (.ai/findings.json), DERIVED
                                # from docs/harness/ui-bug-combined-2026-06-16/.
                                # Fails if the ledger drifts from the reports, if
                                # a finding's state is outside the vocabulary, if
                                # a suppression carries no reason, or if a
                                # regression probe on a `fixed` finding fires.
npm run findings                # what the ledger can answer that a snapshot
                                # cannot: state, severity, anchor liveness, age.
npm run findings:ingest         # re-derive after editing a report file.
npm run structure:check         # the structural improvement loop
                                # (.ai/structural-backlog.json). Fails if a spec
                                # is no longer grounded in the tree it quotes, if
                                # a spec marked `executed` does not meet its own
                                # stop condition, or if a decline carries no
                                # reason. Read this BEFORE proposing a structural
                                # change — one of its five specs is a recorded
                                # DECLINE, and re-proposing it needs new evidence.
npm run structure               # the loop's memory, readable.
```

### The browser suite

`npm run test:e2e` **cannot run against an empty database** — every journey
starts by clicking a list, so an unseeded run would execute nothing and report
green. `e2e/global-setup.ts` refuses such a run; the fixtures are a separate,
deliberate command:

```bash
npm run seed:e2e                 # deterministic fixtures (2 lists, 18 items)
npm run seed:e2e -- --check      # verify without writing — safe anywhere
npm run seed:e2e -- --teardown   # remove exactly what it wrote
```

Every row it writes carries a fixed UUID in the `e2e00000-…` namespace and
nothing outside that namespace is touched, so it is safe against the shared
development database. It refuses a non-local target unless
`E2E_SEED_ALLOW_REMOTE=1`. In CI the suite is **manual dispatch only** — its
input is not the tree — and it refuses loudly rather than skipping when
unconfigured. See `.ai/manifest.yaml` `capabilityNotes.e2e-fixtures`.

There are deliberately **no git hooks**. CI covers the push rung; the unguarded
commit rung is a dated gap in `.ai/manifest.yaml`, not an oversight.

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16 (App Router) — `next@^16.1.3`. Note `next lint` was
  removed in 16; lint via `npm run lint`, which invokes `eslint` directly.
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

> **Corrected 2026-08-24**: this list previously ended with
> *"**matching**: (Legacy/alternate match implementation)"*. There is no
> `src/app/features/matching/` directory and there has not been one in this
> tree; the identifier survived only here and in
> `docs/features/PARTICLE_THEME_SYSTEM.md`, which names six files under it that
> also do not exist. The live feature directories are: `Achievement`,
> `Analytics`, `Awards`, `Collection`, `Collections`, `CommandPalette`,
> `Landing`, `Match`, `Studio`, `Templates`.

### State Management Architecture

**Critical**: The app uses **multiple coordinated Zustand stores** that must stay in sync.

The authority on how many stores there are and how they depend on each other is
`src/stores/registry.ts` (`STORE_DEPENDENCIES`, 24 declared stores). It validates
itself at module load — a cycle or an edge to an undeclared store throws in dev.
`docs/STORE_DEPENDENCY_GRAPH.md` is generated from it (`npm run docs:store-graph`);
do not hand-edit the generated block, and do not restate the store list here.

The four that carry the match flow, deepest last:

1. **`backlog-store.ts`**: Backlog group state
2. **`session-store.ts`**: Session persistence, backlog management
3. **`grid-store.ts`**: Grid state (50 positions max), drag-and-drop handlers
4. **`match-store.ts`**: UI state, keyboard navigation, match session orchestration

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
- **ESLint**: NOT disabled during builds — `next.config.js` sets neither
  `eslint.ignoreDuringBuilds` nor `typescript.ignoreBuildErrors`. Every custom
  rule in `eslint.config.mjs` is nevertheless `warn`, including
  `react-hooks/rules-of-hooks`, so lint cannot currently fail anything.

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

<!-- personas:context-map:start -->
## Project Context Map

This project is organized into **64 contexts** across **21 groups**. The full machine-readable map lives in `context-map.json` at the project root — read it at task start to scope your edits to the relevant context's files.

Taxonomy: each context has a `category` (ui · api · lib · data · test · config); each group has a `domain` (feature · infrastructure · shared · integration · data).

### Groups

- **Authentication & Data Access** _(domain: infrastructure · 2 contexts)_
- **Ranking & Match** _(domain: feature · 10 contexts)_
- **List & Content Management** _(domain: feature · 8 contexts)_
- **UI Utilities** _(domain: shared · 1 contexts)_
- **Match Workflow** _(domain: feature · 2 contexts)_
- **Item & Media Display** _(domain: shared · 1 contexts)_
- **Ranking Scores & Progress** _(domain: feature · 2 contexts)_
- **Visual Design System** _(domain: shared · 3 contexts)_
- **UI Primitives** _(domain: shared · 1 contexts)_
- **Ranking & Match Engine** _(domain: feature · 4 contexts)_
- **Content Discovery** _(domain: feature · 3 contexts)_
- **Social & Sharing** _(domain: feature · 2 contexts)_
- **Media & Visual** _(domain: feature · 2 contexts)_
- **Feedback & UX Infrastructure** _(domain: shared · 2 contexts)_
- **API & Data Layer** _(domain: infrastructure · 5 contexts)_
- **Personalization & Analytics** _(domain: feature · 2 contexts)_
- **Shared Utilities** _(domain: shared · 1 contexts)_
- **Engagement & Rewards** _(domain: feature · 2 contexts)_
- **API Routes** _(domain: infrastructure · 5 contexts)_
- **App Shell** _(domain: infrastructure · 2 contexts)_
- **Developer Tooling** _(domain: infrastructure · 2 contexts)_

> Auto-generated by Personas on each context scan. Edits between the markers are overwritten on the next scan; edit `context-map.json` or rescan instead.
<!-- personas:context-map:end -->
