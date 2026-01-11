# Collection Filters Context

This directory contains the React Context implementation for sharing collection filter state across nested components without prop drilling.

## Overview

The `CollectionFiltersProvider` wraps collection components and provides filter state and actions through React Context. This enables deeply nested components to access filter state without explicitly passing props through every intermediate component.

## Architecture Decision

**Context Pattern vs Hook Pattern**

We chose the Context pattern over independent hooks for these reasons:

### Benefits
- **Eliminates Prop Drilling**: Nested components can access filters without explicit props
- **Centralized State**: Single source of truth for filter state
- **Cleaner Composition**: Enables flexible component composition patterns
- **Future Extensibility**: Easy to add new filter-aware components

### Trade-offs
- **Tighter Coupling**: Components become dependent on context
- **Testing Complexity**: Tests require provider wrapper
- **Less Explicit**: Dependencies are implicit rather than in props
- **Context Re-renders**: All consumers re-render when context changes (mitigated by memoization)

## Usage

### Basic Usage

```tsx
import { CollectionPanel } from '@/app/features/Collection';

// CollectionPanel automatically wraps children with provider
function MyPage() {
  return <CollectionPanel category="movies" />;
}
```

### Custom Nested Components

```tsx
import {
  CollectionFiltersProvider,
  useCollectionFiltersContext,
  useCollection
} from '@/app/features/Collection';

// Create a custom component that consumes filter context
function CustomFilterDisplay() {
  const { filter, stats } = useCollectionFiltersContext();

  return (
    <div>
      <p>Search: {filter.searchTerm}</p>
      <p>Items: {stats.selectedItems}/{stats.totalItems}</p>
    </div>
  );
}

// Wrap with provider manually if not using CollectionPanel
function CustomCollection() {
  const collection = useCollection({ category: 'movies' });

  const contextValue = {
    filter: collection.filter,
    groups: collection.groups,
    filteredItems: collection.filteredItems,
    selectedGroups: collection.selectedGroups,
    stats: collection.stats,
    setSearchTerm: collection.setSearchTerm,
    toggleGroup: collection.toggleGroup,
    selectAllGroups: collection.selectAllGroups,
    deselectAllGroups: collection.deselectAllGroups,
    setSortBy: collection.setSortBy,
    setSortOrder: collection.setSortOrder,
    isLoading: collection.isLoading,
    isError: collection.isError,
    error: collection.error
  };

  return (
    <CollectionFiltersProvider value={contextValue}>
      <CustomFilterDisplay />
      {/* Other components that need filter state */}
    </CollectionFiltersProvider>
  );
}
```

### Backward Compatibility

Components still support explicit props for backward compatibility:

```tsx
import { CollectionToolbar } from '@/app/features/Collection';

// Works with explicit props (outside provider)
function LegacyUsage() {
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  return (
    <CollectionToolbar
      groups={groups}
      selectedGroupIds={selectedGroups}
      onToggleGroup={toggleGroup}
      stats={{ totalItems: 0, selectedItems: 0, visibleGroups: 0, totalGroups: 0 }}
      isVisible={true}
      onToggleVisibility={() => {}}
      onSelectAll={() => {}}
      onDeselectAll={() => {}}
    />
  );
}
```

## API Reference

### CollectionFiltersProvider

Provider component that supplies filter state to nested components.

**Props:**
- `value: CollectionFiltersContextValue` - The context value to provide
- `children: ReactNode` - Child components

### useCollectionFiltersContext()

Hook to access collection filters context. **Must be used within a provider.**

**Returns:** `CollectionFiltersContextValue`

**Throws:** Error if used outside `CollectionFiltersProvider`

**Example:**
```tsx
function MyComponent() {
  const { filter, setSearchTerm } = useCollectionFiltersContext();
  return <input value={filter.searchTerm} onChange={e => setSearchTerm(e.target.value)} />;
}
```

### useCollectionFiltersContextOptional()

Optional hook that returns context or undefined if not in provider.

**Returns:** `CollectionFiltersContextValue | undefined`

**Example:**
```tsx
function MyComponent() {
  const context = useCollectionFiltersContextOptional();

  if (!context) {
    return <div>No filters available</div>;
  }

  return <div>{context.filter.searchTerm}</div>;
}
```

## Context Value Structure

```typescript
interface CollectionFiltersContextValue {
  // Filter state
  filter: {
    searchTerm: string;
    selectedGroupIds: Set<string>;
    sortBy: 'name' | 'date' | 'popularity';
    sortOrder: 'asc' | 'desc';
  };

  // Computed data
  groups: CollectionGroup[];
  filteredItems: CollectionItem[];
  selectedGroups: CollectionGroup[];
  stats: CollectionStats;

  // Filter actions
  setSearchTerm: (term: string) => void;
  toggleGroup: (groupId: string) => void;
  selectAllGroups: () => void;
  deselectAllGroups: () => void;
  setSortBy: (sortBy: 'name' | 'date' | 'popularity') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
```

## Testing

When testing components that use the context, wrap them with the provider:

```tsx
import { render } from '@testing-library/react';
import { CollectionFiltersProvider } from '@/app/features/Collection';

const mockContextValue = {
  filter: {
    searchTerm: '',
    selectedGroupIds: new Set(),
    sortBy: 'name',
    sortOrder: 'asc'
  },
  groups: [],
  filteredItems: [],
  selectedGroups: [],
  stats: { totalItems: 0, selectedItems: 0, visibleGroups: 0, totalGroups: 0 },
  setSearchTerm: jest.fn(),
  toggleGroup: jest.fn(),
  selectAllGroups: jest.fn(),
  deselectAllGroups: jest.fn(),
  setSortBy: jest.fn(),
  setSortOrder: jest.fn(),
  isLoading: false,
  isError: false,
  error: null
};

test('component uses context', () => {
  render(
    <CollectionFiltersProvider value={mockContextValue}>
      <MyComponent />
    </CollectionFiltersProvider>
  );
  // assertions...
});
```

## Performance Considerations

- **Memoization**: Context value should be memoized in provider to prevent unnecessary re-renders
- **Selective Consumption**: Consider splitting context if different parts change at different frequencies
- **Component Optimization**: Use `React.memo()` for components that don't need all context values

## Related Files

- `CollectionFiltersContext.tsx` - Context implementation
- `../components/CollectionPanel.tsx` - Main panel that provides context
- `../components/CollectionToolbar.tsx` - Consumer component with integrated category bar
- `../hooks/useCollection.ts` - Hook that generates context value
