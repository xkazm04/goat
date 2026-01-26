# G.O.A.T. UI Visual Elevation

## What This Is

A focused UI/visual polish initiative for the G.O.A.T. ranking app. The match grid sets a quality bar that other parts of the app don't meet. This project elevates the landing page and view modes (Podium, Bracket, Rushmore) to match that standard with a unified, dynamic visual language.

## Core Value

**Every screen feels like it belongs to the same polished, energetic ranking experience.** Visual consistency and depth create a cohesive product where no section feels generic or disconnected.

## Requirements

### Validated

<!-- Existing capabilities that work and are relied upon. -->

- ✓ Match grid with drag-and-drop ranking — existing
- ✓ Multiple view modes (Podium, Bracket, Rushmore, GOAT) — existing
- ✓ Landing page with featured lists and categories — existing
- ✓ Collection sidebar with backlog items — existing
- ✓ Result image generation and sharing — existing
- ✓ Dark theme with Tailwind + Radix UI — existing
- ✓ Framer Motion animation infrastructure — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] **LAND-01**: Landing page sections share consistent visual language (spacing, cards, typography)
- [ ] **LAND-02**: Landing page has creative, non-generic section designs with depth effects
- [ ] **LAND-03**: Featured lists section feels premium with layered shadows and z-depth
- [ ] **VIEW-01**: All view modes (Podium, Bracket, Rushmore, GOAT) share unified visual baseline
- [ ] **VIEW-02**: Podium view elevated to match grid quality level
- [ ] **VIEW-03**: Bracket view elevated to match grid quality level
- [ ] **VIEW-04**: Rushmore view elevated to match grid quality level
- [ ] **VIEW-05**: GOAT view elevated to match grid quality level
- [ ] **DEPTH-01**: Consistent shadow system applied across all elevated components
- [ ] **DEPTH-02**: Layered depth effects (z-depth on cards, subtle parallax where appropriate)
- [ ] **DECOR-01**: Static decorative elements add visual interest without animation overhead
- [ ] **DECOR-02**: Gradient meshes, noise textures, or glow accents used tastefully

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Infinite/continuous animations — performance impact, user preference for depth over motion
- New features or functionality — this is visual polish, not feature work
- Backend changes — purely frontend visual improvements
- Mobile-specific optimizations — desktop-first for this phase
- Comprehensive app-wide audit — focusing on key pain points first

## Context

**Existing quality baseline:** The match grid drag-and-drop interface represents the current quality ceiling. Other components should aspire to this level.

**Visual direction:** Dynamic and energetic, game-like feel. Users are ranking their favorites — there's inherent competition and drama to lean into.

**Technical foundation:**
- Tailwind CSS for utility-first styling
- Radix UI for accessible primitives
- Framer Motion available for transitions (used sparingly)
- Feature-based architecture at `src/app/features/`

**Key files to elevate:**
- `src/app/features/Landing/` — landing page components
- `src/app/features/Match/sub_MatchGrid/components/PodiumView.tsx`
- `src/app/features/Match/sub_MatchGrid/components/MountRushmoreView.tsx`
- `src/app/features/Match/sub_MatchGrid/components/GoatView.tsx`
- View switcher and related components

## Constraints

- **Performance**: No infinite animations, heavy particle effects, or constantly repainting elements
- **Consistency**: Changes must work within existing Tailwind/Radix design system
- **Maintainability**: Decorative elements should be reusable components, not one-off implementations
- **Dark theme**: All improvements must work in dark mode (primary theme)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus depth effects over animations | User preference + performance safety | — Pending |
| Unified visual language across view modes | Consistency > distinct themes | — Pending |
| Key pain points first, expand later | Validate approach before broad rollout | — Pending |

---
*Last updated: 2026-01-26 after initialization*
