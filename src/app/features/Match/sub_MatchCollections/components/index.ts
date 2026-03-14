// Collection Panel Components
export { CollectionHeader, type GroupViewMode } from './CollectionHeader';
export { CompactCollectionHeader } from './CompactCollectionHeader';
export { CollectionSidebar } from './CollectionSidebar';
export { VerticalCategoryNav } from './VerticalCategoryNav';
export { CollectionHorizontalBar } from './CollectionHorizontalBar';
export { VirtualizedCollectionGrid } from './VirtualizedCollectionGrid';
export { CollectionToggleButton } from './CollectionToggleButton';
export { CollectionSearch, highlightMatch, filterItemsByQuery } from './CollectionSearch';
export { EnhancedCollectionSearch } from './EnhancedCollectionSearch';
export { useGridColumns, useGridDimensions } from './useGridColumns';

// Re-export from sub_ItemBadges for backwards compatibility
export { QuickSelectBadge, QuickSelectStatusBar } from '../../sub_ItemBadges/QuickSelectBadge';
export { ItemStatsTooltip } from '../../sub_ItemBadges/ItemStatsTooltip';
