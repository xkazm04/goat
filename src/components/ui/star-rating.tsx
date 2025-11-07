"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
  value = 0,
  maxRating = 5,
  interactive = false,
  onChange,
  size = "sm",
  className,
  testId,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

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
        const fillPercentage = Math.min(Math.max((displayRating - i) * 100, 0), 100);

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
              sizeClasses[size],
              interactive && "cursor-pointer hover:scale-110 transition-transform",
              !interactive && "cursor-default"
            )}
            aria-label={`Rate ${starValue} out of ${maxRating}`}
            data-testid={`star-${starValue}`}
          >
            {/* Background (empty star) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="absolute inset-0 text-gray-600"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>

            {/* Foreground (filled star) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={cn(
                  "text-yellow-500",
                  interactive && hoverRating && "text-yellow-400"
                )}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </button>
        );
      })}

      {showValue && value > 0 && (
        <span className="ml-1 text-xs text-gray-400">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
