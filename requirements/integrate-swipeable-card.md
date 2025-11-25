# Integrate SwipeableCard for Mobile Match Experience

## Component Overview
**File:** `src/app/features/matching/components/SwipeableCard.tsx`
**Exports:** SwipeableCard
**Purpose:** Mobile-first swipeable card component with themeable particle effects, sound, and haptic feedback for a Tinder-like matching experience

## Why Integrate

### Component Features
The SwipeableCard is a sophisticated mobile component that provides:
- Touch-based swipe gestures with spring physics (Framer Motion)
- Customizable particle burst effects on swipe
- Multiple particle shapes: circle, square, triangle, star, heart, sparkle
- Sound effects on left/right swipe
- Haptic feedback (vibration on mobile)
- Visual swipe indicators (LIKE/NOPE badges)
- Full theme integration via particle-theme-store

### Mobile UX Enhancement
Currently the Match feature uses drag-and-drop which is optimized for desktop:
- Mouse-based dragging with precise positioning
- Multiple items visible for comparison
- Grid-based layout

For mobile users, a swipe-based interface would be more natural:
- One-handed thumb swipes
- Full-screen card focus
- Quick yes/no decisions

## Integration Plan

### 1. Pre-Integration Updates
- [x] Component is feature-complete with particle effects
- [x] Has data-testid attributes on key elements
- [x] Integrates with particle-theme-store
- [ ] Verify `useSwipeGesture` hook exists in hooks/index.ts
- [ ] Verify particle-theme-store has `getActiveTheme` method
- [ ] Check if SwipeEvent and SwipeDirection types are exported

### 2. Integration Approach

**Option A: Mobile-Specific Match Mode (Recommended)**

Create a separate mobile match experience that uses SwipeableCard:

```
src/app/features/Match/mobile/
  ├── MobileMatchPage.tsx
  ├── SwipeStack.tsx
  └── SwipeCard.tsx (uses SwipeableCard)
```

Detect mobile/tablet and route to appropriate experience:
```tsx
// In match page
const isMobile = useMediaQuery('(max-width: 768px)');

if (isMobile) {
  return <MobileMatchPage />;
}
return <DesktopMatchGrid />;
```

**Option B: Hybrid Mode**

Add swipe support alongside existing grid:
- Swipe from backlog to make a decision
- Right swipe = add to next available position
- Left swipe = skip for now

### 3. Implementation for Option A

**File:** `src/app/features/Match/mobile/SwipeStack.tsx`

```tsx
import { SwipeableCard } from '@/app/features/matching/components/SwipeableCard';
import { useSessionStore } from '@/stores/session-store';
import { useGridStore } from '@/stores/grid-store';

function SwipeStack() {
  const backlogItems = useSessionStore(state => state.getAvailableBacklogItems());
  const { assignItemToGrid, getNextAvailableGridPosition } = useGridStore();

  const handleSwipeRight = (item: BacklogItem) => {
    const nextPosition = getNextAvailableGridPosition();
    if (nextPosition !== null) {
      assignItemToGrid(item, nextPosition);
    }
  };

  const handleSwipeLeft = (item: BacklogItem) => {
    // Skip this item, maybe add to "skipped" list
    markItemAsSkipped(item.id);
  };

  return (
    <div className="relative h-screen">
      {backlogItems.slice(0, 3).map((item, index) => (
        <SwipeableCard
          key={item.id}
          id={item.id}
          onSwipeRight={() => handleSwipeRight(item)}
          onSwipeLeft={() => handleSwipeLeft(item)}
          style={{
            position: 'absolute',
            zIndex: 3 - index,
            transform: `scale(${1 - index * 0.05})`,
          }}
        >
          <ItemCard item={item} />
        </SwipeableCard>
      ))}
    </div>
  );
}
```

### 4. Dependencies to Verify

**Required hooks:**
- `useSwipeGesture` - Must be exported from `src/hooks/index.ts`

**Required types:**
- `SwipeEvent` - Swipe event data
- `SwipeDirection` - 'left' | 'right' | 'up' | 'down'

**Required store methods:**
- `getActiveTheme()` - Returns current theme config
- `soundEnabled` / `hapticEnabled` - User preferences

### 5. Testing Requirements
- [ ] Swipe right triggers onSwipeRight callback
- [ ] Swipe left triggers onSwipeLeft callback
- [ ] Particle effects render on swipe
- [ ] Sound plays if enabled
- [ ] Haptic triggers on mobile if enabled
- [ ] Card animates off screen after swipe
- [ ] Next card appears after swipe
- [ ] Theme colors apply correctly

### 6. Cleanup Tasks
- [ ] May need to refactor existing match flow for mobile detection
- [ ] Consider consolidating matching/ and Match/ directories

## Architecture Considerations

### Mobile Detection Strategy
```tsx
// Option 1: CSS media query hook
const isMobile = useMediaQuery('(max-width: 768px) or (pointer: coarse)');

// Option 2: Feature detection
const isTouchDevice = 'ontouchstart' in window;

// Option 3: User preference
const { preferSwipeMode } = useUserPreferences();
```

### State Synchronization
Both mobile and desktop experiences should use the same stores:
- `session-store` for backlog items
- `grid-store` for ranked items
- `match-store` for session state

This ensures progress is synced if user switches devices.

## Success Criteria
- Mobile users can swipe through backlog items
- Swipe right adds item to next grid position
- Swipe left skips the item
- Particle effects and sounds enhance the experience
- Theme customization applies to swipe effects
- Progress syncs with desktop experience

## Estimated Impact
- **Code Quality:** Medium - Adds mobile-specific code path
- **User Experience:** Very High - Native mobile experience
- **Maintainability:** Medium - Two code paths to maintain
- **Performance:** Good - Optimized for mobile touch

## Priority Assessment
**Priority: MEDIUM**

**Reasoning:**
- High value for mobile users
- Significant development effort for full mobile experience
- Core desktop experience should work first
- Consider as Phase 2 enhancement

## Dependencies
- ParticleThemeSettings (for theme customization)
- particle-theme-store (working and tested)
- useSwipeGesture hook (must exist and be exported)
