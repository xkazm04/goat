/**
 * Collection Feature - Main Export
 * 
 * Provides a fixed bottom panel for browsing and selecting items
 * with category filtering and drag-and-drop functionality
 */

export { CollectionPanel } from './components/CollectionPanel';
export { CollectionItem } from './components/CollectionItem';
export { CategoryBar } from './components/CategoryBar';
export { CollectionHeader } from './components/CollectionHeader';
export { CollectionSearch } from './components/CollectionSearch';
export { CollectionStats } from './components/CollectionStats';
export { AddItemModal } from './components/AddItemModal';

export type { CollectionItem as CollectionItemType, CollectionGroup } from './types';
export { useCollectionFilters } from './hooks/useCollectionFilters';
export { useCollectionStats } from './hooks/useCollectionStats';
export { backlogGroupsToCollectionGroups, backlogGroupToCollectionGroup, backlogItemToCollectionItem } from './utils/transformers';

