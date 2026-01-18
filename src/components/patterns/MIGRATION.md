# Pattern Library Migration Guide

This guide helps you migrate from scattered implementations to the centralized pattern library.

## Quick Start

```tsx
// Import all patterns
import {
  // Drag & Drop
  useVelocityTracking,
  useGravityWells,
  useMagneticSnap,
  MAGNETIC_PRESETS,

  // Badges
  Badge,
  PositionBadge,
  TierIndicator,
  TierBadge,
  badgeColors,

  // Virtualization
  useIntersectionObserver,
  useInView,
  useLazyLoad,
  LazyLoadTrigger,
} from '@/components/patterns';
```

## Badge Migration

### Before: Inline Badge Styling

```tsx
// Old approach - inline styles scattered across components
<span className="bg-amber-500 text-black px-2 py-1 rounded text-xs font-bold">
  #1
</span>
```

### After: PositionBadge Component

```tsx
import { PositionBadge } from '@/components/patterns/badges';

// Position is 0-indexed, displays as 1-indexed
<PositionBadge position={0} /> // Shows "#1" with gold styling
<PositionBadge position={1} /> // Shows "#2" with silver styling
<PositionBadge position={2} /> // Shows "#3" with bronze styling
```

### Before: Custom Tier Colors

```tsx
// Old approach - hardcoded tier logic
const getTierColor = (rank: number) => {
  if (rank <= 3) return 'bg-amber-500';
  if (rank <= 10) return 'bg-emerald-500';
  // ...etc
};
```

### After: TierIndicator System

```tsx
import { TierIndicator, TierBadge, getTierFromRank } from '@/components/patterns/badges';

// Positioned indicator on cards
<div className="relative">
  <TierIndicator averageRank={5} position="top-right" />
  <CardContent />
</div>

// Standalone tier badge
<TierBadge tier="elite" showLabel />

// Programmatic tier lookup
const tier = getTierFromRank(5); // Returns 'top'
```

## Drag & Drop Migration

### Before: Manual Velocity Tracking

```tsx
// Old approach - scattered velocity calculations
const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
const [velocity, setVelocity] = useState({ x: 0, y: 0 });

const handleMove = (e) => {
  const newVelocity = {
    x: e.clientX - lastPos.x,
    y: e.clientY - lastPos.y,
  };
  setVelocity(newVelocity);
  setLastPos({ x: e.clientX, y: e.clientY });
};
```

### After: useVelocityTracking Hook

```tsx
import { useVelocityTracking } from '@/components/patterns/drag-drop';

const { velocity, trackPoint, startTracking, stopTracking, getSmoothedVelocity } =
  useVelocityTracking({ smoothingFactor: 0.3 });

const handleDragStart = () => startTracking();
const handleDragEnd = () => {
  const finalVelocity = getSmoothedVelocity();
  // Use for fling/momentum animation
  stopTracking();
};
const handleDrag = (position) => trackPoint(position, Date.now());
```

### Before: Manual Gravity Well Logic

```tsx
// Old approach - hardcoded attraction zones
const podiumPositions = [
  { x: 100, y: 100, label: '1st' },
  { x: 200, y: 100, label: '2nd' },
  { x: 300, y: 100, label: '3rd' },
];

const findNearestPodium = (pos) => {
  let nearest = null;
  let minDist = Infinity;
  podiumPositions.forEach(p => {
    const dist = Math.sqrt((pos.x - p.x) ** 2 + (pos.y - p.y) ** 2);
    if (dist < minDist && dist < 50) {
      minDist = dist;
      nearest = p;
    }
  });
  return nearest;
};
```

### After: useGravityWells Hook

```tsx
import { useGravityWells } from '@/components/patterns/drag-drop';

const wells = [
  { id: '1st', position: { x: 100, y: 100 }, radius: 60, strength: 0.8, label: '1st' },
  { id: '2nd', position: { x: 200, y: 100 }, radius: 50, strength: 0.6, label: '2nd' },
  { id: '3rd', position: { x: 300, y: 100 }, radius: 40, strength: 0.4, label: '3rd' },
];

const { activeWell, pullStrength, calculatePull } = useGravityWells({
  wells,
  enabled: isDragging,
});

// In drag handler
const pull = calculatePull(currentPosition);
const adjustedPosition = {
  x: currentPosition.x + pull.x * 0.3,
  y: currentPosition.y + pull.y * 0.3,
};
```

### Before: Manual Magnetic Snap

```tsx
// Old approach - inline snap logic
const SNAP_THRESHOLD = 30;
const handleDrop = (pos, targetPos) => {
  const dist = Math.sqrt((pos.x - targetPos.x) ** 2 + (pos.y - targetPos.y) ** 2);
  if (dist < SNAP_THRESHOLD) {
    return targetPos; // Snap to target
  }
  return pos;
};
```

### After: useMagneticSnap Hook

```tsx
import { useMagneticSnap, MAGNETIC_PRESETS } from '@/components/patterns/drag-drop';

const { snappedPosition, isSnapped, snapStrength } = useMagneticSnap({
  currentPosition,
  targetPosition: nearestDropZone,
  config: MAGNETIC_PRESETS.standard, // or 'subtle', 'strong', 'podium'
  enabled: isDragging,
});

// Use snappedPosition for rendering
const displayPosition = isSnapped ? snappedPosition : currentPosition;
```

## Virtualization Migration

### Before: Manual Intersection Observer

```tsx
// Old approach - direct API usage
const ref = useRef(null);
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setIsVisible(entry.isIntersecting),
    { threshold: 0.1 }
  );
  if (ref.current) observer.observe(ref.current);
  return () => observer.disconnect();
}, []);
```

### After: useIntersectionObserver Hook

```tsx
import { useIntersectionObserver, useInView } from '@/components/patterns/virtualization';

// Full API
const { ref, isIntersecting, entry } = useIntersectionObserver({
  threshold: 0.1,
  rootMargin: '100px',
  triggerOnce: true,
  onChange: (visible, entry) => console.log('Visibility:', visible),
});

// Simple API
const { ref, inView } = useInView({ once: true });
```

### Before: Manual Infinite Scroll

```tsx
// Old approach - custom scroll detection
const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadMore();
  }
};
```

### After: LazyLoadTrigger Component

```tsx
import { LazyLoadTrigger } from '@/components/patterns/virtualization';

<div className="scroll-container">
  {items.map(item => <Item key={item.id} {...item} />)}

  <LazyLoadTrigger
    onVisible={fetchNextPage}
    enabled={hasNextPage}
    isLoading={isFetching}
    loadingMessage="Loading..."
    rootMargin="200px"
  />
</div>
```

### Before: Manual Batch Loading

```tsx
// Old approach - manual state management
const [loaded, setLoaded] = useState(10);
const loadMore = () => setLoaded(prev => Math.min(prev + 10, total));
```

### After: useLazyLoad Hook

```tsx
import { useLazyLoad } from '@/components/patterns/virtualization';

const {
  loadedCount,
  loadMore,
  isComplete,
  progress,
  reset
} = useLazyLoad({
  totalItems: items.length,
  batchSize: 20,
  initialCount: 10,
  onLoadMore: (count) => console.log(`Loaded ${count} items`),
});
```

## Storybook Documentation

All patterns are documented in Storybook. Run:

```bash
npm run storybook
```

Browse to:
- **Patterns/Badges** - Badge, PositionBadge, TierIndicator
- **Patterns/Drag & Drop** - Velocity, Gravity Wells, Magnetic Snap
- **Patterns/Virtualization** - Intersection Observer, Lazy Loading, Virtual Lists

## File Structure

```
src/components/patterns/
├── index.ts                    # Main exports
├── MIGRATION.md               # This file
├── drag-drop/
│   ├── index.ts
│   ├── types.ts
│   ├── useVelocityTracking.ts
│   ├── useGravityWells.ts
│   ├── useMagneticSnap.ts
│   └── DragDrop.stories.tsx
├── badges/
│   ├── index.ts
│   ├── types.ts
│   ├── Badge.tsx
│   ├── PositionBadge.tsx
│   ├── TierIndicator.tsx
│   ├── Badge.stories.tsx
│   ├── PositionBadge.stories.tsx
│   └── TierIndicator.stories.tsx
└── virtualization/
    ├── index.ts
    ├── types.ts
    ├── useIntersectionObserver.ts
    ├── useLazyLoad.ts
    └── Virtualization.stories.tsx
```

## Best Practices

1. **Import from barrel files**: Use `@/components/patterns` or `@/components/patterns/badges`
2. **Use presets**: For magnetic snap, use `MAGNETIC_PRESETS` instead of custom configs
3. **Leverage types**: All hooks and components are fully typed
4. **Check Storybook**: Interactive examples show all variations
5. **Gradual migration**: Migrate one component at a time, test thoroughly
