"use client";

import { HiddenGemIcon } from "@/components/icons/MicroIllustrations";

interface SpotlightTooltipProps {
  visible: boolean;
}

/**
 * Shared spotlight tooltip component for easter egg items
 *
 * Shows a colorful tooltip when hovering over a spotlighted item
 * that was found via the easter egg search feature.
 */
export function SpotlightTooltip({ visible }: SpotlightTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-linear-to-r from-brand to-purple-500 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-20 flex items-center gap-1.5"
      data-testid="spotlight-tooltip"
      role="tooltip"
    >
      <HiddenGemIcon size={14} />
      You found the hidden tag!
    </div>
  );
}
