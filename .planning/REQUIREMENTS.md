# Requirements: G.O.A.T. (Greatest Of All Time)

**Defined:** 2026-03-14
**Core Value:** Users can complete a full ranking from start to finish — pick a list, fill the grid, and share the result — without hitting dead ends or broken flows.

## v1 Requirements

Requirements for production launch. Each maps to roadmap phases.

### Core Ranking Flow

- [ ] **FLOW-01**: User can select a list and see all backlog items loaded correctly in the collection panel
- [ ] **FLOW-02**: User can drag items from backlog to grid positions without errors
- [ ] **FLOW-03**: User can complete a full ranking (all grid positions filled) and see a completion state
- [ ] **FLOW-04**: Drag-and-drop feels smooth with no lag or visual glitches
- [ ] **FLOW-05**: User can save progress and resume a ranking after closing the browser
- [ ] **FLOW-06**: User can browse available lists by category on the landing page
- [ ] **FLOW-07**: User can search for specific lists from the landing page

### Sharing & Results

- [ ] **SHAR-01**: User can download a PNG image of their completed ranking
- [ ] **SHAR-02**: Result image is sized correctly for social media (Instagram, Twitter/X)
- [ ] **SHAR-03**: User can get a unique shareable URL for their completed ranking
- [ ] **SHAR-04**: Shared link shows OG preview image when pasted in social media/messaging
- [ ] **SHAR-05**: User can choose from 2-3 visual themes for their result image

### Authentication & Accounts

- [ ] **AUTH-01**: User can start ranking without creating an account (guest mode)
- [ ] **AUTH-02**: User can sign up with email/password via Supabase Auth
- [ ] **AUTH-03**: User can sign up with Google OAuth via Supabase Auth
- [ ] **AUTH-04**: User session persists across browser refresh
- [ ] **AUTH-05**: Guest rankings sync to user account after sign-up

### Content & Data

- [ ] **CONT-01**: At least 10-15 popular categories are fully populated with items (100+ each)
- [ ] **CONT-02**: User can create a custom list by typing any topic
- [ ] **CONT-03**: AI generates relevant items with images for custom lists
- [ ] **CONT-04**: Studio list creation flow is intuitive and polished
- [ ] **CONT-05**: Empty/unpopulated categories are hidden from browsing

### Mobile & UI Polish

- [ ] **MOBL-01**: Ranking grid is usable on mobile devices
- [ ] **MOBL-02**: Result/sharing pages render correctly on mobile
- [ ] **MOBL-03**: All interactive components feel natural and polished
- [ ] **MOBL-04**: Loading states, empty states, and error states are handled gracefully

### Production Readiness

- [ ] **PROD-01**: Core store logic has Vitest unit test coverage
- [ ] **PROD-02**: Critical user flows have Playwright E2E tests
- [ ] **PROD-03**: Sentry error monitoring is active in production
- [ ] **PROD-04**: Vercel Analytics tracks user metrics and Core Web Vitals

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social & Community

- **SOCL-01**: User has a public profile page showing completed rankings
- **SOCL-02**: Users can view and compare rankings side-by-side
- **SOCL-03**: Cloud sync of rankings across devices for logged-in users

### Content Expansion

- **CEXP-01**: Community-created list templates
- **CEXP-02**: Embeddable ranking widget for external sites
- **CEXP-03**: Challenge/event rankings (time-limited topics)

### Engagement

- **ENGM-01**: Achievement/badge system for completing rankings
- **ENGM-02**: Consensus rankings (group comparison)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time multiplayer ranking | Massive complexity (WebSocket, conflict resolution), delays launch |
| Social feed / following users | Turns creative tool into social network, requires moderation |
| Community voting / aggregated rankings | Creates groupthink, requires anti-gaming measures |
| Infinite customization (colors, fonts) | UI complexity for everyone; beautiful by default beats customizable-but-ugly |
| Comments / discussions | Requires moderation infrastructure; share to external platforms instead |
| Marketplace for premium templates | Premature; no user base yet |
| Full offline-first sync | Engineering sinkhole; current localStorage approach is sufficient |
| Mobile native app | Web-first with PWA; native app is v2+ consideration |
| Monetization / payments | Premature before validating user demand |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 1 | Pending |
| FLOW-02 | Phase 1 | Pending |
| FLOW-03 | Phase 1 | Pending |
| FLOW-04 | Phase 1 | Pending |
| FLOW-05 | Phase 1 | Pending |
| FLOW-06 | Phase 1 | Pending |
| FLOW-07 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| CONT-01 | Phase 3 | Pending |
| CONT-02 | Phase 3 | Pending |
| CONT-03 | Phase 3 | Pending |
| CONT-04 | Phase 3 | Pending |
| CONT-05 | Phase 3 | Pending |
| SHAR-01 | Phase 4 | Pending |
| SHAR-02 | Phase 4 | Pending |
| SHAR-03 | Phase 4 | Pending |
| SHAR-04 | Phase 4 | Pending |
| SHAR-05 | Phase 4 | Pending |
| MOBL-01 | Phase 4 | Pending |
| MOBL-02 | Phase 4 | Pending |
| MOBL-03 | Phase 5 | Pending |
| MOBL-04 | Phase 5 | Pending |
| PROD-01 | Phase 5 | Pending |
| PROD-02 | Phase 5 | Pending |
| PROD-03 | Phase 5 | Pending |
| PROD-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation — all 30 requirements mapped*
