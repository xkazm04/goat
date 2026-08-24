'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { GridItemType } from '@/types/match';

const STORAGE_KEY_PREFIX = 'goat-position-history-';

/**
 * Position snapshot: maps backlogItemId → position (0-indexed)
 */
type PositionSnapshot = Record<string, number>;

/**
 * Extracts a position snapshot from grid items.
 * Only includes occupied slots (matched items with a backlogItemId).
 */
function snapshotFromGrid(gridItems: GridItemType[]): PositionSnapshot {
  const snapshot: PositionSnapshot = {};
  for (const item of gridItems) {
    if (item.context.matched && item.item?.id) {
      snapshot[item.item.id] = item.position;
    }
  }
  return snapshot;
}

function getStorageKey(listId: string): string {
  return `${STORAGE_KEY_PREFIX}${listId}`;
}

function loadSnapshot(listId: string): PositionSnapshot | null {
  try {
    const raw = localStorage.getItem(getStorageKey(listId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSnapshot(listId: string, snapshot: PositionSnapshot): void {
  try {
    localStorage.setItem(getStorageKey(listId), JSON.stringify(snapshot));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export interface PositionChange {
  /** Positive = moved up (better rank), negative = moved down */
  delta: number;
  /** Previous position (0-indexed), null if new entry */
  previousPosition: number | null;
}

/**
 * Hook that tracks position changes between sessions.
 *
 * On first render with grid items, it loads the previous snapshot from localStorage,
 * computes deltas, and saves the current state as the new snapshot.
 * The snapshot is only updated once per session load (not on every drag).
 */
export function usePositionHistory(
  listId: string | null,
  gridItems: GridItemType[]
): Record<string, PositionChange> {
  const [changes, setChanges] = useState<Record<string, PositionChange>>({});
  const snapshotTakenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!listId) return;

    // Only snapshot once per listId per mount
    if (snapshotTakenRef.current === listId) return;

    // Need at least one occupied slot to consider this a valid grid
    const hasOccupied = gridItems.some((item) => item.context.matched && item.item?.id);
    if (!hasOccupied) return;

    snapshotTakenRef.current = listId;

    const previousSnapshot = loadSnapshot(listId);
    const currentSnapshot = snapshotFromGrid(gridItems);

    if (previousSnapshot) {
      const newChanges: Record<string, PositionChange> = {};

      for (const [backlogItemId, currentPos] of Object.entries(currentSnapshot)) {
        if (backlogItemId in previousSnapshot) {
          const prevPos = previousSnapshot[backlogItemId];
          const delta = prevPos - currentPos; // positive = moved up (lower index = better)
          if (delta !== 0) {
            newChanges[backlogItemId] = { delta, previousPosition: prevPos };
          }
        } else {
          // New entry — item wasn't in grid before
          newChanges[backlogItemId] = { delta: 0, previousPosition: null };
        }
      }

      setChanges(newChanges);
    }

    // Save current as new snapshot for next session
    saveSnapshot(listId, currentSnapshot);
  }, [listId, gridItems]);

  /**
   * Call this to update the stored snapshot after the user finishes editing.
   * This way, next session load will compare against the final state.
   */
  const commitSnapshot = useCallback(() => {
    if (!listId) return;
    const currentSnapshot = snapshotFromGrid(gridItems);
    saveSnapshot(listId, currentSnapshot);
  }, [listId, gridItems]);

  return changes;
}

/**
 * Get the position change for a specific item by its backlogItemId.
 */
export function getPositionChangeForItem(
  changes: Record<string, PositionChange>,
  backlogItemId: string | undefined
): PositionChange | null {
  if (!backlogItemId) return null;
  return changes[backlogItemId] ?? null;
}
