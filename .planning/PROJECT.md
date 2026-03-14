# G.O.A.T. (Greatest Of All Time)

## What This Is

A web application where users create and rank custom lists (Top 10, Top 50, etc.) by dragging items from a backlog onto a ranked grid. Users can pick from preset categories or create custom lists with AI-generated items, then share their completed rankings as images/links. Built with Next.js, Supabase, and a sophisticated drag-and-drop grid system.

## Core Value

Users can complete a full ranking from start to finish — pick a list, fill the grid, and share the result — without hitting dead ends or broken flows.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Drag-and-drop grid system with assign/move/swap operations — existing
- ✓ Feature-based Next.js App Router architecture — existing
- ✓ Multiple coordinated Zustand stores with persistence — existing
- ✓ Backlog item loading by category — existing
- ✓ Session persistence to localStorage/IndexedDB — existing
- ✓ Keyboard shortcuts for grid interaction — existing
- ✓ TanStack Query data fetching with typed API client — existing
- ✓ GlobalOrchestrator for atomic multi-store transactions — existing
- ✓ TransferProtocol and DragOperationRouter abstractions — existing
- ✓ Error hierarchy with typed GoatError and withErrorHandler — existing
- ✓ Category-based logging system — existing
- ✓ Offline support with SyncEngine — existing
- ✓ Landing page with list browsing — existing
- ✓ Studio page for list/collection creation — existing
- ✓ Comparison modal for item comparison — existing
- ✓ Dark mode theming — existing
- ✓ PWA setup with service worker — existing

### Active

<!-- Current scope. Building toward these for production launch. -->

- [ ] Complete end-to-end ranking flow (backlog items load correctly, grid saves, result generated)
- [ ] Migrate authentication from Clerk to Supabase Auth
- [ ] Complete AI item generation for both preset categories and custom user lists
- [ ] Polish custom list creation UI/UX in Studio
- [ ] Result sharing (generate image + shareable link after completing a ranking)
- [ ] Populate database with complete item data across categories
- [ ] UI/UX polish — natural, intuitive components that feel production-grade
- [ ] Automated test coverage (currently no tests, need confidence to refactor)
- [ ] Production deployment readiness (environment, hosting, monitoring)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Real-time multiplayer ranking — high complexity, not core to initial launch
- Mobile native app — web-first, PWA covers mobile for now
- Social features (following, feeds) — focus on ranking experience first
- Monetization/payments — premature before validating user demand
- Content moderation tools — not needed until user-generated content scales

## Context

- Existing codebase is feature-rich but has broken user flows — items don't load correctly in the ranking grid, preventing users from completing rankings
- Database is partially populated — some categories have items, others are empty or incomplete
- AI item generation (via Google Gemini) exists in Studio but isn't complete
- Clerk auth is in place but planned migration to Supabase Auth is documented
- No automated tests exist — Playwright is configured but no test files written
- Storybook is set up but unclear if stories exist
- The codebase has sophisticated abstractions (GlobalOrchestrator, TransferProtocol, DragOperationRouter) that are well-architected
- 7 coordinated Zustand stores create complexity — must keep in sync
- Legacy/duplicate code exists (e.g., `matching` alongside `Match` features)

## Constraints

- **Tech stack**: Next.js 15 + Supabase + Zustand — established, not changing
- **Auth migration**: Clerk → Supabase Auth — reduces vendor dependency, consolidates under Supabase
- **AI provider**: Google Gemini — already integrated for item generation
- **Target**: Public launch — must be polished enough for strangers to use
- **Hosting**: Vercel (implied by Next.js App Router patterns)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrate Clerk → Supabase Auth | Consolidate auth under Supabase, reduce vendor count | — Pending |
| Keep existing Zustand store architecture | Stores are well-structured with orchestrator; refactor would be high-risk pre-launch | — Pending |
| Sharing via result image generation | Essential for growth — users share rankings to attract new users | — Pending |
| Public launch as first target | Build for strangers, not just friends — forces higher quality bar | — Pending |

---
*Last updated: 2026-03-14 after initialization*
