// Collection Panel Components
export { CompactCollectionHeader, type GroupViewMode } from './CompactCollectionHeader';
export { CollectionSidebar } from './CollectionSidebar';
export { CollectionHorizontalBar } from './CollectionHorizontalBar';
export { VirtualizedCollectionGrid } from './VirtualizedCollectionGrid';
export { CollectionToggleButton } from './CollectionToggleButton';
export { CollectionSearchInput } from './CollectionSearchInput';
export { highlightMatch, filterItemsByQuery } from '@/lib/utils/search';
export { useGridColumns, useGridDimensions } from './useGridColumns';

// Re-export from sub_ItemBadges for backwards compatibility
export { QuickSelectBadge, QuickSelectStatusBar } from '../../sub_ItemBadges/QuickSelectBadge';
export { ItemStatsTooltip } from '../../sub_ItemBadges/ItemStatsTooltip';
