// Collection Panel Components
export { CollectionHeader, type GroupViewMode } from './CollectionHeader';
export { CollectionSidebar } from './CollectionSidebar';
export { CollectionHorizontalBar } from './CollectionHorizontalBar';
export { VirtualizedCollectionGrid } from './VirtualizedCollectionGrid';
export { CollectionToggleButton } from './CollectionToggleButton';
export { CollectionSearch, highlightMatch, filterItemsByQuery } from './CollectionSearch';
export { useGridColumns, useGridDimensions } from './useGridColumns';

// NOTE: getAvailableCount was removed as filtering is now centralized in SimpleCollectionPanel.
// Child components receive pre-filtered groups and pre-calculated counts from the parent.

// Quick-Select Components (keyboard-driven item selection)
export { QuickSelectBadge, QuickSelectStatusBar } from './QuickSelectBadge';
