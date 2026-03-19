'use client';

import React, { createContext, useContext } from 'react';

import { GridItemType } from '@/types/match';

import { usePositionHistory, type PositionChange } from '../hooks/usePositionHistory';

type PositionChanges = Record<string, PositionChange>;

const PositionHistoryContext = createContext<PositionChanges>({});

/**
 * Provides position change data (Billboard-style movement indicators)
 * to all drop zones in the grid.
 */
export function PositionHistoryProvider({
  listId,
  gridItems,
  children,
}: {
  listId: string | null;
  gridItems: GridItemType[];
  children: React.ReactNode;
}) {
  const changes = usePositionHistory(listId, gridItems);

  return (
    <PositionHistoryContext.Provider value={changes}>
      {children}
    </PositionHistoryContext.Provider>
  );
}

/**
 * Get the position change for a specific backlog item.
 */
export function usePositionChange(backlogItemId: string | undefined): PositionChange | null {
  const changes = useContext(PositionHistoryContext);
  if (!backlogItemId) return null;
  return changes[backlogItemId] ?? null;
}
