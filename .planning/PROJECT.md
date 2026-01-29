# G.O.A.T. — Greatest Of All Time

## What This Is

A ranking platform where users create and rank lists of anything. Users can create lists via AI-powered studio or browse existing lists, then rank them through an interactive drag-and-drop interface.

## Core Value

**Users can create any list they imagine and rank it their way.** The core experience must be smooth, reliable, and free of friction.

## Current Milestone: v1.3.0 Criteria System

**Goal:** List creators can add multi-dimensional scoring criteria with themed visualizations that match each category's character.

**Target outcomes:**
- Lists support 0-8 custom criteria with 1-10 scale scoring
- Predefined criteria templates for Sports, Movies, Music, Games categories
- Themed stat visualizations unique to each category (competitive metrics, cinematic displays, waveforms, gaming UI)
- Default styling for custom criteria
- Criteria rating in item detail modal (post-placement)
- Score persistence with Supabase sync

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

- Multi-criteria scoring system (0-8 criteria per list, 1-10 scale)
- Predefined criteria templates for Sports, Movies, Music, Games
- Custom criteria support with default styling
- Themed stat visualizations per category
- Criteria rating UI in item detail modal
- Score persistence (localStorage + Supabase sync)
- Radar chart summary for multi-criteria overview

### Out of Scope

<!-- Explicit boundaries with reasoning. -->

- Complex weighting UI — use simple presets for v1.3
- Real-time community scores — local scores only
- Score-based automatic reordering — suggestions only, not auto-apply
- Score import from external sources — defer to v1.4+
- Public list discovery — defer to v1.4+
- User profiles — defer to v1.4+
- Mobile-specific work — desktop-first remains

## Context

**Existing codebase:**
- Visual depth system with tokens and reusable components (v1.0)
- List Creation Studio with Gemini AI integration (v1.1)
- Drag-and-drop ranking interface with multiple views (GOAT, Podium, Rushmore)
- Supabase backend with lists, items, rankings tables
- Logger infrastructure exists in src/lib/logger/ but underutilized
- 50+ console.log statements scattered across features
- 30+ deprecated exports in types/ causing confusion
- Error boundaries exist but need enhancement

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
*Last updated: 2026-01-29 after v1.3.0 Criteria System milestone start*
