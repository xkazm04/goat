# G.O.A.T. — Greatest Of All Time

## What This Is

A ranking platform where users create and rank lists of anything. Users can create lists via AI-powered studio or browse existing lists, then rank them through an interactive drag-and-drop interface.

## Core Value

**Users can create any list they imagine and rank it their way.** The core experience must be smooth, reliable, and free of friction.

## Current Milestone: v1.6.0 Match-Test UI Polish

**Goal:** Polish the /match-test page modes (Collection, Bracket, Tier List) for a unified, space-efficient experience.

**Target features:**
- Collection items with shared rows and category dividers (space efficiency)
- Bracket mode tree height fix for larger tournaments
- Bracket matchup overlay with reduced vertical padding
- Tier List unified with Collection (same DnD experience)
- Tier List cleanup (remove Community button, Apply Ranking button)
- Tier List keyboard shortcuts implementation

## Requirements

### Validated

<!-- Shipped and proven to work. Format: ✓ [Requirement] — v[X.Y] -->

- ✓ Z-index design token scale (8 semantic levels) — v1.0
- ✓ Elevation token system (none/low/medium/high/floating) — v1.0
- ✓ Glow token system (subtle/medium/intense + medal colors) — v1.0
- ✓ Noise texture utility (3% opacity SVG overlay) — v1.0
- ✓ Elevated wrapper component with hover lift — v1.0
- ✓ Surface component (solid/glass/outline variants) — v1.0
- ✓ Glow decorator component — v1.0
- ✓ Shimmer hover-triggered effect — v1.0
- ✓ GradientBorder with medal presets — v1.0
- ✓ GoatView with high elevation — v1.0
- ✓ PodiumView with medium elevation + medal borders — v1.0
- ✓ MountRushmoreView with medium elevation + medal borders — v1.0
- ✓ Empty drop zones with inner shadow + medal hints — v1.0
- ✓ Landing hero with noise texture — v1.0
- ✓ Featured section with raised surface hierarchy — v1.0
- ✓ Studio page foundation (`/studio` route) — v1.1
- ✓ Gemini 2.0 Flash API integration for item generation — v1.1
- ✓ Topic input with AI generation flow — v1.1
- ✓ Item list editor (edit, remove, regenerate, add manual) — v1.1
- ✓ Metadata configuration (title, description, size, category) — v1.1
- ✓ Preview and publish flow — v1.1
- ✓ Multi-criteria scoring system (0-8 criteria per list, 1-10 scale) — v1.3
- ✓ Predefined criteria templates for Sports, Movies, Music, Games — v1.3
- ✓ Custom criteria support with default styling — v1.3
- ✓ Themed stat visualizations per category — v1.3
- ✓ Criteria rating UI in item detail modal — v1.3
- ✓ Score persistence (localStorage + Supabase sync) — v1.3
- ✓ Dynamic height calculation for collection panel — v1.4
- ✓ Compact mode spacing (< 300px threshold) — v1.4
- ✓ Responsive sidebar width (140px tablet, 176px desktop) — v1.4
- ✓ Solid podium blocks with 70%+ opacity — v1.4
- ✓ Tiered icon placement (-top-12/-8/-6 for 1st/2nd/3rd) — v1.4
- ✓ GOAT illustration always visible (placeholder + vibrant states) — v1.4
- ✓ Rushmore position #1 prominence (5% scale, slate glow) — v1.4
- ✓ Distinct view color personalities (gold/silver/bronze, rich gold, slate) — v1.4
- ✓ Section headers with gold/amber gradients and spring physics — v1.5
- ✓ Featured section depth treatment with FEATURED_ORBS ambient background — v1.5
- ✓ My Rankings gold/amber theme (replacing cyan) — v1.5
- ✓ Character count indicators on form fields — v1.5
- ✓ Field validation feedback with visual states — v1.5
- ✓ Form field focus animations with glow treatment — v1.5
- ✓ Generation progress feedback (contextual messages) — v1.5
- ✓ Prominent empty state for items grid — v1.5
- ✓ Preview cards with position styling (gold border, badges) — v1.5
- ✓ Preview grid with elevation/depth tokens — v1.5
- ✓ Criteria preview with scores visualized — v1.5
- ✓ Publish button with state transitions — v1.5
- ✓ Studio containers with Surface glass variant — v1.5
- ✓ Item cards with Elevated wrapper and hover lift — v1.5
- ✓ Studio gold/amber theme consistency — v1.5
- ✓ Spring physics for card animations — v1.5

### Active

<!-- v1.6.0 Match-Test UI Polish scope -->

- [ ] Collection items share rows across categories with vertical dividers
- [ ] Bracket tree height scales to fit all pairs without collision
- [ ] Bracket matchup overlay reduces vertical padding (no scroll needed)
- [ ] Tier List unranked items use Collection panel with same DnD experience
- [ ] Tier List Community button and logic removed
- [ ] Tier List Apply Ranking button removed (autosave like other modes)
- [ ] Tier List keyboard shortcuts verified/implemented

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- Mobile-specific layouts — desktop-first remains
- Public list discovery — defer to v1.6+
- User profiles — defer to v1.6+

## Context

**Existing codebase:**
- Visual depth system with tokens and reusable components (v1.0)
- List Creation Studio with Gemini AI integration (v1.1)
- Multi-criteria scoring with themed visualizations (v1.3)
- Polished Match page with distinct view mode personalities (v1.4)
- Landing and Studio with unified gold/amber visual language (v1.5)
- Drag-and-drop ranking interface with multiple views (GOAT, Podium, Rushmore)
- Supabase backend with lists, items, rankings, criteria tables
- Collection panel with dynamic height and compact mode

**Tech stack:** Next.js 15, Supabase, Zustand, TanStack Query, @dnd-kit, Framer Motion

## Constraints

- **Performance**: Shadow blur ≤20px on draggables, no infinite animations
- **Safari**: Glass blur uses fixed values (CSS variables bug)
- **Consistency**: All visual polish uses token system, no magic numbers
- **Dark theme**: Primary theme, all tokens designed for dark background
- **No new dependencies**: Use existing tools where possible
- **Backward compatibility**: Logger migration should not break existing functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Depth effects over animations | User preference + performance safety | ✓ Good — clean visual hierarchy |
| Unified elevation vocabulary | Consistency across view modes | ✓ Good — high/medium/low works everywhere |
| 20px max blur constraint | Drag performance preservation | ✓ Good — no FPS impact |
| Gemini 2.0 Flash for AI generation | Fast, capable, good structured output | ✓ Good — reliable item generation |
| Wikipedia as image source | Free, high quality, no API key needed | ✓ Good — consistent image quality |
| Logger with runtime toggles | Debug without rebuilding, silent in production | — Pending |
| Centralized constants | Eliminate magic numbers, single source of truth | — Pending |
| Error boundaries per feature | Isolate failures, preserve user session | — Pending |

---
*Last updated: 2026-02-02 after v1.6.0 Match-Test UI Polish milestone started*
