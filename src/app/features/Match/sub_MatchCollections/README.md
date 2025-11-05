# Simple Match Collections - Minimal DnD Implementation

## Purpose
Start from scratch with a minimal, working drag and drop implementation.
No complexity, no animations, no store integrations - just pure functionality.

## Architecture

### Components
1. **SimpleMatchGrid** - Main container with DndContext
   - Manages grid state (10 slots)
   - Handles drag events
   - Minimal sensor configuration (PointerSensor with 3px activation)

2. **SimpleDropZone** - Drop target for grid slots
   - Shows position number
   - Visual feedback on hover
   - Remove button when occupied

3. **SimpleCollectionPanel** - Collection area below grid
   - Group selector (left sidebar)
   - Items grid (right panel)
   - Select all/clear functionality

4. **SimpleCollectionItem** - Draggable item
   - Image + title
   - No animations
   - Pure CSS transitions

## Key Differences from Old Implementation

### What We REMOVED:
- ❌ Framer Motion animations
- ❌ Multiple store subscriptions
- ❌ Complex state management
- ❌ Heavy drag overlay
- ❌ Virtualization (not needed yet)
- ❌ Backend integration
- ❌ Session management

### What We KEPT:
- ✅ @dnd-kit/core (but simplified)
- ✅ Basic drag and drop
- ✅ Visual feedback
- ✅ Group filtering

## Testing

Access the test page at: `/match-test`

### Test Cases:
1. ✅ Drag item from collection to grid slot
2. ✅ Drop on occupied slot (should replace)
3. ✅ Remove item from grid
4. ✅ Filter groups
5. ✅ Drag responsiveness (should feel instant)

## Next Steps

Once this works perfectly:
1. Add real data integration
2. Add store persistence
3. Add animations (carefully)
4. Add keyboard shortcuts
5. Add mobile optimizations
6. Add virtualization (if needed)

## Performance Targets

- Drag start: < 50ms
- Frame rate: 60 FPS
- Drop accuracy: 100%
- No lag, no jank

## Notes

- Mock data uses placeholder images
- 10 grid slots for testing
- Collection panel is 256px height (h-64)
- Grid is directly above collection (no separation)
