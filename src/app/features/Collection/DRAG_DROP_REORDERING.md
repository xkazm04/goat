# Drag-and-Drop Reordering for CollectionPanel

## Overview

The CollectionPanel now supports drag-and-drop reordering of items within the collection. This feature allows users to manually organize their items by dragging them into different positions, with smooth animations and visual feedback.

## Features

- ✨ **Smooth drag-and-drop**: Uses @dnd-kit/sortable for fluid, animated reordering
- 🎨 **Visual feedback**: Items show opacity, rotation, and scale effects during drag
- 🎯 **Drag overlay**: Rotated preview of the dragged item follows cursor
- ⌨️ **Keyboard support**: Full keyboard accessibility for reordering
- 💾 **Optional persistence**: Callback for saving the new order
- 🔄 **State management**: Local state with optional parent synchronization
- 🎭 **Consistent UX**: Matches the existing MatchGrid drag-and-drop patterns

## Usage

### Basic Example

```tsx
import { CollectionPanel } from '@/app/features/Collection/components/CollectionPanel';

function MyComponent() {
  const handleOrderChange = (items) => {
    console.log('New order:', items);
    // Save to backend, update state, etc.
  };

  return (
    <CollectionPanel
      category="movies"
      enableReordering={true}
      onOrderChange={handleOrderChange}
    />
  );
}
```

### Props

#### `enableReordering` (boolean, optional)
- **Default**: `false`
- **Description**: Enables drag-and-drop reordering functionality
- When `true`, items become sortable and can be reordered via drag-and-drop

#### `onOrderChange` (function, optional)
- **Type**: `(items: CollectionItem[]) => void`
- **Description**: Callback invoked whenever the order changes
- Receives the new ordered array of items
- Use this to persist the order to a database or update parent state

### Advanced Example with Persistence

```tsx
import { CollectionPanel } from '@/app/features/Collection/components/CollectionPanel';
import { useUpdateItemOrder } from '@/hooks/useUpdateItemOrder';

function MyCollectionView() {
  const { mutate: updateOrder } = useUpdateItemOrder();

  const handleOrderChange = (items) => {
    // Extract just the IDs in the new order
    const orderIds = items.map(item => item.id);

    // Persist to backend
    updateOrder({
      collectionId: 'my-collection',
      itemIds: orderIds
    });
  };

  return (
    <CollectionPanel
      category="games"
      subcategory="retro"
      enableReordering={true}
      onOrderChange={handleOrderChange}
    />
  );
}
```

## Implementation Details

### Architecture

The drag-and-drop reordering feature consists of three main components:

1. **`useCollectionReorder` hook** (`hooks/useCollectionReorder.ts`)
   - Manages local state for item order
   - Handles drag events (start, end, cancel)
   - Configures sensors (pointer, keyboard)
   - Provides reset functionality

2. **`SortableCollectionItem` component** (`components/SortableCollectionItem.tsx`)
   - Wraps items with `useSortable` from @dnd-kit
   - Applies transform and transition styles
   - Shows visual feedback during drag

3. **`CollectionPanel` updates** (`components/CollectionPanel.tsx`)
   - Conditionally wraps content in `DndContext`
   - Renders `SortableCollectionItem` when reordering is enabled
   - Shows drag overlay with rotated item preview

### Drag Behavior

- **Activation**: Requires 8px of movement to start drag (prevents accidental drags)
- **Collision**: Uses `closestCenter` algorithm for determining drop position
- **Animation**: Smooth transitions with cubic-bezier easing
- **Overlay**: Shows a rotated, scaled preview of the dragged item

### Visual Effects

During drag:
- **Dragged item**: 50% opacity, maintains position
- **Drag overlay**: 80% opacity, 3° rotation, 105% scale
- **Drop animation**: 200ms duration with spring easing

### Keyboard Navigation

The feature supports full keyboard accessibility:
- **Arrow keys**: Navigate between items
- **Space/Enter**: Pick up/drop item
- **Escape**: Cancel drag operation

## Integration with Existing Features

### View Modes

Reordering works in both **grid** and **list** view modes:
- **Grid mode**: Items arranged in masonry grid, reorder by dragging
- **List mode**: Items in vertical list, reorder by dragging

### Virtualization

- Reordering is **disabled** for virtualized collections (large collections)
- Only enabled for small-to-medium collections rendered without virtualization
- This ensures smooth performance and accurate positioning

### Lazy Loading

- Reordering works with lazy-loaded collections
- Only visible items can be reordered
- Loading more items preserves existing order

## Performance Considerations

- Reordering uses local state for instant feedback
- Optional callback for backend persistence (fire-and-forget)
- Drag overlay is rendered on top layer (z-index) for smooth animation
- Transform-based animations use GPU acceleration

## Styling and Theming

The drag-and-drop UI matches the app's glassmorphism design:
- Subtle opacity changes during drag
- Smooth cubic-bezier transitions
- Rotated overlay for playful feedback
- Consistent with MatchGrid drag experience

## Testing

The feature includes data-testid attributes for automated testing:

```tsx
// Sortable item
data-testid="sortable-collection-item-{item.id}"

// Collection item (in drag overlay)
data-testid="collection-item-{item.id}"
```

## Browser Support

Works on all modern browsers with:
- Pointer Events API (mouse, touch, pen)
- CSS Transforms
- CSS Transitions

Gracefully degrades if drag-and-drop is not supported.

## Example Use Cases

1. **Priority reordering**: Let users set item priority by position
2. **Custom sorting**: User-defined sort order saved to profile
3. **Playlist management**: Reorder songs in a playlist
4. **Task organization**: Reorder tasks by preference
5. **Photo gallery**: Arrange photos in desired order

## Migration Guide

To add reordering to an existing CollectionPanel:

```tsx
// Before
<CollectionPanel category="movies" />

// After
<CollectionPanel
  category="movies"
  enableReordering={true}
  onOrderChange={(items) => {
    // Handle order change
  }}
/>
```

That's it! No other changes required.

## Troubleshooting

### Items not draggable
- Ensure `enableReordering={true}` is set
- Check that items are not in virtualized mode
- Verify items have unique `id` fields

### Order not persisting
- Implement `onOrderChange` callback
- Ensure callback saves to backend/state
- Check for console errors during save

### Performance issues
- Consider disabling reordering for large collections (>500 items)
- Use virtualization instead for large lists
- Ensure smooth animations by checking GPU usage

## Future Enhancements

Potential improvements for future iterations:
- Multi-select and bulk reorder
- Drag-to-reorder between different groups
- Undo/redo for order changes
- Reorder animation hints (ghost positions)
- Touch gesture improvements for mobile
