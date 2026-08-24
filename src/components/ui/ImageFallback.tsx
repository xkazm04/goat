"use client";

import { cn } from "@/lib/utils";

/**
 * Category-aware gradient palettes for image fallbacks.
 * Maps category strings to warm/cool tone pairs.
 */
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string }> = {
  music: { from: "#92400e", to: "#78350f" },        // warm amber
  movies: { from: "#1e3a5f", to: "#1e293b" },       // cool blue
  films: { from: "#1e3a5f", to: "#1e293b" },        // cool blue alias
  games: { from: "#14532d", to: "#1a2e1a" },        // green
  gaming: { from: "#14532d", to: "#1a2e1a" },       // green alias
  sports: { from: "#7c2d12", to: "#431407" },        // burnt orange
  tv: { from: "#4c1d95", to: "#2e1065" },            // purple
  television: { from: "#4c1d95", to: "#2e1065" },    // purple alias
  books: { from: "#713f12", to: "#451a03" },         // warm brown
  anime: { from: "#831843", to: "#500724" },         // pink/magenta
  food: { from: "#854d0e", to: "#713f12" },          // warm gold
  people: { from: "#1e3a5f", to: "#312e81" },        // blue-indigo
  technology: { from: "#0f4c5c", to: "#134e4a" },    // teal
  default: { from: "#334155", to: "#1e293b" },       // slate (original)
};

function getGradientForCategory(category?: string | null): { from: string; to: string } {
  if (!category) return CATEGORY_GRADIENTS.default;
  const key = category.toLowerCase().trim();
  return CATEGORY_GRADIENTS[key] ?? CATEGORY_GRADIENTS.default;
}

function getInitials(title: string): string {
  const cleaned = title.trim();
  if (!cleaned) return "??";
  // Try to get first letters of first two words
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  // Single word: take first two chars
  return cleaned.slice(0, 2).toUpperCase();
}

export interface ImageFallbackProps {
  /** Item title to derive initials from */
  title: string;
  /** Category for gradient selection */
  category?: string | null;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const SIZE_CONFIG = {
  xs: { text: "text-2xs", container: "" },
  sm: { text: "text-xs", container: "" },
  md: { text: "text-sm", container: "" },
  lg: { text: "text-base", container: "" },
} as const;

/**
 * ImageFallback - Unified category-aware image placeholder
 *
 * Renders a gradient background with two-letter initials when no image is available.
 * Gradient color is derived from the item's category for visual consistency.
 */
export function ImageFallback({
  title,
  category,
  size = "md",
  className,
}: ImageFallbackProps) {
  const gradient = getGradientForCategory(category);
  const initials = getInitials(title);
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center rounded",
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
      }}
    >
      <span
        className={cn(
          sizeConfig.text,
          "font-semibold text-white/80 select-none"
        )}
        style={{
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

export default ImageFallback;
