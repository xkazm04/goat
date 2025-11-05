# Feature Context: UI Animation System

## Core Functionality
Comprehensive animation and visual effects system providing consistent motion design, interactive feedback, and decorative elements across the application. Creates engaging user experiences through coordinated animations, including page transitions.

## Architecture

### Location Map

- AnimButtons.tsx
- ShowcaseDecor.tsx
- particles.tsx
- cardDecor.tsx
- components/AnimButtons.tsx
- components/ShowcaseDecor.tsx
- components/particles.tsx
- components/cardDecor.tsx
- components/page-transition.tsx

### Key Files by Layer

**Component Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `components/AnimButtons.tsx` | Animated button components | Adding button variants |
| `components/ShowcaseDecor.tsx` | Background decorations | Changing visual effects |
| `components/particles.tsx` | Particle animation system | Modifying particle behavior |
| `components/cardDecor.tsx` | Card decoration effects | Updating card styling |
| `components/page-transition.tsx` | Page route transition animations | Changing page transition effects |

**Layout Integration:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `app/layout.tsx` | Root layout with PageTransition wrapper | Modifying app-wide page transitions |

## Data Flow
Simple render-time animations using Framer Motion with consistent animation parameters across components. Page transitions automatically trigger on route changes via usePathname() hook.

## Business Rules
- Animations must be performant (no frame drops)
- Consistent timing and easing curves (0.3-0.4s with cubic-bezier easing)
- Accessible motion preferences respected
- Page transitions use pathname as key to trigger AnimatePresence

## Implementation Details

### Page Transition System
- **Component**: `src/components/page-transition.tsx`
- **Integration**: Wraps children in `src/app/layout.tsx`
- **Animation Config**:
  - Entry: 0.4s fade-in + 8px upward slide + 4px blur
  - Exit: 0.3s fade-out + 8px downward slide + 4px blur
  - Easing: [0.25, 0.1, 0.25, 1] cubic-bezier
- **Key Feature**: Uses pathname as animation key to trigger on route changes
- **Mode**: AnimatePresence mode="wait" for clean transitions

## Notes for LLM/Developer
Uses Framer Motion for animations. Consider motion-reduction preferences. Page transitions mask load times and improve perceived performance. Transition timings are optimized for smooth navigation feel without being too slow.