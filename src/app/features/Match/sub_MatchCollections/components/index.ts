// Collection Panel Components
export { CollectionHeader, type GroupViewMode } from './CollectionHeader';
export { CollectionSidebar } from './CollectionSidebar';
export { CollectionHorizontalBar } from './CollectionHorizontalBar';
export { VirtualizedCollectionGrid } from './VirtualizedCollectionGrid';
export { CollectionToggleButton } from './CollectionToggleButton';
export { CollectionSearch, highlightMatch, filterItemsByQuery } from './CollectionSearch';
export { useGridColumns } from './useGridColumns';

// NOTE: getAvailableCount was removed as filtering is now centralized in SimpleCollectionPanel.
// Child components receive pre-filtered groups and pre-calculated counts from the parent.

// Consensus Discovery Components
export { ConsensusOverlay } from './ConsensusOverlay';
export { ConsensusToggle, ConsensusInfo } from './ConsensusToggle';

// Rank Badge Components
export { RankBadge } from './RankBadge';
export { AvgRankBadge } from './AvgRankBadge';

// Inventory Sort Control (Ranked Inventory paradigm)
export { InventorySortControl } from './InventorySortControl';

// Tier Indicator (visual tier classification)
export { TierIndicator } from './TierIndicator';

// Quick-Select Components (keyboard-driven item selection)
export { QuickSelectBadge, QuickSelectStatusBar } from './QuickSelectBadge';
