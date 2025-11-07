"use client";

/**
 * Collection Filters Context
 *
 * Provides filter state and helpers to nested components via React Context.
 * This eliminates prop drilling and enables nested panels to access filter state.
 *
 * Benefits:
 * - Simplifies state sharing across multiple components
 * - Enables nested components to consume filters without explicit prop passing
 * - Centralizes filter logic in one place
 *
 * Trade-offs:
 * - Tighter coupling between components and context
 * - Testing requires provider wrapper
 * - Can make component dependencies less explicit
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { CollectionFilter, CollectionGroup, CollectionItem, CollectionStats } from '../types';

export interface CollectionFiltersContextValue {
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

const CollectionFiltersContext = createContext<CollectionFiltersContextValue | undefined>(undefined);

export interface CollectionFiltersProviderProps {
  children: ReactNode;
  value: CollectionFiltersContextValue;
}

/**
 * Provider component that supplies filter state to all nested components
 *
 * Usage:
 * ```tsx
 * <CollectionFiltersProvider value={collectionHookResult}>
 *   <CollectionSearch />
 *   <CategoryBar />
 *   <CollectionItems />
 * </CollectionFiltersProvider>
 * ```
 */
export function CollectionFiltersProvider({ children, value }: CollectionFiltersProviderProps) {
  return (
    <CollectionFiltersContext.Provider value={value}>
      {children}
    </CollectionFiltersContext.Provider>
  );
}

/**
 * Hook to access collection filters context
 *
 * Must be used within a CollectionFiltersProvider.
 * Throws error if used outside provider.
 *
 * @returns Collection filters context value
 * @throws Error if used outside CollectionFiltersProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { filter, setSearchTerm } = useCollectionFiltersContext();
 *   return <input value={filter.searchTerm} onChange={e => setSearchTerm(e.target.value)} />;
 * }
 * ```
 */
export function useCollectionFiltersContext(): CollectionFiltersContextValue {
  const context = useContext(CollectionFiltersContext);

  if (context === undefined) {
    throw new Error(
      'useCollectionFiltersContext must be used within a CollectionFiltersProvider. ' +
      'Wrap your component tree with <CollectionFiltersProvider> to use this hook.'
    );
  }

  return context;
}

/**
 * Optional hook that returns context value or undefined if not in provider
 *
 * Use this when you want to optionally consume context without requiring it.
 *
 * @returns Collection filters context value or undefined
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const context = useCollectionFiltersContextOptional();
 *
 *   if (!context) {
 *     // Handle case where context is not available
 *     return <div>No filters available</div>;
 *   }
 *
 *   return <div>{context.filter.searchTerm}</div>;
 * }
 * ```
 */
export function useCollectionFiltersContextOptional(): CollectionFiltersContextValue | undefined {
  return useContext(CollectionFiltersContext);
}
