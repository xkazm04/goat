# Roadmap: G.O.A.T. (Greatest Of All Time)

## Overview

This roadmap takes the existing feature-rich but broken codebase to a production-ready public launch. The dependency chain is strict: the core ranking flow must be fixed first because every downstream feature (sharing, AI lists, profiles) is worthless if items do not load into the grid correctly. Auth migration follows because all user-facing persistence requires a stable identity layer. Database population and AI generation come next to make the app substantively useful rather than just technically functional. Sharing closes the viral loop. Testing and production readiness formalize launch readiness. Five phases, each delivering one complete, verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Ranking Flow** - Fix the broken end-to-end ranking experience so users can pick, fill, and save a list (completed 2026-03-14)
- [x] **Phase 2: Auth Migration** - Replace Clerk with Supabase Auth so user identity is stable before data ownership matters (completed 2026-03-14)
- [ ] **Phase 3: Content and AI Generation** - Populate 10-15 categories and complete the AI custom list pipeline
- [ ] **Phase 4: Result Sharing** - Implement real image generation and shareable links to close the viral loop
- [ ] **Phase 5: Polish and Production Readiness** - UI polish, test coverage, error monitoring, and launch gate

## Phase Details

### Phase 1: Core Ranking Flow
**Goal**: Users can complete a full ranking from start to finish without hitting dead ends
**Depends on**: Nothing (first phase)
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07
**Success Criteria** (what must be TRUE):
  1. User selects a list and sees all backlog items loaded correctly in the collection panel with no missing or duplicated entries
  2. User can drag items from the backlog to grid positions and the grid visually updates with no lag or glitches
  3. User can fill all grid positions and the app shows a clear completion state
  4. User can close the browser and return to find their ranking exactly where they left it
  5. User can browse and search available lists from the landing page and find populated categories
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md -- Debug and fix item loading, store hydration gate, LRU eviction, legacy cleanup (completed 2026-03-14)
- [x] 01-02-PLAN.md -- Wire CompletionModal, landing page category browse and search (completed 2026-03-14)

### Phase 2: Auth Migration
**Goal**: Supabase Auth replaces Clerk so user identity is correct before any data ownership is assigned
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can complete a ranking without creating an account (guest mode works end-to-end)
  2. User can sign up with email/password or Google OAuth via Supabase Auth
  3. User session persists across browser refresh without re-authentication
  4. Guest rankings are linked to the user's account after they sign up
**Plans**: TBD

Plans:
- [x] 02-01: Supabase Auth foundation -- useAuthUser hook, middleware, OAuth callback, merge endpoint, Clerk removal (completed 2026-03-14)
- [x] 02-02: Auth UI components -- AuthModal, AuthPrompt, UserMenu wired into layout and match flow (completed 2026-03-14)

### Phase 3: Content and AI Generation
**Goal**: The app has real content users want to rank, and anyone can create a custom list via AI
**Depends on**: Phase 2
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05
**Success Criteria** (what must be TRUE):
  1. At least 10 categories are fully populated (100+ items with images) and discoverable from the landing page
  2. Empty or underpopulated categories are hidden from browsing automatically
  3. User types any topic in Studio and receives a populated, rankable list of AI-generated items with images
  4. Studio list creation flow feels polished — progress feedback, error states, clear save/publish action
**Plans**: TBD

Plans:
- [ ] 03-01: Run category audit, write idempotent seed scripts, populate and gate categories
- [ ] 03-02: Complete Gemini generation pipeline — Zod schema, rate limiting, image enrichment, save to Supabase
- [ ] 03-03: Polish Studio UI — progress UX, error states, confirmation flow

### Phase 4: Result Sharing
**Goal**: Users can download a branded result image and share a link that shows an OG preview
**Depends on**: Phase 3
**Requirements**: SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, MOBL-01, MOBL-02
**Success Criteria** (what must be TRUE):
  1. User can download a PNG of their completed ranking sized correctly for Instagram and Twitter/X
  2. User can choose from 2-3 visual themes for their result image before downloading
  3. User can copy a unique shareable URL for their completed ranking
  4. Pasting the shareable URL in Twitter, iMessage, or Slack shows an OG preview card with the result image
  5. The ranking grid and result/sharing pages render correctly and are usable on mobile
**Plans**: TBD

Plans:
- [ ] 04-01: Implement client-side image capture with @zumer/snapdom — replace generate-result-image stub
- [ ] 04-02: Build /share/[code] server-rendered page with OG meta tags and Next.js ImageResponse
- [ ] 04-03: Mobile grid usability and sharing page responsive layout validation

### Phase 5: Polish and Production Readiness
**Goal**: The app is stable enough for strangers, monitored in production, and covered by tests
**Depends on**: Phase 4
**Requirements**: MOBL-03, MOBL-04, PROD-01, PROD-02, PROD-03, PROD-04
**Success Criteria** (what must be TRUE):
  1. All interactive components — drag handles, buttons, modals, forms — feel natural and give appropriate feedback
  2. Loading states, empty states, and error states are handled gracefully throughout the app
  3. Core store logic (grid, session, comparison) is covered by Vitest unit tests
  4. Critical user flows (ranking, sign-up, studio generation, sharing) are covered by Playwright E2E tests
  5. Sentry captures production errors and Vercel Analytics tracks Core Web Vitals
**Plans**: TBD

Plans:
- [ ] 05-01: UI polish pass — loading, empty, and error states across all major views
- [ ] 05-02: Vitest unit tests for core stores and Playwright E2E for critical flows
- [ ] 05-03: Sentry, Vercel Analytics, and Speed Insights integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Ranking Flow | 2/2 | Complete   | 2026-03-14 |
| 2. Auth Migration | 2/2 | Complete   | 2026-03-14 |
| 3. Content and AI Generation | 0/3 | Not started | - |
| 4. Result Sharing | 0/3 | Not started | - |
| 5. Polish and Production Readiness | 0/3 | Not started | - |
