"use client";

import { Sparkles } from "lucide-react";

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
      className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg z-20 flex items-center gap-1.5"
      data-testid="spotlight-tooltip"
      role="tooltip"
    >
      <Sparkles className="w-3 h-3" />
      You found the hidden tag!
    </div>
  );
}
