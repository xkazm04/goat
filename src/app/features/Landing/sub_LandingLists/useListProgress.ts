import { useMemo } from "react";
import { useSessionStore } from "@/stores/session-store";

interface ListProgress {
  filled: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  hasSession: boolean;
}

/**
 * Hook to get ranking progress for a specific list.
 * Reads from the session store to determine how many positions are filled.
 *
 * @param listId - The ID of the list
 * @param listSize - The total size of the list (fallback if no session exists)
 * @returns Progress data including filled count, total, percentage, and completion status
 */
export function useListProgress(listId: string, listSize: number): ListProgress {
  const listSessions = useSessionStore((state) => state.listSessions);

  return useMemo(() => {
    const session = listSessions[listId];

    if (!session) {
      return {
        filled: 0,
        total: listSize,
        percentage: 0,
        isComplete: false,
        hasSession: false,
      };
    }

    // Count matched items in the grid
    const filledCount = session.gridItems.filter((item) => item.matched).length;
    const total = session.listSize || listSize;
    const percentage = total > 0 ? Math.round((filledCount / total) * 100) : 0;

    return {
      filled: filledCount,
      total,
      percentage,
      isComplete: percentage >= 100,
      hasSession: true,
    };
  }, [listId, listSize, listSessions]);
}
