import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useListStore } from "@/stores/use-list-store";
import { TopList } from "@/types/top-lists";

/**
 * usePlayList Hook
 *
 * Consolidates the handlePlayList logic used across FeaturedListsSection and UserListsSection.
 * Handles navigation to the match interface with proper list configuration setup.
 *
 * For regular lists (type !== 'award'):
 * - Sets current list in the store with all required properties
 * - Navigates to /match-test?list={id}
 *
 * For award lists:
 * - Navigates directly to /award?id={id}
 *
 * @returns Object containing the handlePlayList callback
 */
export function usePlayList() {
  const router = useRouter();
  const { setCurrentList } = useListStore();

  const handlePlayList = useCallback(
    (list: TopList) => {
      // Handle award type differently - navigate to award page
      if (list.type === "award") {
        router.push(`/award?id=${list.id}`);
        return;
      }

      // Set current list in store for match page consumption
      setCurrentList({
        id: list.id,
        title: list.title,
        category: list.category,
        subcategory: list.subcategory,
        user_id: list.user_id || "",
        predefined: list.predefined,
        size: list.size,
        time_period: list.time_period,
        created_at: list.created_at,
      });

      // Navigate to match interface
      router.push(`/match-test?list=${list.id}`);
    },
    [router, setCurrentList]
  );

  return { handlePlayList };
}
