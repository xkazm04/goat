# Animation Utilities Documentation

## Overview

The `animations.ts` file provides centralized animation class strings for consistent animation behavior across UI components. This reduces duplication and makes it easier to maintain global animation settings.

## Usage

### Importing

```typescript
import { animationPresets, dataStateAnimations, transitions, durations } from '@/lib/utils/animations';
```

### In UI Components

Instead of writing long animation class strings directly:

```typescript
// ❌ Before (duplicated across files)
className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
```

Use the centralized presets:

```typescript
// ✅ After (centralized, consistent)
import { animationPresets } from '@/lib/utils/animations';

className={cn(
  "base-classes",
  animationPresets.dropdownContent,
  className
)}
```

## Available Utilities

### Animation Presets

Common animation combinations ready to use:

- `animationPresets.dialogOverlay` - Dialog/Modal overlay fade animation
- `animationPresets.dialogContent` - Dialog/Modal content animation (fade + zoom + slide from center)
- `animationPresets.dropdownContent` - Dropdown/Popover animation (fade + zoom + directional slide)
- `animationPresets.hoverTransition` - Hover transition for interactive elements
- `animationPresets.focusTransition` - Focus ring transition
- `animationPresets.surfaceTransition` - Smooth background/border transitions

### Data State Animations

For Radix UI components with `data-[state=...]` attributes:

- `dataStateAnimations.fade` - Basic fade in/out
- `dataStateAnimations.fadeZoom` - Fade + zoom in/out
- `dataStateAnimations.fadeZoomSlide` - Fade + zoom + directional slide
- `dataStateAnimations.fadeZoomSlideCenter` - Fade + zoom + slide from center

### Accordion Animations

- `accordionAnimations.down` - Slide down animation
- `accordionAnimations.up` - Slide up animation

### Transitions

- `transitions.all` - Transition all properties
- `transitions.colors` - Transition colors only (more performant)
- `transitions.opacity` - Transition opacity only
- `transitions.transform` - Transition transform only

### Durations

- `durations.fast` - 150ms transitions
- `durations.default` - 200ms transitions
- `durations.medium` - 300ms transitions
- `durations.slow` - 500ms transitions

## Helper Functions

### combineAnimations

Combines multiple animation class strings:

```typescript
import { combineAnimations, transitions, durations } from '@/lib/utils/animations';

const animationClasses = combineAnimations(
  transitions.colors,
  durations.medium,
  'hover:scale-105'
);
```

## Type Safety

All utilities are fully typed with TypeScript:

```typescript
import type { AnimationPreset, Transition, Duration } from '@/lib/utils/animations';

// Type-safe animation selection
const preset: AnimationPreset = 'dropdownContent';
const transition: Transition = 'colors';
const duration: Duration = 'medium';
```

## Benefits

1. **Reduced Duplication** - Animation strings defined once, used everywhere
2. **Consistent Behavior** - All components use the same animation timing and effects
3. **Easy Maintenance** - Change animations globally by updating one file
4. **Type Safety** - TypeScript ensures valid animation references
5. **Reduced Errors** - No typos in long class strings
6. **Better Developer Experience** - Clear, semantic names instead of complex strings

## Components Updated

The following UI components have been updated to use centralized animations:

- `components/ui/dialog.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/popover.tsx`
- `components/ui/alert-dialog.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/hover-card.tsx`
- `components/ui/context-menu.tsx`
- `components/ui/menubar.tsx`

## Future Enhancements

Consider adding:

- Animation variants for different screen sizes
- Custom easing functions
- Motion-reduce preferences support
- Additional preset combinations for specific use cases
