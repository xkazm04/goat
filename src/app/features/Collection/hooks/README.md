# Collection Hooks

This directory contains hooks for managing collection data, filters, and statistics.

## useCollection Hook

The **unified collection hook** that replaces `useCollectionFilters`, `useCollectionStats`, and ad-hoc fetch logic. It provides a single source of truth for collection data with built-in:

- Server-side pagination
- Memoized caching via React Query
- Optimistic mutations (add/edit/delete)
- Filter and search capabilities
- Statistics computation

### Basic Usage

```tsx
import { useCollection } from '@/app/features/Collection';

function MyComponent() {
  const collection = useCollection({
    category: 'movies',
    subcategory: 'action',
    pageSize: 50,
    enablePagination: true
  });

  return (
    <div>
      {collection.isLoading && <p>Loading...</p>}

      {collection.filteredItems.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}

      {/* Pagination controls */}
      <button onClick={collection.pagination.nextPage}>
        Next Page
      </button>
    </div>
  );
}
```

### Options

```typescript
interface UseCollectionOptions {
  category?: string;                  // Filter by category
  subcategory?: string;               // Filter by subcategory
  initialSearchTerm?: string;         // Initial search value
  initialSelectedGroupIds?: string[]; // Pre-selected group IDs
  sortBy?: 'name' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;                  // Items per page (default: 50)
  enablePagination?: boolean;         // Enable pagination (default: false)
  enableInfiniteScroll?: boolean;     // Enable infinite scroll (default: false)
  staleTime?: number;                 // Cache stale time in ms (default: 5 min)
  cacheTime?: number;                 // Cache garbage collection time (default: 10 min)
}
```

### Return Value

The hook returns a comprehensive object with:

#### Data
- `groups: CollectionGroup[]` - All groups
- `items: CollectionItem[]` - All items (paginated or infinite)
- `filteredItems: CollectionItem[]` - Items filtered by search and selected groups
- `selectedGroups: CollectionGroup[]` - Currently selected groups
- `stats: CollectionStats` - Computed statistics

#### Loading States
- `isLoading: boolean` - Initial loading state
- `isError: boolean` - Error state
- `error: Error | null` - Error object
- `isFetching: boolean` - Background refetch state

#### Pagination
```typescript
pagination: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}
```

#### Infinite Scroll (when enabled)
```typescript
infiniteScroll?: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}
```

#### Filter State & Actions
```typescript
filter: {
  searchTerm: string;
  selectedGroupIds: Set<string>;
  sortBy: 'name' | 'date' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

setSearchTerm: (term: string) => void;
toggleGroup: (groupId: string) => void;
selectAllGroups: () => void;
deselectAllGroups: () => void;
setSortBy: (sortBy) => void;
setSortOrder: (order) => void;
```

#### Mutations (with Optimistic Updates)
```typescript
mutations: {
  addItem: {
    mutate: (item: CollectionItemCreate) => void;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
  updateItem: {
    mutate: (item: CollectionItemUpdate) => void;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
  deleteItem: {
    mutate: (itemId: string) => void;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
}
```

#### Utility
- `refetch: () => void` - Manually refetch data
- `invalidateCache: () => void` - Invalidate all collection cache

### Examples

#### Example 1: Basic Collection with Search

```tsx
function BasicCollection() {
  const collection = useCollection({
    category: 'books'
  });

  return (
    <div>
      <input
        type="text"
        value={collection.filter.searchTerm}
        onChange={(e) => collection.setSearchTerm(e.target.value)}
        placeholder="Search books..."
      />

      <div>
        {collection.filteredItems.map(item => (
          <BookCard key={item.id} book={item} />
        ))}
      </div>

      <Stats stats={collection.stats} />
    </div>
  );
}
```

#### Example 2: Paginated Collection

```tsx
function PaginatedCollection() {
  const collection = useCollection({
    category: 'products',
    enablePagination: true,
    pageSize: 20
  });

  return (
    <div>
      {collection.filteredItems.map(item => (
        <ProductCard key={item.id} product={item} />
      ))}

      <PaginationControls
        page={collection.pagination.page}
        totalPages={collection.pagination.totalPages}
        onNext={collection.pagination.nextPage}
        onPrev={collection.pagination.prevPage}
        onGoTo={collection.pagination.goToPage}
      />
    </div>
  );
}
```

#### Example 3: Infinite Scroll Collection

```tsx
function InfiniteScrollCollection() {
  const collection = useCollection({
    category: 'posts',
    enableInfiniteScroll: true,
    pageSize: 30
  });

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && collection.infiniteScroll?.hasNextPage) {
          collection.infiniteScroll.fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [collection.infiniteScroll]);

  return (
    <div>
      {collection.filteredItems.map(item => (
        <PostCard key={item.id} post={item} />
      ))}

      <div ref={loadMoreRef}>
        {collection.infiniteScroll?.isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
```

#### Example 4: Optimistic Mutations

```tsx
function CollectionWithMutations() {
  const collection = useCollection({
    category: 'tasks'
  });

  const handleAddTask = () => {
    collection.mutations.addItem.mutate({
      title: 'New Task',
      description: 'Task description',
      category: 'tasks'
    });
  };

  const handleDeleteTask = (taskId: string) => {
    collection.mutations.deleteItem.mutate(taskId);
  };

  const handleUpdateTask = (task: CollectionItem) => {
    collection.mutations.updateItem.mutate({
      id: task.id,
      title: 'Updated Title'
    });
  };

  return (
    <div>
      <button onClick={handleAddTask}>Add Task</button>

      {collection.filteredItems.map(item => (
        <TaskCard
          key={item.id}
          task={item}
          onUpdate={() => handleUpdateTask(item)}
          onDelete={() => handleDeleteTask(item.id)}
        />
      ))}

      {collection.mutations.addItem.isLoading && <p>Adding...</p>}
    </div>
  );
}
```

#### Example 5: Group Selection & Filtering

```tsx
function GroupFilteredCollection() {
  const collection = useCollection({
    category: 'media'
  });

  return (
    <div>
      {/* Group selector */}
      <div>
        <button onClick={collection.selectAllGroups}>Select All</button>
        <button onClick={collection.deselectAllGroups}>Deselect All</button>

        {collection.groups.map(group => (
          <label key={group.id}>
            <input
              type="checkbox"
              checked={collection.filter.selectedGroupIds.has(group.id)}
              onChange={() => collection.toggleGroup(group.id)}
            />
            {group.name} ({group.count})
          </label>
        ))}
      </div>

      {/* Items */}
      <div>
        {collection.filteredItems.map(item => (
          <MediaCard key={item.id} media={item} />
        ))}
      </div>

      {/* Stats */}
      <p>
        Showing {collection.stats.selectedItems} of {collection.stats.totalItems} items
        from {collection.stats.visibleGroups} of {collection.stats.totalGroups} groups
      </p>
    </div>
  );
}
```

### Migration Guide

#### Before (separate hooks)

```tsx
const {
  filter,
  filteredGroups,
  selectedGroups,
  filteredItems,
  toggleGroup,
  selectAll,
  deselectAll,
  setSearchTerm
} = useCollectionFilters(groups);

const stats = useCollectionStats(groups, filter.selectedGroupIds);

// Separate API calls
const fetchItems = async () => {
  const data = await fetch('/api/items');
  // ...
};
```

#### After (unified hook)

```tsx
const collection = useCollection({
  category: 'your-category'
});

// All data, filters, stats, and mutations in one place!
// collection.filteredItems
// collection.stats
// collection.toggleGroup()
// collection.setSearchTerm()
// collection.mutations.addItem.mutate()
```

## Legacy Hooks

### useCollectionFilters

**DEPRECATED**: Use `useCollection` instead for new code.

Manages collection filters and selections. Still maintained for backward compatibility.

### useCollectionStats

**DEPRECATED**: Use `useCollection` instead for new code.

Calculates collection statistics. Still maintained for backward compatibility.

## Query Keys & API

The hook uses centralized query keys from `@/lib/query-keys/collection.ts` and API methods from `@/lib/api/collection.ts` for proper cache management and data fetching.
