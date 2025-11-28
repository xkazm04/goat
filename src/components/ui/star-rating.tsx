"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Default values
const DEFAULT_MAX_RATING = 5;
const DEFAULT_VALUE = 0;

// Percentage bounds for fill calculation
const MIN_FILL_PERCENTAGE = 0;
const MAX_FILL_PERCENTAGE = 100;

// SVG viewBox dimensions
const SVG_VIEWBOX = "0 0 24 24";
const SVG_STROKE_WIDTH = "2";

// Star polygon path
const STAR_POLYGON_POINTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

// Size class definitions
const SIZE_CLASSES = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
} as const;

export interface StarRatingProps {
  /** Current rating value (0-5) */
  value?: number;
  /** Maximum rating value (default: 5) */
  maxRating?: number;
  /** Enable interactive mode (allows clicking to rate) */
  interactive?: boolean;
  /** Callback when rating changes */
  onChange?: (rating: number) => void;
  /** Size of stars */
  size?: "sm" | "md" | "lg";
  /** Custom className */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Show numeric value next to stars */
  showValue?: boolean;
}

/**
 * Star Rating Component
 *
 * Displays a star rating with optional interactive mode for user input.
 * Supports half-star ratings for display purposes.
 *
 * @example
 * ```tsx
 * <StarRating value={3.5} />
 * <StarRating value={4} interactive onChange={(rating) => console.log(rating)} />
 * ```
 */
export function StarRating({
  value = DEFAULT_VALUE,
  maxRating = DEFAULT_MAX_RATING,
  interactive = false,
  onChange,
  size = "sm",
  className,
  testId,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (interactive && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (interactive) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  const displayRating = hoverRating ?? value;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      data-testid={testId || "star-rating"}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const fillPercentage = Math.min(Math.max((displayRating - i) * MAX_FILL_PERCENTAGE, MIN_FILL_PERCENTAGE), MAX_FILL_PERCENTAGE);

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "relative",
              SIZE_CLASSES[size],
              interactive && "cursor-pointer hover:scale-110 transition-transform",
              !interactive && "cursor-default"
            )}
            aria-label={`Rate ${starValue} out of ${maxRating}`}
            data-testid={`star-${starValue}`}
          >
            {/* Background (empty star) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox={SVG_VIEWBOX}
              fill="none"
              stroke="currentColor"
              className="absolute inset-0 text-gray-600"
              strokeWidth={SVG_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points={STAR_POLYGON_POINTS} />
            </svg>

            {/* Foreground (filled star) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox={SVG_VIEWBOX}
                fill="currentColor"
                className={cn(
                  "text-yellow-500",
                  interactive && hoverRating && "text-yellow-400"
                )}
              >
                <polygon points={STAR_POLYGON_POINTS} />
              </svg>
            </div>
          </button>
        );
      })}

      {showValue && value > DEFAULT_VALUE && (
        <span className="ml-1 text-xs text-gray-400">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
