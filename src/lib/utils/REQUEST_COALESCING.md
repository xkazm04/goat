# Request Coalescing System

## Overview

The Request Coalescing system de-duplicates and batches simultaneous API requests to improve performance and reduce network traffic. This is especially critical for drag-and-drop operations where multiple UI interactions can trigger identical API calls.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                            │
│  (SimpleCollectionPanel, MatchGrid, CategoryBar, etc.)     │
└───────────────────┬─────────────────────────────────────────┘
                    │ Multiple simultaneous calls
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              BacklogStore (actions-data.ts)                 │
└───────────────────┬─────────────────────────────────────────┘
                    │ Wrapped API calls
                    ▼
┌─────────────────────────────────────────────────────────────┐
│          Coalesced Item Groups API Wrapper                  │
│              (coalesced-item-groups.ts)                     │
└───────────────────┬─────────────────────────────────────────┘
                    │ De-duplicated via RequestCoalescer
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              RequestCoalescer Utility                       │
│               (request-coalescer.ts)                        │
│  • De-duplicates identical requests                         │
│  • Batches within debounce window (50ms)                    │
│  • Caches results (5s TTL)                                  │
│  • Broadcasts response to all subscribers                   │
└───────────────────┬─────────────────────────────────────────┘
                    │ Single network call
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Original Item Groups API                       │
│               (item-groups.ts)                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (/api/top/groups)                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. RequestCoalescer (`request-coalescer.ts`)

The core utility that handles de-duplication and batching.

**Features:**
- **De-duplication**: Multiple identical requests get coalesced into one
- **Debounce window**: Configurable delay (default 50ms) to batch requests
- **Short-term caching**: Caches results for 5 seconds to prevent redundant fetches
- **Subscriber pattern**: Multiple callers subscribe to the same request
- **Performance tracking**: Built-in statistics and efficiency metrics

**Configuration:**
```typescript
{
  debounceMs: 50,      // Wait 50ms to batch requests
  enableLogging: true, // Log coalescing activity
  cacheTTL: 5000,      // Cache results for 5 seconds
  logPrefix: 'RequestCoalescer'
}
```

### 2. Coalesced API Wrapper (`coalesced-item-groups.ts`)

Wraps the original `item-groups.ts` API with coalescing logic.

**Key Methods:**
- `getGroupsByCategory()`: Fetches groups with request coalescing
- `getGroup()`: Fetches single group with items with coalescing
- `invalidateCache()`: Manually clear cache
- `getStats()`: Get coalescing performance statistics
- `getEfficiency()`: Get efficiency metrics

### 3. BacklogProvider Integration

The `BacklogProvider` initializes and manages the coalescer instance.

**Features:**
- Singleton coalescer instance for the application
- Periodic stats logging (every 30 seconds)
- Cache invalidation on network status changes
- Exposes coalescer to `window.__backlogCoalescer` for debugging

### 4. CoalescerMonitor Component (`CoalescerMonitor.tsx`)

Development component for real-time monitoring.

**Usage:**
```tsx
import { CoalescerMonitor } from '@/components/dev/CoalescerMonitor';

export default function Layout() {
  return (
    <>
      {/* Your app content */}
      {process.env.NODE_ENV === 'development' && <CoalescerMonitor />}
    </>
  );
}
```

## Performance Benefits

### Before Coalescing

```
User switches to "Sports" category → 5 UI components
  ↓
  ├─ Component 1: fetch('/api/top/groups?category=sports')
  ├─ Component 2: fetch('/api/top/groups?category=sports')
  ├─ Component 3: fetch('/api/top/groups?category=sports')
  ├─ Component 4: fetch('/api/top/groups?category=sports')
  └─ Component 5: fetch('/api/top/groups?category=sports')

Result: 5 network requests, 5x database queries, slower response
```

### After Coalescing

```
User switches to "Sports" category → 5 UI components
  ↓
  ├─ Component 1: coalesce(key='sports', fetcher) → subscribes
  ├─ Component 2: coalesce(key='sports', fetcher) → subscribes
  ├─ Component 3: coalesce(key='sports', fetcher) → subscribes
  ├─ Component 4: coalesce(key='sports', fetcher) → subscribes
  └─ Component 5: coalesce(key='sports', fetcher) → subscribes

Wait 50ms (debounce) → Execute ONE fetch → Broadcast to all 5 subscribers

Result: 1 network request, 1x database query, faster response
```

### Metrics

**Expected Performance Improvements:**
- **Network Traffic**: 60-80% reduction in duplicate API calls
- **API Load**: 60-80% fewer database queries
- **Response Time**: 30-50% faster due to cache hits
- **DND Responsiveness**: Smoother interactions, no request queuing

## Usage Examples

### In Store Actions

```typescript
// Before
const { itemGroupsApi } = await import('@/lib/api/item-groups');
const groups = await itemGroupsApi.getGroupsByCategory(category);

// After
const { coalescedItemGroupsApi } = await import('@/lib/api/coalesced-item-groups');
const groups = await coalescedItemGroupsApi.getGroupsByCategory(category);
```

### Manual Cache Invalidation

```typescript
import { coalescedItemGroupsApi } from '@/lib/api/coalesced-item-groups';

// Invalidate all cache
coalescedItemGroupsApi.invalidateCache();

// Invalidate specific category (in future)
coalescedItemGroupsApi.invalidateCache('sports');
```

### Access Statistics

```typescript
// From console (global debugging)
window.__backlogCoalescer.getStats()
window.__backlogCoalescer.getEfficiency()

// Programmatically
const stats = await useBacklogStore.getState().getCoalescerStats();
console.log(stats);
```

## Configuration

### Debounce Window

The debounce window controls how long to wait before executing a batched request:

- **50ms (default)**: Good balance between batching and responsiveness
- **0ms**: No debounce, immediate execution (less coalescing)
- **100ms**: More aggressive batching (may feel sluggish)

### Cache TTL

Cache time-to-live controls how long results are cached:

- **5000ms (default)**: Good for reducing redundant fetches during active use
- **1000ms**: Shorter cache, more up-to-date data
- **10000ms**: Longer cache, fewer fetches but potentially stale data

## Debugging

### Enable Detailed Logging

Coalescing is logged by default. Look for these log patterns:

```
🔄 BacklogCoalescer: 🚀 Starting new request for key: category-sports
🔄 BacklogCoalescer: 🔄 Coalescing request for key: category-sports (3 subscribers)
🔄 BacklogCoalescer: ✅ Request completed for key: category-sports in 245.12ms (3 subscribers)
🔄 BacklogCoalescer: 🎯 Cache hit for key: category-sports
```

### Access Global Coalescer Instance

```javascript
// In browser console
__backlogCoalescer.getStats()
// {
//   totalRequests: 45,
//   coalescedRequests: 28,
//   cacheHits: 12,
//   activeBatches: 1,
//   averageSubscribers: 2.3
// }

__backlogCoalescer.getEfficiency()
// {
//   coalescingRate: 62.2,  // % of requests that were coalesced
//   cacheHitRate: 26.7,     // % of requests served from cache
//   networkSavings: 40      // Total network requests avoided
// }
```

### Visual Monitoring

Use the `CoalescerMonitor` component to see real-time stats in the UI.

## Best Practices

1. **Always use coalesced API** for backlog operations
2. **Invalidate cache** when data changes (mutations)
3. **Monitor statistics** in development to verify effectiveness
4. **Adjust debounce** if UI feels sluggish (lower) or too many duplicates (higher)
5. **Use cache wisely** - short TTL for frequently changing data

## Future Enhancements

- [ ] Granular cache invalidation by category
- [ ] Request prioritization for user-initiated actions
- [ ] Adaptive debounce based on network speed
- [ ] Persistent cache across sessions
- [ ] Background refresh for stale data
- [ ] WebSocket integration for real-time updates
