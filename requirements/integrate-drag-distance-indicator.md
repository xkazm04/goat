# Integrate DragDistanceIndicator into SimpleMatchGrid

## Component Overview
**File:** `src/app/features/Match/components/DragDistanceIndicator.tsx`

**Exports:** `DragDistanceIndicator`

**Purpose:** Real-time visual feedback during drag operations showing:
- Distance traveled (in pixels)
- Target position being hovered over
- Warning when drag exceeds 500px (prevents accidental long drags)
- Sparkle trail following cursor

## Why Integrate

### Current Drag Experience Gap

The Match feature uses @dnd-kit for drag-and-drop but provides **minimal visual feedback**:
- Users don't know how far they've dragged
- No indication of target position until drop
- Accidental long drags can be frustrating
- No warning before making mistakes

### Infrastructure Already Exists

The codebase has **all the pieces** but they're not connected:

1. **Cursor tracking** (`SimpleMatchGrid.tsx:49-52`):
   ```typescript
   const cursorX = useMotionValue(0);
   const cursorY = useMotionValue(0);
   const glowX = useSpring(cursorX, { damping: 20, stiffness: 200 });
   const glowY = useSpring(cursorY, { damping: 20, stiffness: 200 });
   ```

2. **Cursor position updates** (`SimpleMatchGrid.tsx:58-68`):
   ```typescript
   useEffect(() => {
     if (!activeItem) return;
     const handleMouseMove = (e: MouseEvent) => {
       cursorX.set(e.clientX);
       cursorY.set(e.clientY);
     };
     window.addEventListener('mousemove', handleMouseMove);
     return () => window.removeEventListener('mousemove', handleMouseMove);
   }, [activeItem, cursorX, cursorY]);
   ```

3. **Distance tracking callback** (`dragHandlers.ts:21-46`):
   ```typescript
   createDragMoveHandler(
     onDistanceChange?: (distance: number, delta: { x: number; y: number }) => void
   )
   ```

**The callback exists but is never used!** This is a perfect integration opportunity.

### User Benefits
- ✅ See drag distance in real-time
- ✅ Know which position will receive the drop
- ✅ Get warned before accidental long drags
- ✅ Visual sparkle trail makes dragging more engaging
- ✅ Prevents user errors (metric-trackable improvement)

## Integration Plan

### 1. Pre-Integration Updates

- [x] Component is ready to use as-is
- [x] No dependencies to install (uses existing Framer Motion)
- [x] No breaking changes needed
- [x] Has data-testid attributes for testing

### 2. Integration Points

#### Primary Usage: SimpleMatchGrid.tsx

**File:** `src/app/features/Match/sub_MatchGrid/SimpleMatchGrid.tsx`

**Location:** Throughout the component

**Changes needed:**

**Step 1: Add state for distance and target position**

After the existing state declarations (around line 46):

```typescript
const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

// ADD THESE:
const [dragDistance, setDragDistance] = useState(0);
const [targetPosition, setTargetPosition] = useState<number | null>(null);
const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
```

**Step 2: Update mouse tracking to include cursor position**

Modify the existing useEffect (lines 58-68):

```typescript
// Track mouse position during drag
useEffect(() => {
  if (!activeItem) {
    setCursorPosition(null); // RESET when not dragging
    return;
  }

  const handleMouseMove = (e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    setCursorPosition({ x: e.clientX, y: e.clientY }); // ADD THIS
  };

  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, [activeItem, cursorX, cursorY]);
```

**Step 3: Track drag distance with callback**

Import the distance indicator:

```typescript
import { DragDistanceIndicator } from '../components/DragDistanceIndicator';
```

Create a distance change handler:

```typescript
const handleDistanceChange = useCallback((distance: number) => {
  setDragDistance(distance);
}, []);
```

**Step 4: Track target position during drag**

Add a `DragMove` handler to DndContext:

```typescript
const handleDragMove = useCallback((event: any) => {
  const { over } = event;

  if (over && over.data.current?.type === 'grid-slot') {
    setTargetPosition(over.data.current.position);
  } else {
    setTargetPosition(null);
  }
}, []);
```

**Step 5: Reset state on drag end**

Update the existing `handleDragEnd` (around line 98):

```typescript
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;

  setActiveItem(null);
  setActiveType(null);
  setDragDistance(0); // ADD THIS
  setTargetPosition(null); // ADD THIS
  setCursorPosition(null); // ADD THIS

  // ... rest of existing logic ...
}, [assignItemToGrid, markItemAsUsed, moveGridItem]);
```

**Step 6: Update DndContext to include onDragMove**

In the DndContext component (around line 151):

```typescript
<DndContext
  sensors={sensors}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove} // ADD THIS
  onDragEnd={handleDragEnd}
>
  {/* ... existing content ... */}
</DndContext>
```

**Step 7: Render the indicator**

At the top level of the return, before or after other overlays:

```typescript
return (
  <>
    {/* Tutorial Modal */}
    <MatchGridTutorial ... />

    {/* Drag Distance Indicator - ADD THIS */}
    <DragDistanceIndicator
      distance={dragDistance}
      isActive={activeItem !== null}
      targetPosition={targetPosition}
      cursorPosition={cursorPosition}
    />

    {/* DndContext */}
    <DndContext ...>
      {/* ... existing content ... */}
    </DndContext>
  </>
);
```

#### Optional Enhancement: Use dragHandlers Distance Tracking

**File:** `src/app/features/Match/MatchGrid/lib/dragHandlers.ts`

The `createDragMoveHandler` already calculates distance but the callback is optional. If SimpleMatchGrid starts using this handler:

```typescript
// In SimpleMatchGrid.tsx
const dragMoveHandler = createDragMoveHandler((distance, delta) => {
  setDragDistance(distance);
});

// In DndContext
<DndContext
  onDragMove={dragMoveHandler}
  // ...
>
```

**Note:** This is optional - manual distance calculation works fine too.

### 3. Testing Requirements

- [ ] Unit test: Indicator appears when drag starts
- [ ] Unit test: Indicator hides when drag ends
- [ ] Unit test: Distance updates during drag
- [ ] Unit test: Target position updates when hovering grid slots
- [ ] Unit test: Warning shows when distance > 500px
- [ ] Integration test: Sparkles render during active drag
- [ ] Integration test: Sparkles disappear after drag ends
- [ ] Manual test: Drag from backlog to grid - verify distance shown
- [ ] Manual test: Drag between grid positions - verify target shown
- [ ] Manual test: Long drag (>500px) - verify warning appears
- [ ] Performance test: Verify 60fps sparkle generation doesn't cause lag

### 4. Cleanup Tasks

- [ ] Consider removing standalone CursorGlow if DragDistanceIndicator provides better feedback
- [ ] Update any drag-related documentation
- [ ] Add component to design system documentation

### 5. Optional Enhancements

#### 5.1 Distance Threshold Customization
Allow different warning thresholds based on screen size:

```typescript
const warningThreshold = window.innerHeight > 1080 ? 700 : 500;
```

#### 5.2 Haptic Feedback
Add vibration when crossing distance threshold (mobile):

```typescript
if (distance > 500 && navigator.vibrate) {
  navigator.vibrate(50);
}
```

#### 5.3 Sound Effects
Optional "whoosh" sound for long drags (behind preference flag).

## Success Criteria

- ✅ Indicator appears immediately when drag starts
- ✅ Distance counter updates smoothly during drag
- ✅ Target position shows when hovering grid slot
- ✅ Warning appears at 500px threshold
- ✅ Sparkle trail follows cursor
- ✅ Indicator disappears when drag ends
- ✅ No performance degradation (maintain 60fps)
- ✅ No regressions in existing drag functionality
- ✅ Tests passing

## Estimated Impact

- **Code Quality:** High - Uses existing infrastructure, minimal new code
- **User Experience:** High - Significant improvement in drag feedback
- **Maintainability:** High - Well-encapsulated component
- **Performance:** Neutral - Sparkles optimized with cleanup, 60fps maintained

## Implementation Time

**Estimated:** 1-2 hours

**Breakdown:**
- Add state variables: 10 minutes
- Wire up cursor tracking: 15 minutes
- Add drag move handler: 20 minutes
- Integrate component: 15 minutes
- Test and debug: 30 minutes
- Performance optimization: 30 minutes

## Priority Justification

**Priority: 🔴 HIGH (Quick Win)**

This is a **low-effort, high-impact** integration. The infrastructure (cursor tracking, motion values) already exists in SimpleMatchGrid. We're simply:
1. Adding 3 state variables
2. Passing existing cursor data to the indicator
3. Rendering the component

The visual feedback dramatically improves UX by:
- Preventing accidental long drags (reduces user frustration)
- Showing target position (reduces drop errors)
- Making drag operations feel more polished

This is the definition of a "quick win" - minimal code changes, maximum UX improvement.

## References

- SimpleMatchGrid: `src/app/features/Match/sub_MatchGrid/SimpleMatchGrid.tsx`
- Drag handlers: `src/app/features/Match/MatchGrid/lib/dragHandlers.ts`
- Component: `src/app/features/Match/components/DragDistanceIndicator.tsx`
- Existing cursor tracking: SimpleMatchGrid.tsx lines 49-68
