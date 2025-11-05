# Architecture - Simple Match Collections

## Component Hierarchy

```
SimpleMatchGrid (DndContext)
│
├─ State Management
│  ├─ gridSlots: GridSlot[]
│  ├─ activeItem: CollectionItem | null
│  └─ sensors: PointerSensor
│
├─ Event Handlers
│  ├─ handleDragStart()
│  ├─ handleDragEnd()
│  └─ handleRemove()
│
├─ Grid Area (Top)
│  │
│  ├─ Top 3 Podium
│  │  ├─ SimpleDropZone (position: 1) - 2nd place
│  │  ├─ SimpleDropZone (position: 0) - 1st place
│  │  └─ SimpleDropZone (position: 2) - 3rd place
│  │
│  └─ Positions 4-10
│     ├─ SimpleDropZone (position: 3)
│     ├─ SimpleDropZone (position: 4)
│     ├─ ...
│     └─ SimpleDropZone (position: 9)
│
├─ Collection Area (Bottom)
│  │
│  └─ SimpleCollectionPanel
│     │
│     ├─ Header
│     │  ├─ Title + Item Count
│     │  └─ Select All / Clear buttons
│     │
│     ├─ Group Selector (Left Sidebar)
│     │  ├─ Group Button (Action Movies)
│     │  ├─ Group Button (Sci-Fi Movies)
│     │  └─ Group Button (Drama Movies)
│     │
│     └─ Items Grid (Right Panel)
│        │
│        └─ For each selected group:
│           ├─ Group Name
│           └─ Items Grid
│              ├─ SimpleCollectionItem
│              ├─ SimpleCollectionItem
│              └─ ...
│
└─ DragOverlay
   └─ Minimal Preview (image only)
```

## Data Flow

### Drag Start
```
User clicks item
    ↓
SimpleCollectionItem triggers useDraggable
    ↓
handleDragStart() called
    ↓
setActiveItem(item)
    ↓
DragOverlay shows item preview
```

### Drag Move
```
User moves cursor
    ↓
@dnd-kit tracks position
    ↓
SimpleDropZone detects hover
    ↓
isOver = true
    ↓
Visual feedback (border highlight)
```

### Drag End
```
User releases mouse
    ↓
handleDragEnd() called
    ↓
Check if over valid drop zone
    ↓
If YES:
  ├─ Get position from over.data.current
  ├─ Get item from active.data.current
  └─ Update gridSlots state
    ↓
If NO:
  └─ Do nothing (item stays in collection)
    ↓
setActiveItem(null)
    ↓
DragOverlay hides
```

## State Structure

### GridSlot
```typescript
interface GridSlot {
  position: number;  // 0-9
  item: CollectionItem | null;
}
```

### CollectionItem
```typescript
interface CollectionItem {
  id: string;        // Unique identifier
  title: string;     // Display name
  image_url?: string | null;
  description?: string;
}
```

### CollectionGroup
```typescript
interface CollectionGroup {
  id: string;        // Unique identifier
  name: string;      // Display name
  items: CollectionItem[];
}
```

## DnD Configuration

### Draggable (SimpleCollectionItem)
```typescript
useDraggable({
  id: item.id,
  data: {
    type: 'collection-item',  // Identifier
    item,                      // Full item data
    groupId                    // Source group
  }
})
```

### Droppable (SimpleDropZone)
```typescript
useDroppable({
  id: `drop-${position}`,
  data: {
    type: 'grid-slot',  // Identifier
    position            // Target position
  }
})
```

### Sensor Configuration
```typescript
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 3  // 3px movement to start drag
  }
})
```

## CSS Strategy

### No Framer Motion
- Use CSS transitions for hover effects
- Use CSS transforms for drag feedback
- Keep animations minimal and performant

### Tailwind Classes
```css
/* Draggable Item */
cursor-grab              /* Normal state */
active:cursor-grabbing   /* During drag */
opacity-50               /* When dragging */
hover:border-cyan-500    /* Hover feedback */

/* Drop Zone */
border-dashed            /* Visual indicator */
border-cyan-400          /* Hover state */
bg-cyan-500/20           /* Hover background */
scale-105                /* Hover scale */
```

## Performance Optimizations

### 1. Minimal Re-renders
- Local state only (no store subscriptions)
- No derived state calculations
- No complex memoization needed

### 2. Lightweight Components
- No nested motion components
- Simple DOM structure
- Minimal CSS

### 3. Efficient Updates
- Direct state updates (no middleware)
- No debouncing needed
- No throttling needed

### 4. Fast Sensors
- 3px activation (instant feel)
- No touch delay
- No complex gesture detection

## Extension Points

### Future Enhancements (Phase 2+)

1. **Store Integration**
   ```typescript
   // Replace local state with store
   const [gridSlots, setGridSlots] = useItemStore(s => [
     s.gridSlots,
     s.setGridSlots
   ]);
   ```

2. **Persistence**
   ```typescript
   // Save to backend after drop
   useEffect(() => {
     if (gridSlots) {
       saveToBackend(gridSlots);
     }
   }, [gridSlots]);
   ```

3. **Animations**
   ```typescript
   // Add subtle CSS animations
   <div className="transition-all duration-200">
   ```

4. **Keyboard Support**
   ```typescript
   // Add keyboard sensor
   useSensor(KeyboardSensor, {
     coordinateGetter: sortableKeyboardCoordinates
   });
   ```

5. **Virtualization**
   ```typescript
   // For large lists (100+ items)
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

## Testing Strategy

### Unit Tests
- Test drag start/end handlers
- Test state updates
- Test group filtering

### Integration Tests
- Test full drag and drop flow
- Test multiple drags
- Test edge cases

### Performance Tests
- Measure drag start latency
- Monitor frame rate
- Check memory usage

## Migration Plan

### Phase 1: Verify (Current)
- Test simple implementation
- Verify performance
- Confirm usability

### Phase 2: Integrate
- Replace old Collection in MatchContainer
- Connect to real data
- Add persistence

### Phase 3: Enhance
- Add animations (carefully)
- Add keyboard shortcuts
- Add mobile optimizations

### Phase 4: Cleanup
- Remove old Collection folder
- Simplify stores
- Update documentation

## Key Principles

1. **Simplicity First**: Start simple, add complexity only when needed
2. **Performance**: 60 FPS is non-negotiable
3. **Maintainability**: Code should be easy to understand
4. **Testability**: Each component should be testable in isolation
5. **Incremental**: Add features one at a time

## Success Metrics

- ✅ Drag start: < 50ms
- ✅ Frame rate: 60 FPS
- ✅ Drop accuracy: 100%
- ✅ Code lines: < 500
- ✅ Dependencies: Minimal
- ✅ Complexity: Low
