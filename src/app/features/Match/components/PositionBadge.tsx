"use client";

import { memo } from "react";

export type PositionTier = "podium" | "top10" | "remaining";

/**
 * Get the tier for a position (0-indexed)
 */
export function getPositionTier(position: number): PositionTier {
  if (position < 3) return "podium";
  if (position < 10) return "top10";
  return "remaining";
}

/**
 * Get tier-specific styling for position badges
 */
export function getPositionBadgeStyles(position: number): {
  containerClassName: string;
  textClassName: string;
  style?: React.CSSProperties;
} {
  const tier = getPositionTier(position);

  switch (tier) {
    case "podium": {
      // Gold, Silver, Bronze gradient badges with shadow
      const podiumStyles: Record<number, { gradient: string; shadow: string; textShadow: string }> = {
        0: {
          gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)",
          shadow: "0 2px 8px rgba(255, 215, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0 8px rgba(255, 215, 0, 0.6)",
        },
        1: {
          gradient: "linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #E8E8E8 100%)",
          shadow: "0 2px 8px rgba(192, 192, 192, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0 6px rgba(192, 192, 192, 0.5)",
        },
        2: {
          gradient: "linear-gradient(135deg, #E8A060 0%, #CD7F32 50%, #E8A060 100%)",
          shadow: "0 2px 8px rgba(205, 127, 50, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 0 6px rgba(205, 127, 50, 0.5)",
        },
      };

      const positionStyle = podiumStyles[position];
      return {
        containerClassName:
          "px-2 py-0.5 rounded-md font-bold text-gray-900",
        textClassName: "text-xs",
        style: {
          background: positionStyle.gradient,
          boxShadow: positionStyle.shadow,
          textShadow: positionStyle.textShadow,
        },
      };
    }

    case "top10": {
      // Semi-transparent pill with blue accent
      return {
        containerClassName:
          "px-1.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 font-semibold text-blue-400",
        textClassName: "text-xs",
        style: undefined,
      };
    }

    case "remaining":
    default: {
      // Minimal monospace number
      return {
        containerClassName: "font-mono text-gray-500",
        textClassName: "text-xs",
        style: undefined,
      };
    }
  }
}

interface PositionBadgeProps {
  position: number;
  className?: string;
}

/**
 * PositionBadge - Tier-based visual hierarchy for position numbers
 *
 * - Top 3: Gold/Silver/Bronze gradient badges with shadow and text-shadow
 * - Positions 4-10: Semi-transparent pill with blue accent
 * - 11+: Minimal monospace number
 */
export const PositionBadge = memo(function PositionBadge({
  position,
  className = "",
}: PositionBadgeProps) {
  const displayPosition = position + 1; // Convert 0-indexed to 1-indexed
  const { containerClassName, textClassName, style } = getPositionBadgeStyles(position);

  return (
    <div
      className={`${containerClassName} ${className}`}
      style={style}
      data-testid={`position-badge-${displayPosition}`}
    >
      <span className={textClassName}>#{displayPosition}</span>
    </div>
  );
});
