# G.O.A.T. — Greatest Of All Time

## What This Is

A ranking platform where users create and rank lists of anything. Users can create lists via AI-powered studio or browse existing lists, then rank them through an interactive drag-and-drop interface.

## Core Value

**Users can create any list they imagine and rank it their way.** The core experience must be smooth, reliable, and free of friction.

## Current Milestone: v1.2.0 Studio Enhancement

**Goal:** Elevate the List Creation Studio to match-test visual quality and add criteria scoring system for multi-dimensional item ratings.

**Target features:**
- Studio UI polish (depth system, visual styling to match /match-test quality)
- Criteria system: list creators can add 0-8 scoring criteria
- Predefined criteria sets per category (Games, Movies, Music, Sports)
- Unique themed stat visualizations for predefined criteria
- Default stat styling for custom user-defined criteria
- Criteria rating in item detail modal (post-placement)

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

### Active

<!-- Next milestone scope. -->

- Studio UI visual polish using depth token system
- Remove dead space and improve layout efficiency
- Criteria configuration in list creation flow
- Predefined criteria sets for Games, Movies, Music, Sports
- Themed stat visualizations for predefined criteria
- Default stat component for custom criteria
- Criteria rating UI in item detail modal

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- Production polish (logging, error handling) — defer to v1.3
- Public list discovery — defer to v1.3+
- User profiles — defer to v1.3+
- Mobile-specific work — desktop-first remains
- Criteria weighting/aggregation — simple ratings only for v1.2

## Context

**Existing codebase:**
- Visual depth system with tokens and reusable components (v1.0)
- List Creation Studio with Gemini AI integration (v1.1)
- Drag-and-drop ranking interface with multiple views (GOAT, Podium, Rushmore)
- Supabase backend with lists, items, rankings tables
- Item detail modal exists (comparison view) — target for criteria rating UI
- Match views (/match-test) represent visual quality target for studio

**Tech stack:** Next.js 15, Supabase, Zustand, TanStack Query, @dnd-kit, Framer Motion

## Constraints

- **Performance**: Shadow blur ≤20px on draggables, no infinite animations
- **Safari**: Glass blur uses fixed values (CSS variables bug)
- **Consistency**: All visual polish uses token system, no magic numbers
- **Dark theme**: Primary theme, all tokens designed for dark background
- **No new dependencies**: Use existing tools where possible

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Depth effects over animations | User preference + performance safety | ✓ Good — clean visual hierarchy |
| Unified elevation vocabulary | Consistency across view modes | ✓ Good — high/medium/low works everywhere |
| 20px max blur constraint | Drag performance preservation | ✓ Good — no FPS impact |
| Gemini 2.0 Flash for AI generation | Fast, capable, good structured output | ✓ Good — reliable item generation |
| Wikipedia as image source | Free, high quality, no API key needed | ✓ Good — consistent image quality |
| Criteria in item detail modal | Natural location, doesn't clutter grid | — Pending |
| Predefined + custom criteria | Balance curation with flexibility | — Pending |
| Themed stat visualizations | Visual character matches metadata meaning | — Pending |

---
*Last updated: 2026-01-29 after v1.2.0 Studio Enhancement milestone start*
