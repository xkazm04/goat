import { useCallback } from "react";
import { useComposition } from "@/hooks/use-composition";
import type { ShowcaseCardData } from "../types";

/**
 * Custom hook that provides a memoized callback for handling showcase card clicks.
 * This encapsulates the common pattern of mapping ShowcaseCardData to openWithPreset params.
 *
 * Used by FloatingShowcase and LandingMain (ShowcaseUniverse) to maintain consistent
 * behavior when users click on showcase cards to open the composition modal.
 *
 * @returns A memoized callback that accepts ShowcaseCardData and opens the composition modal
 *
 * @example
 * const handleCardClick = useCardClickHandler();
 * <ShowcaseCard onCardClick={handleCardClick} />
 */
export function useCardClickHandler() {
  const { openWithPreset } = useComposition();

  const handleCardClick = useCallback(
    (cardData: ShowcaseCardData) => {
      openWithPreset({
        category: cardData.category,
        subcategory: cardData.subcategory,
        timePeriod: cardData.timePeriod,
        hierarchy: cardData.hierarchy,
        title: cardData.title,
        color: cardData.color,
      });
    },
    [openWithPreset]
  );

  return handleCardClick;
}
