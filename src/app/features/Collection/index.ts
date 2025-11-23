/**
 * Collection Feature - Main Export
 *
 * Provides a fixed bottom panel for browsing and selecting items
 * with category filtering and drag-and-drop functionality
 */

// Components
export { CollectionPanel } from './components/CollectionPanel';
export { CollectionItem } from './components/CollectionItem';
export { CollectionToolbar } from './components/CollectionToolbar';
export { CategoryBar } from './components/CategoryBar';
export { CollectionSearch } from './components/CollectionSearch';
export { CollectionStats } from './components/CollectionStats';
export { AddItemModal } from './components/AddItemModal';
export { LazyLoadTrigger } from './components/LazyLoadTrigger';
export { VirtualizedCollectionList } from './components/VirtualizedCollectionList';
export { CollectionErrorBoundary, withCollectionErrorBoundary } from './components/CollectionErrorBoundary';

// Types
export type { CollectionItem as CollectionItemType, CollectionGroup, CollectionStats as CollectionStatsType, CollectionPaginationState, CollectionMutationHelpers } from './types';

// Hooks
export { useCollectionFilters } from './hooks/useCollectionFilters';
export { useCollectionStats } from './hooks/useCollectionStats';
export { useCollection } from './hooks/useCollection';
export type { UseCollectionOptions, UseCollectionResult } from './hooks/useCollection';
export { useCollectionLazyLoad } from './hooks/useCollectionLazyLoad';
export type { UseCollectionLazyLoadOptions, UseCollectionLazyLoadResult } from './hooks/useCollectionLazyLoad';
export { useIntersectionObserver } from './hooks/useIntersectionObserver';
export type { UseIntersectionObserverOptions, UseIntersectionObserverResult } from './hooks/useIntersectionObserver';

// Utilities
export { backlogGroupsToCollectionGroups, backlogGroupToCollectionGroup, backlogItemToCollectionItem } from './utils/transformers';

// Configuration
export { LAZY_LOAD_CONFIG, shouldUseVirtualization, shouldUseLazyLoading } from './constants/lazyLoadConfig';

// Context exports
export { CollectionFiltersProvider, useCollectionFiltersContext, useCollectionFiltersContextOptional } from './context/CollectionFiltersContext';
export type { CollectionFiltersContextValue, CollectionFiltersProviderProps } from './context/CollectionFiltersContext';

