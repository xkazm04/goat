/**
 * Collection Feature - Main Export
 *
 * Provides a fixed bottom panel for browsing and selecting items
 * with category filtering and drag-and-drop functionality
 */

// Components
export { CollectionPanel } from './components/CollectionPanel';
export { ConfigurableCollectionItem, MATCH_VIEW_CONFIG, COLLECTION_VIEW_CONFIG } from './components/ConfigurableCollectionItem';
export type { CollectionItemConfig, ConfigurableCollectionItemProps } from './components/ConfigurableCollectionItem';
export { CollectionToolbar } from './components/CollectionToolbar';
export { CollectionStats } from './components/CollectionStats';
export { AddItemModal } from './components/AddItemModal';
export { LazyLoadTrigger } from './components/LazyLoadTrigger';
export { CollectionErrorBoundary, withCollectionErrorBoundary } from './components/CollectionErrorBoundary';

// Item Inspector components
export { ItemInspector } from './components/ItemInspector';
export type { ItemInspectorProps } from './components/ItemInspector';
export { ItemInspectorProvider } from './components/ItemInspectorProvider';
export { MetadataGrid } from './components/MetadataGrid';
export type { MetadataGridProps } from './components/MetadataGrid';
export { RankingDistribution } from './components/RankingDistribution';
export type { RankingDistributionProps, RankingStats } from './components/RankingDistribution';

// Types
export type { CollectionItem as CollectionItemType, CollectionGroup, CollectionStats as CollectionStatsType, CollectionPaginationState, CollectionMutationHelpers } from './types';

// Hooks
export { useCollection } from './hooks/useCollection';
export type { UseCollectionOptions, UseCollectionResult } from './hooks/useCollection';
export { useCollectionLazyLoad } from './hooks/useCollectionLazyLoad';
export type { UseCollectionLazyLoadOptions, UseCollectionLazyLoadResult } from './hooks/useCollectionLazyLoad';
export { useIntersectionObserver } from './hooks/useIntersectionObserver';
export type { UseIntersectionObserverOptions, UseIntersectionObserverResult } from './hooks/useIntersectionObserver';
// Derived state hook for Collection-Grid relationship
export { useVisibleCollectionItems, usePlacedItemIds, getPlacedItemIdsFromGrid } from './hooks/useVisibleCollectionItems';
export type { UseVisibleCollectionItemsOptions, UseVisibleCollectionItemsResult, PlacementStats } from './hooks/useVisibleCollectionItems';

// Utilities
export { backlogGroupsToCollectionGroups, backlogGroupToCollectionGroup, backlogItemToCollectionItem } from './utils/transformers';
export { useEasterEggSpotlight, isEasterEggKeyword, EASTER_EGG_KEYWORDS, SPOTLIGHT_DURATION } from './utils/easterEgg';
export type { SpotlightableItem, UseEasterEggSpotlightResult, EasterEggKeyword } from './utils/easterEgg';

// Configuration
export { LAZY_LOAD_CONFIG, shouldUseVirtualization, shouldUseLazyLoading } from './constants/lazyLoadConfig';

// Context exports
export { CollectionFiltersProvider, useCollectionFiltersContext, useCollectionFiltersContextOptional } from './context/CollectionFiltersContext';
export type { CollectionFiltersContextValue, CollectionFiltersProviderProps } from './context/CollectionFiltersContext';

// Filter Integration components
export {
  CollectionFilterIntegration,
  CollectionQuickFilters,
  CollectionFilterBadge,
  CollectionSmartSuggestions,
} from './components/CollectionFilterIntegration';

