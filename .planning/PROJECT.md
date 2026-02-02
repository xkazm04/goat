# G.O.A.T. — Greatest Of All Time

## What This Is

A ranking platform where users create and rank lists of anything. Users can create lists via AI-powered studio or browse existing lists, then rank them through an interactive drag-and-drop interface.

## Core Value

**Users can create any list they imagine and rank it their way.** The core experience must be smooth, reliable, and free of friction.

## Current Milestone: v1.4.0 Match UI Polish

**Goal:** Refine the Match page experience with better space efficiency and clearer visual hierarchy across view modes — preparing the core ranking experience for launch.

**Target outcomes:**
- Collection panel uses space efficiently without crowding the grid
- Podium, GOAT, and Rushmore views feel visually distinct and purposeful
- Reduced visual clutter (fewer competing borders, shadows, overlays)
- Improved spacing and breathing room throughout
- Subtle polish that elevates without overwhelming

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

### Active

<!-- Next milestone scope. -->

- Collection panel space efficiency (collapsible, better height management)
- View mode visual hierarchy (distinct Podium/GOAT/Rushmore styling)
- Visual clutter reduction (consolidated shadows, borders, overlays)
- Improved spacing and breathing room throughout Match page
- Subtle polish and refinement (transitions, feedback states)

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- Landing page polish — strict Match focus for v1.4
- Studio page polish — strict Match focus for v1.4
- New animations or effects — refined minimal, not adding complexity
- Mobile-specific layouts — desktop-first remains
- New view modes — polish existing views only
- Public list discovery — defer to v1.5+
- User profiles — defer to v1.5+

## Context

**Existing codebase:**
- Visual depth system with tokens and reusable components (v1.0)
- List Creation Studio with Gemini AI integration (v1.1)
- Multi-criteria scoring with themed visualizations (v1.3)
- Drag-and-drop ranking interface with multiple views (GOAT, Podium, Rushmore)
- Supabase backend with lists, items, rankings, criteria tables
- Collection panel at 400px default height with glass-dock styling
- Multiple animation layers on drop zones (10+ overlays)
- View modes share similar elevation/styling (lack distinction)

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
*Last updated: 2026-02-02 after v1.4.0 Match UI Polish milestone start*
