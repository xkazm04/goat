# Collection Feature

Bottom drawer collection for browsing and selecting items - a redesign of the Backlog feature.

## Overview

The Collection feature provides a bottom drawer interface for item selection and management, following a tier list layout pattern:
- **Items on top** (in grid/list)
- **Collection at bottom** (drawer)

## Architecture

### Layout Structure

```
┌─────────────────────────────────────────────┐
│           Match Grid (Top Items)            │
│                                             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  Collection Drawer (Bottom)                 │
│  ┌───────────┬──────────────────────────┐  │
│  │  Groups   │  Items Panel             │  │
│  │  Selector │  ┌────────────────────┐  │  │
│  │  (Multi)  │  │ Group Name         │  │  │
│  │           │  ├────────────────────┤  │  │
│  │ ☑ Group A │  │ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢  │  │  │
│  │ ☑ Group B │  │                    │  │  │
│  │ ☐ Group C │  ├────────────────────┤  │  │
│  │           │  │ Another Group      │  │  │
│  │           │  ├────────────────────┤  │  │
│  └───────────┴──┴────────────────────┴──┘  │
└─────────────────────────────────────────────┘
```

## Components

### CollectionDrawer
Main container component that manages the drawer state.

**Features:**
- Bottom drawer with drag handle
- Resizable height with snap points
- ESC key to close
- Backdrop overlay

**Props:**
```tsx
interface CollectionDrawerProps {
  className?: string;
}
```

### CollectionGroupSelector
Left sidebar with multi-select group buttons.

**Features:**
- Multi-select checkboxes
- Select All / Deselect All
- Item count per group
- Compact button design

**Props:**
```tsx
interface CollectionGroupSelectorProps {
  groups: ItemGroup[];
  selectedGroupIds: Set<string>;
  onGroupToggle: (groupId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
}
```

### CollectionItemsPanel
Main panel showing items from selected groups.

**Features:**
- Grouped item display
- Visual dividers between groups
- Responsive grid layout
- Scroll indicators

**Props:**
```tsx
interface CollectionItemsPanelProps {
  groups: ItemGroup[];
  selectedGroupIds: Set<string>;
}
```

### CollectionItem
Individual item card with drag & drop.

**Features:**
- Drag & drop to grid
- Double-click to assign
- Image preview
- Matched state indication

**Props:**
```tsx
interface CollectionItemProps {
  item: BacklogItemNew;
  groupId: string;
}
```

### CollectionGroupDivider
Visual divider between groups.

**Features:**
- Group name and item count
- Category color accent
- Subtle animations
- Loading state support

**Props:**
```tsx
interface CollectionGroupDividerProps {
  groupName: string;
  itemCount: number;
  totalItemCount?: number;
  category?: string;
  subcategory?: string;
  isLoading?: boolean;
}
```

## Usage

```tsx
import { CollectionDrawer } from '@/app/features/Collection';

export default function MatchPage() {
  return (
    <div>
      {/* Match Grid */}
      <MatchGrid />

      {/* Collection Drawer */}
      <CollectionDrawer />
    </div>
  );
}
```

## Design Principles

Following **compact-ui-design.md** guidelines:

1. **Space Efficiency**: Compact layouts with smart spacing
2. **Visual Hierarchy**: Size variations, color contrast, layered depth
3. **Consistent Typography**: text-xs for most content
4. **Icon Sizing**: w-3.5 h-3.5 for standard icons
5. **Color Palette**: Cyan/blue accents, gray backgrounds
6. **Animations**: Framer Motion for all interactions
7. **Blueprint Background**: Grid patterns at 5% opacity

## State Management

Uses existing **backlog-store** (Zustand):
- Group loading and caching
- Item management
- Search and filtering

## Drag & Drop

Integrates with **@dnd-kit/core**:
- Draggable items from collection
- Droppable grid slots
- Visual feedback during drag
- Matched state tracking

## Keyboard Shortcuts

- **ESC**: Close drawer
- **Double-click**: Assign item to grid

## Future Enhancements

1. Grid/List view toggle
2. Search within selected groups
3. Bulk actions (select multiple items)
4. Persistent drawer height
5. Group reordering
6. Item preview on hover
7. Keyboard navigation

## Migration from Backlog

The Collection feature is designed to eventually replace the Backlog sidebar. Key differences:

| Aspect | Backlog (Sidebar) | Collection (Drawer) |
|--------|-------------------|---------------------|
| Position | Right sidebar | Bottom drawer |
| Layout | Vertical list | Two-part (selector + grid) |
| Group Selection | Expand/collapse | Multi-select checkboxes |
| Item Display | Vertical list | Responsive grid |
| Space Usage | Fixed width | Resizable height |

## Dependencies

- React 19+
- Framer Motion 12+
- @dnd-kit/core 6+
- Zustand 5+
- Lucide React

## File Structure

```
Collection/
├── CollectionDrawer.tsx          # Main drawer container
├── CollectionGroupSelector.tsx   # Left sidebar
├── CollectionItemsPanel.tsx      # Right panel
├── CollectionItem.tsx             # Item card
├── CollectionGroupDivider.tsx    # Group divider
├── types.ts                       # TypeScript types
├── index.tsx                      # Exports
└── README.md                      # Documentation
```
